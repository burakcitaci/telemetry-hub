import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PlatformStore, type IngestionKeyRecord } from '../auth/platform-store.service';
import type { CreateIngestionKeyDto } from './ingestion-key.dto';

export interface IngestionIdentity {
  orgSlug: string;
  teamId: string;
  env?: string;
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

  constructor(config: ConfigService, private readonly store: PlatformStore) {
    const records = JSON.parse(config.get<string>('INGESTION_KEYS_JSON') ?? '[]');
    if (!Array.isArray(records)) throw new Error('INGESTION_KEYS_JSON must be an array.');
    for (const record of records) this.add(record);
  }

  resolve(key: string): IngestionIdentity | undefined {
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(key)) return undefined;
    const hash = createHash('sha256').update(key).digest('hex');
    const record = this.records.get(hash) ?? this.store.ingestionKeyByHash(hash);
    if (!record || (record as KeyRecord).revoked || (record as IngestionKeyRecord).revokedAt
      || record.expiresAt <= Date.now()) return undefined;
    return { orgSlug: record.orgSlug, teamId: record.teamId, expiresAt: record.expiresAt,
      ...(record.env ? { env: record.env } : {}) };
  }

  list(org: string) {
    return this.store.ingestionKeys(org).map(record => this.publicRecord(record));
  }

  create(org: string, dto: CreateIngestionKeyDto) {
    const key = randomBytes(32).toString('base64url');
    const record: IngestionKeyRecord = { id: randomUUID(), orgSlug: org, name: dto.name.trim(),
      teamId: dto.teamId, ...(dto.env ? { env: dto.env } : {}), keyHash: this.hash(key),
      createdAt: Date.now(), expiresAt: Date.now() + dto.expiresInDays * 86_400_000 };
    this.store.createIngestionKey(record);
    return { ...this.publicRecord(record), key };
  }

  revoke(org: string, id: string) {
    if (!this.store.revokeIngestionKey(org, id, Date.now())) throw new NotFoundException('Ingestion key not found.');
    return { success: true };
  }

  private hash(key: string) { return createHash('sha256').update(key).digest('hex'); }

  private publicRecord(record: IngestionKeyRecord) {
    return { id: record.id, name: record.name, teamId: record.teamId, env: record.env,
      createdAt: record.createdAt, expiresAt: record.expiresAt, revokedAt: record.revokedAt };
  }

  private add(record: KeyRecord): void {
    const validId = (value: unknown) => typeof value === 'string'
      && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
    if (!record || !/^[a-f0-9]{64}$/.test(record.keyHash)
      || !validId(record.orgSlug) || !validId(record.teamId)
      || record.env !== undefined && (typeof record.env !== 'string' || record.env === 'all'
        || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(record.env))
      || !Number.isFinite(record.expiresAt) || typeof record.revoked !== 'undefined'
        && typeof record.revoked !== 'boolean' || this.records.has(record.keyHash)) {
      throw new Error('Invalid or duplicate ingestion key record.');
    }
    this.records.set(record.keyHash, Object.freeze({ ...record }));
  }
}
