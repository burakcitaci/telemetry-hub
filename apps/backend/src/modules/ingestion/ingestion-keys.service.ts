import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

export interface IngestionIdentity {
  orgSlug: string;
  teamId: string;
  expiresAt: number;
}

interface KeyRecord extends IngestionIdentity {
  keyHash: string;
  revoked?: boolean;
}

/** Simulated database: only digests are stored; replace with an indexed DB lookup. */
@Injectable()
export class IngestionKeysService {
  private readonly records = new Map<string, KeyRecord>();

  constructor(config: ConfigService) {
    const records = JSON.parse(config.get<string>('INGESTION_KEYS_JSON') ?? '[]');
    if (!Array.isArray(records)) throw new Error('INGESTION_KEYS_JSON must be an array.');
    for (const record of records) this.add(record);
  }

  resolve(key: string): IngestionIdentity | undefined {
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(key)) return undefined;
    const hash = createHash('sha256').update(key).digest('hex');
    const record = this.records.get(hash);
    if (!record || record.revoked || record.expiresAt <= Date.now()) return undefined;
    return { orgSlug: record.orgSlug, teamId: record.teamId, expiresAt: record.expiresAt };
  }

  private add(record: KeyRecord): void {
    const validId = (value: unknown) => typeof value === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
    if (!record || !/^[a-f0-9]{64}$/.test(record.keyHash)
      || !validId(record.orgSlug) || !validId(record.teamId)
      || !Number.isFinite(record.expiresAt) || typeof record.revoked !== 'undefined'
        && typeof record.revoked !== 'boolean' || this.records.has(record.keyHash)) {
      throw new Error('Invalid or duplicate ingestion key record.');
    }
    this.records.set(record.keyHash, Object.freeze({ ...record }));
  }
}
