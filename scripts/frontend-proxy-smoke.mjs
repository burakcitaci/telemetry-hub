import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { launchBrowser } from '../apps/frontend/tests/browser-harness.mjs';

const image = process.argv[2] || 'telemetry-hub-frontend-check';
const network = `telemetry-frontend-check-${randomUUID()}`;
const backend = `${network}-backend`,
  frontend = `${network}-frontend`;
let browser;
const docker = (args) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
try {
  docker(['network', 'create', network]);
  const fixture = fileURLToPath(new URL('./fixtures/frontend-backend.mjs', import.meta.url));
  docker([
    'run',
    '-d',
    '--name',
    backend,
    '--network',
    network,
    '--network-alias',
    'backend',
    '-v',
    `${fixture}:/fixture.mjs:ro`,
    'node:24-alpine',
    'node',
    '/fixture.mjs',
  ]);
  docker(['run', '-d', '--name', frontend, '--network', network, '-p', '127.0.0.1::8080', image]);
  const port = docker(['port', frontend, '8080/tcp']).split(':').at(-1);
  const origin = `http://localhost:${port}`,
    alias = `http://127.0.0.1:${port}`;
  await waitForFrontend(origin);
  const redirect = await fetch(`${alias}/login?from=loopback`, { redirect: 'manual' });
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), `${origin}/login?from=loopback`);
  browser = await launchBrowser();
  await browser.navigate(`${alias}/login?from=loopback`);
  await browser.wait(
    "location.hostname === 'localhost' && Boolean(document.getElementById('email'))",
  );
  await fillLogin(browser);
  await browser.wait(
    "location.pathname.startsWith('/org/demo/') && document.body.innerText.includes('Log out')",
  );
  assert.equal(
    await browser.evaluate("fetch('/api/auth/session',{credentials:'include'}).then(r=>r.status)"),
    200,
  );
  const origins = await browser.evaluate(
    "performance.getEntriesByType('resource').filter(item=>item.name.includes('/api/')).map(item=>new URL(item.name).origin)",
  );
  assert.ok(
    origins.length > 0 && origins.every((value) => value === origin),
    'All production API requests must use the dashboard origin',
  );
  console.log(
    '127.0.0.1 redirect, preserved port/path/query, browser login, Secure-cookie session and same-origin API requests passed.',
  );
} finally {
  try {
    await browser?.close();
  } finally {
    for (const name of [frontend, backend])
      spawnSync('docker', ['rm', '-f', name], { windowsHide: true, stdio: 'ignore' });
    spawnSync('docker', ['network', 'rm', network], { windowsHide: true, stdio: 'ignore' });
  }
}

async function fillLogin(browser) {
  await browser.evaluate(`const values={tenantSlug:'demo',email:'smoke@example.test',password:'smoke-password-1234'};
    for(const [id,value] of Object.entries(values)){const input=document.getElementById(id);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await browser.evaluate("document.querySelector('form').requestSubmit()");
}

async function waitForFrontend(origin) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      /* nginx is starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Frontend container did not start.');
}
