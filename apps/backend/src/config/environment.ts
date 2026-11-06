/** Parse deployment settings once at startup; domain validation stays in its modules. */
export function positiveInteger(name: string, fallback: number, maximum = Number.MAX_SAFE_INTEGER): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '' || raw === '0') return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}.`);
  }
  return value;
}

export function configuredOrigins(fallback: string[]): string[] {
  if (!process.env.CORS_ORIGINS) return fallback;
  return process.env.CORS_ORIGINS.split(',').map(value => {
    const origin = value.trim();
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
      throw new Error('CORS_ORIGINS must contain comma-separated HTTP(S) origins without paths.');
    }
    return origin;
  });
}
