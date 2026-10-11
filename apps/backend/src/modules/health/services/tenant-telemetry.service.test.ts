import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { TenantTelemetryService } from './tenant-telemetry.service';
import type { TenantScope } from '../../auth/auth.types';

test('all three signals enforce organization and user team, and honor admin selection', async () => {
  const originalFetch = globalThis.fetch;
  const payloads: any[] = [];
  globalThis.fetch = async (_url, options) => {
    payloads.push(JSON.parse(String(options?.body)));
    return new Response('{}', { status: 200 });
  };
  const service = new TenantTelemetryService(new ConfigService());
  const scopes: TenantScope[] = [
    { tenantSlug: 'demo', role: 'admin', teamFilter: 'platform' },
    { tenantSlug: 'other', role: 'user', teamId: 'backend', teamFilter: 'platform' },
  ];
  try {
    await assert.rejects(service.generate({ tenantSlug: 'demo', role: 'admin' }), /Assign service/);
    assert.equal(payloads.length, 0, 'missing ownership must not export any signal');
    for (const scope of scopes) {
      payloads.length = 0;
      await service.generate(scope);
      assert.equal(payloads.length, 3);
      for (const payload of payloads) {
        const group = (Object.values(payload)[0] as any[])[0];
        const attrs = Object.fromEntries(group.resource.attributes.map((a: any) => [a.key, a.value.stringValue]));
        assert.equal(attrs['org.slug'], scope.tenantSlug);
        assert.equal(attrs['team.id'], scope.role === 'user' ? scope.teamId : scope.teamFilter);
      }
    }
    globalThis.fetch = async () => new Response('{}', { status: 503 });
    await assert.rejects(service.generate(scopes[0]));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
