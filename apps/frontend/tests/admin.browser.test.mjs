import assert from 'node:assert/strict';
import test from 'node:test';
import { browserFixture } from './browser-harness.mjs';

function button(label, root = 'document') {
  return `[...${root}.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(label)})`;
}

test(
  'Administration overview links to focused pages without fetching lists',
  { timeout: 60000 },
  async () => {
    const browser = await browserFixture();
    try {
      await browser.viewport(390);
      await browser.navigate('/org/demo/admin?env=production');
      await browser.wait("document.querySelector('main h1')?.textContent === 'Administration'");
      assert.deepEqual(
        await browser.evaluate(
          `[...document.querySelectorAll('main nav a')].map(link => link.pathname)`,
        ),
        ['/org/demo/admin/users', '/org/demo/admin/teams', '/org/demo/admin/ingestion-keys'],
      );
      assert.equal(
        await browser.evaluate("Boolean(document.querySelector('main form, main table'))"),
        false,
      );
      assert.equal(
        await browser.evaluate(
          "window.__requests.some(request => request.url.startsWith('/admin/'))",
        ),
        false,
      );

      await browser.evaluate(
        'document.querySelector(\'main nav a[href*="/admin/users"]\').click()',
      );
      await browser.wait(
        "document.querySelector('main table')?.textContent.includes('admin@example.test')",
      );
      assert.equal(
        await browser.evaluate("document.querySelector('main input').placeholder"),
        'Search users…',
      );
      assert.equal(await browser.evaluate(`Boolean(${button('Columns')})`), true);
      assert.equal(await browser.evaluate('location.search'), '?env=production');
      assert.equal(await browser.evaluate("Boolean(document.querySelector('main form'))"), false);
      assert.equal(
        await browser.evaluate(
          "window.__requests.some(request => request.url === '/admin/ingestion-keys')",
        ),
        false,
      );
      assert.equal(
        await browser.evaluate('document.documentElement.scrollWidth <= innerWidth'),
        true,
      );
      await browser.evaluate('history.back()');
      await browser.wait("document.querySelector('main h1')?.textContent === 'Administration'");
    } finally {
      await browser.close();
    }
  },
);

test('Users distinguishes initial loading from an empty list', { timeout: 60000 }, async () => {
  const browser = await browserFixture();
  try {
    await browser.navigate('/org/demo/admin/users?case=admin-loading');
    await browser.wait(
      "document.querySelector('main [aria-busy=true]')?.textContent.includes('Loading administration')",
    );
    assert.equal(
      await browser.evaluate(
        "document.querySelector('main').textContent.includes('No users yet.')",
      ),
      false,
    );
    await browser.wait(
      "document.querySelector('main table')?.textContent.includes('admin@example.test')",
    );
  } finally {
    await browser.close();
  }
});

test(
  'Administration retries a failed list and keeps the form draft after a failed save',
  { timeout: 60000 },
  async () => {
    const browser = await browserFixture();
    try {
      await browser.navigate('/org/demo/admin/users?case=admin-retry');
      await browser.wait("document.body.innerText.includes('Fixture admin load failed')");
      await browser.evaluate(`${button('Wiederholen')}.click()`);
      await browser.wait(
        `!${button('Create user')}?.disabled && Boolean(${button('Create user')})`,
      );
      await browser.evaluate(`${button('Create user')}.click()`);
      await browser.wait("Boolean(document.querySelector('[role=dialog] input[name=email]'))");
      await browser.evaluate(`(() => {
      document.querySelector('[role=dialog] input[name=email]').value = 'new@example.test';
      document.querySelector('[role=dialog] input[name=password]').value = 'example-password';
      document.querySelector('[role=dialog] button[type=submit]').click();
    })()`);
      await browser.wait(
        "document.querySelector('[role=dialog] [role=alert]')?.textContent.includes('Fixture user save failed')",
      );
      assert.equal(
        await browser.evaluate("document.querySelector('[role=dialog] input[name=email]').value"),
        'new@example.test',
      );
      await browser.evaluate("document.querySelector('[role=dialog] button[type=submit]').click()");
      await browser.wait(
        "!document.querySelector('[role=dialog]') && document.querySelector('main table')?.textContent.includes('new@example.test')",
      );
      await browser.wait("document.activeElement.textContent.trim() === 'Create user'");
      await browser.evaluate(`${button('Edit')}.click()`);
      await browser.wait("document.querySelector('[role=dialog] input[name=email]')?.readOnly");
      await browser.evaluate(
        `${button('Cancel', "document.querySelector('[role=dialog]')")}.click()`,
      );
      await browser.wait("document.activeElement.textContent.trim() === 'Edit'");
    } finally {
      await browser.close();
    }
  },
);

const keyDialog = "document.querySelector('[role=dialog]')";
const keyInput = 'document.querySelector(\'[aria-label="Generated ingestion key"]\')';

