export function buildClickhouseUrl(host: string, port: number): string {
    const normalizedHost = host.replace(/\/+$/, '');
    if (/^https?:\/\//i.test(normalizedHost)) {
      const url = new URL(normalizedHost);
      if (!url.port) {
        url.port = String(port);
      }
      return url.toString().replace(/\/$/, '');
    }

    return `http://${normalizedHost}:${port}`;
  }
