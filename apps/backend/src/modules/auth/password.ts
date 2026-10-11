import { randomBytes, scrypt as callback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(callback);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function passwordMatches(password: string, encoded = ''): Promise<boolean> {
  const valid = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(encoded);
  const [, salt, expected] = valid ? encoded.split('$') : ['scrypt', '00'.repeat(16), '00'.repeat(64)];
  const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && valid;
}