test(
  'Ingestion keys use a two-field form and can be copied and revoked',
  { timeout: 60000 },
  async () => {
    const browser = await browserFixture();
    try {
      await browser.navigate('/org/demo/admin/ingestion-keys');
      await browser.wait(
        `Boolean(${button('Generate key')}) && !${button('Generate key')}.disabled`,
      );
      assert.equal(
        await browser.evaluate("Boolean(document.querySelector('main select[name=keyOwner]'))"),
        false,
      );
      await browser.evaluate(`${button('Generate key')}.click()`);
      await browser.wait(`Boolean(${keyDialog}?.querySelector('input[name=name]'))`);
      assert.deepEqual(
        await browser.evaluate(
          `[...${keyDialog}.querySelectorAll('input, select')].map(field => field.name)`,
        ),
        ['name', 'expiresInDays'],
      );
      assert.equal(
        await browser.evaluate(`${keyDialog}.querySelector('[name=expiresInDays]').value`),
        '30',
      );
      await browser.evaluate(`(() => {
      const form = ${keyDialog}.querySelector('form');
      form.elements.name.value = 'orders-production';
      form.querySelector('button[type=submit]').click();
    })()`);
      await browser.wait(`${keyInput}?.value.includes('fixture_generated') && !${keyDialog}`);
      assert.deepEqual(
        await browser.evaluate(
          "[...document.querySelectorAll('main th')].map(heading => heading.textContent.trim())",
        ),
        ['Name', 'Expires', 'Status', 'Actions'],
      );
      assert.match(
        await browser.evaluate("document.querySelector('main tbody').textContent"),
        /orders-production.*\(30 days left\).*Active/,
      );
      const request = await browser.evaluate(
        "window.__requests.find(request => request.url === '/admin/ingestion-keys' && request.method === 'post')",
      );
      assert.deepEqual(JSON.parse(request.body), {
        name: 'orders-production',
        teamId: 'platform',
        expiresInDays: 30,
      });

      await browser.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async value => { window.__copiedKey = value; } } });
      ${button('Copy key')}.click();`);
      await browser.wait("document.body.innerText.includes('Key copied.')");
      assert.equal(
        await browser.evaluate('window.__copiedKey'),
        await browser.evaluate(`${keyInput}.value`),
      );
      await browser.evaluate(`navigator.clipboard.writeText = async () => { throw new Error('Fixture clipboard denied'); };
      ${button('Copy key')}.click();`);
      await browser.wait("document.body.innerText.includes('Copy failed.')");

      await browser.evaluate('document.querySelector(\'main a[href="/org/demo/admin"]\').click()');
      await browser.wait("document.querySelector('main h1')?.textContent === 'Administration'");
      assert.equal(await browser.evaluate(`Boolean(${keyInput})`), false);
      await browser.evaluate(
        'document.querySelector(\'main nav a[href$="/ingestion-keys"]\').click()',
      );
      await browser.wait(`Boolean(${keyInput})`);
      await browser.evaluate(`${button('Done')}.click()`);
      assert.equal(await browser.evaluate(`Boolean(${keyInput})`), false);

      await browser.evaluate(`${button('Revoke')}.click()`);
      await browser.wait(
        "document.querySelector('[role=alertdialog]')?.textContent.includes('orders-production for Platform')",
      );
      assert.equal(
        await browser.evaluate("window.__requests.some(request => request.method === 'delete')"),
        false,
      );
      await browser.evaluate(
        `${button('Confirm', "document.querySelector('[role=alertdialog]')")}.click()`,
      );
      await browser.wait("document.querySelector('main tbody')?.textContent.includes('Revoked')");
      assert.equal(await browser.evaluate(`Boolean(${button('Revoke')})`), false);
    } finally {
      await browser.close();
    }
  },
);

test(
  'With multiple teams, choose the key owner outside the create form',
  { timeout: 60000 },
  async () => {
    const browser = await browserFixture();
    const owner = "document.querySelector('select[name=keyOwner]')";
    try {
      await browser.navigate('/org/demo/admin/ingestion-keys?case=multiple-teams');
      await browser.wait(`Boolean(${owner})`);
      assert.equal(await browser.evaluate(`${button('Generate key')}.disabled`), true);
      await browser.evaluate(`(() => {
      const select = ${owner};
      select.value = 'operations';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
      await browser.wait(`!${button('Generate key')}.disabled`);
      await browser.evaluate(`${button('Generate key')}.click()`);
      await browser.wait(`Boolean(${keyDialog}?.querySelector('input[name=name]'))`);
      await browser.evaluate(`(() => {
      const form = ${keyDialog}.querySelector('form');
      form.elements.name.value = 'worker-api';
      form.elements.expiresInDays.value = '90';
      form.querySelector('button[type=submit]').click();
    })()`);
      await browser.wait(`${keyInput}?.value.includes('fixture_generated') && !${keyDialog}`);
      const request = await browser.evaluate(
        "window.__requests.find(request => request.url === '/admin/ingestion-keys' && request.method === 'post')",
      );
      assert.deepEqual(JSON.parse(request.body), {
        name: 'worker-api',
        teamId: 'operations',
        expiresInDays: 90,
      });
    } finally {
      await browser.close();
    }
  },
);
