import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { IngestionKeysService, type IngestionIdentity } from './ingestion-keys.service';

@Injectable()
export class IngestionMiddleware {
  private readonly identities = new WeakMap<Request, IngestionIdentity>();
  private readonly endpoint: string;
  private readonly token: string;

  constructor(private readonly keys: IngestionKeysService, config: ConfigService) {
    this.endpoint = config.get<string>('INGESTION_COLLECTOR_ENDPOINT') ?? 'http://localhost:4319';
    this.token = config.get<string>('INGESTION_COLLECTOR_TOKEN') ?? '';
    if (this.token && !/^[A-Za-z0-9_-]{32,256}$/.test(this.token)) {
      throw new Error('INGESTION_COLLECTOR_TOKEN must be a random URL-safe token (32–256 characters).');
    }
  }

  authenticate = (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'POST' || !/^\/v1\/(traces|logs|metrics)$/.test(req.path)) {
      res.sendStatus(404); return;
    }
    if (!this.token) { res.sendStatus(503); return; }
    const key = req.headers['x-api-key'];
    const identity = typeof key === 'string' ? this.keys.resolve(key) : undefined;
    if (!identity) { res.sendStatus(401); return; }
    const type = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
    if (!['application/json', 'application/x-protobuf'].includes(type ?? '')) {
      res.sendStatus(415); return;
    }
    this.identities.set(req, identity);
    next();
  };

  forward = async (req: Request, res: Response): Promise<void> => {
    const identity = this.identities.get(req);
    if (!identity) { res.sendStatus(401); return; }
    if (!Buffer.isBuffer(req.body) || !req.body.length) { res.sendStatus(400); return; }
    try {
      const upstream = await fetch(`${this.endpoint.replace(/\/$/, '')}${req.path}`, {
        method: 'POST', body: new Uint8Array(req.body),
        headers: this.trustedHeaders(req, identity), signal: AbortSignal.timeout(10_000),
      });
      res.status(upstream.status).type(upstream.headers.get('content-type') ?? 'application/x-protobuf')
        .send(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.sendStatus(503); }
  };

  private trustedHeaders(req: Request, identity: IngestionIdentity): Record<string, string> {
    // Construct fresh headers: never forward client tenant headers, credentials or cookies.
    return {
      'Content-Type': req.headers['content-type']!.split(';')[0],
      Authorization: `Bearer ${this.token}`,
      'X-Telemetry-Org': identity.orgSlug,
      'X-Telemetry-Team': identity.teamId,
    };
  }
}
