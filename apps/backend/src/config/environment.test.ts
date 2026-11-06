import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configuredOrigins, positiveInteger } from './environment';

test('deployment integers preserve defaults and reject malformed or out-of-range settings', () => {
  const original = process.env.PORT;
  try {
    delete process.env.PORT;
    assert.equal(positiveInteger('PORT', 3001, 65535), 3001);
    for (const value of ['', '0']) {
      process.env.PORT = value;
      assert.equal(positiveInteger('PORT', 3001, 65535), 3001);
    }
    process.env.PORT = '8123';
    assert.equal(positiveInteger('PORT', 3001, 65535), 8123);
    for (const value of ['12bad', '-1', '1.5', '65536', 'NaN']) {
      process.env.PORT = value;
      assert.throws(() => positiveInteger('PORT', 3001, 65535), /PORT must be/);
    }
  } finally { if (original === undefined) delete process.env.PORT; else process.env.PORT = original; }
});

test('configured CORS origins preserve local defaults and accept only exact HTTP origins', () => {
  const original = process.env.CORS_ORIGINS;
  try {
    delete process.env.CORS_ORIGINS;
    assert.deepEqual(configuredOrigins(['http://localhost:5000']), ['http://localhost:5000']);
    process.env.CORS_ORIGINS = 'https://hub.example.test, http://localhost:5000';
    assert.deepEqual(configuredOrigins([]), ['https://hub.example.test', 'http://localhost:5000']);
    for (const value of ['*', 'https://hub.example.test/path', 'ftp://example.test']) {
      process.env.CORS_ORIGINS = value;
      assert.throws(() => configuredOrigins([]));
    }
  } finally { if (original === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = original; }
});
