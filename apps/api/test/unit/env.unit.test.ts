import { afterEach, describe, expect, it } from 'vitest';

import { loadEnv } from '../../src/config/env.js';

const keys = ['NODE_ENV', 'API_PORT', 'SQLITE_PATH', 'COOKIE_SECRET', 'ALLOWED_ORIGIN'] as const;
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('loadEnv', () => {
  it('coerces the port and keeps the documented defaults', () => {
    for (const key of keys) delete process.env[key];
    process.env.API_PORT = '4000';

    expect(loadEnv()).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 4000,
      ALLOWED_ORIGIN: 'http://localhost:5173',
    });
  });

  it('refuses a short cookie secret and a malformed origin', () => {
    process.env.COOKIE_SECRET = 'short';
    expect(() => loadEnv()).toThrow();

    process.env.COOKIE_SECRET = 'long-enough-secret';
    process.env.ALLOWED_ORIGIN = 'not a url';
    expect(() => loadEnv()).toThrow();
  });
});
