import { ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TenantJwtPayload, UserRole } from './auth.types';
import { filterValues, type FilterSelection } from './platform-filters';
import { registerTelemetryOwnership } from '../../common/telemetry/tenant-context';

export interface Identity {
  id: string; email: string; tenantSlug: string; role: UserRole;
  teamId?: string; passwordHash: string; version: number;
}
export interface Team { id: string; name: string }

/** Persistent single-node control plane; organization is part of every lookup. */
@Injectable()
export class PlatformStore implements OnModuleDestroy {
  private readonly db: DatabaseSync;
  private readonly releaseOwnership: () => void;

  constructor(config: ConfigService) {
    const path = config.get<string>('AUTH_DB_PATH') ?? resolve('data/platform.sqlite');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users (org TEXT, id TEXT, email TEXT, body TEXT NOT NULL,
        PRIMARY KEY(org,id), UNIQUE(org,email));
      CREATE TABLE IF NOT EXISTS teams (org TEXT, id TEXT, name TEXT NOT NULL, PRIMARY KEY(org,id));
      CREATE TABLE IF NOT EXISTS monitors (org TEXT, id TEXT, body TEXT NOT NULL, PRIMARY KEY(org,id));`);
    this.db.exec('CREATE TABLE IF NOT EXISTS bootstrap (org TEXT, email TEXT, PRIMARY KEY(org,email));');
    this.db.exec('CREATE TABLE IF NOT EXISTS service_metadata (org TEXT, service TEXT, body TEXT NOT NULL, PRIMARY KEY(org,service));');
    this.seed(config.get<string>('AUTH_USERS_JSON'));
    this.releaseOwnership = registerTelemetryOwnership((org, service) => this.serviceTeam(org, service));
  }

  onModuleDestroy() { this.releaseOwnership(); this.db.close(); }

  serviceTeam(org: string, service: string): string | undefined {
    const row = this.db.prepare('SELECT body FROM service_metadata WHERE org = ? AND service = ?').get(org, service);
    const team = row ? JSON.parse(String(row.body)).team : undefined;
    return typeof team === 'string' && team ? team : undefined;
  }

  serviceMetadata(org: string): Record<string, unknown>[] {
    return this.db.prepare('SELECT body FROM service_metadata WHERE org = ? ORDER BY service')
      .all(org).map(row => JSON.parse(String(row.body)));
  }

  serviceOwnership(org: string, team: FilterSelection) {
    const teams = filterValues(team);
    const rows = this.serviceMetadata(org).filter(row => typeof row.team === 'string' && row.team !== '');
    return { assigned: rows.map(row => String(row.serviceName)),
      owned: rows.filter(row => teams.includes(String(row.team))).map(row => String(row.serviceName)) };
  }

  saveServiceMetadata(org: string, service: string, metadata: Record<string, unknown>) {
    this.db.prepare('INSERT INTO service_metadata VALUES (?, ?, ?) ON CONFLICT(org,service) DO UPDATE SET body=excluded.body')
      .run(org, service, JSON.stringify(metadata));
  }

  deleteServiceMetadata(org: string, service: string) {
    this.db.prepare('DELETE FROM service_metadata WHERE org = ? AND service = ?').run(org, service);
  }

  isSessionActive(payload: TenantJwtPayload): boolean {
    const user = payload.sub ? this.user(payload.tenantSlug, payload.sub) : undefined;
    return !!user && user.version === payload.version && user.role === payload.role
      && user.teamId === payload.teamId && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  }

  users(org: string): Identity[] {
    return this.db.prepare('SELECT body FROM users WHERE org = ? ORDER BY email')
      .all(org).map(row => JSON.parse(String(row.body)));
  }

  user(org: string, id: string): Identity | undefined {
    const row = this.db.prepare('SELECT body FROM users WHERE org = ? AND id = ?').get(org, id);
    return row ? JSON.parse(String(row.body)) : undefined;
  }

  identity(org: string, email: string): Identity | undefined {
    const row = this.db.prepare('SELECT body FROM users WHERE org = ? AND email = ?')
      .get(org, email.trim().toLowerCase());
    return row ? JSON.parse(String(row.body)) : undefined;
  }

  createUser(user: Identity) {
    if (this.identity(user.tenantSlug, user.email)) throw new ConflictException('Email already exists.');
    this.db.prepare('INSERT INTO users VALUES (?, ?, ?, ?)')
      .run(user.tenantSlug, user.id, user.email, JSON.stringify(user));
  }

  updateUser(user: Identity) {
    this.assertAdministratorRemains(user.tenantSlug, user.id, user.role);
    this.db.prepare('UPDATE users SET body = ? WHERE org = ? AND id = ?')
      .run(JSON.stringify(user), user.tenantSlug, user.id);
  }

  deleteUser(org: string, id: string) {
    this.assertAdministratorRemains(org, id, 'user');
    this.db.prepare('DELETE FROM users WHERE org = ? AND id = ?').run(org, id);
  }

  teams(org: string): Team[] {
    return this.db.prepare('SELECT id, name FROM teams WHERE org = ? ORDER BY name')
      .all(org) as unknown as Team[];
  }

  createTeam(org: string, team: Team) {
    if (this.teams(org).some(candidate => candidate.id === team.id)) {
      throw new ConflictException('Team already exists.');
    }
    this.db.prepare('INSERT INTO teams VALUES (?, ?, ?)').run(org, team.id, team.name);
  }

  deleteTeam(org: string, id: string) {
    if (this.serviceMetadata(org).some(metadata => metadata.team === id)) {
      throw new ConflictException('Reassign services before deleting this team.');
    }
    if (this.users(org).some(user => user.teamId === id)) {
      throw new ConflictException('Reassign team members before deleting this team.');
    }
    if (this.monitors(org).some(monitor => monitor.teamId === id)) {
      throw new ConflictException('Reassign monitors before deleting this team.');
    }
    this.db.prepare('DELETE FROM teams WHERE org = ? AND id = ?').run(org, id);
  }

  monitors(org: string): Record<string, any>[] {
    return this.db.prepare('SELECT body FROM monitors WHERE org = ?').all(org)
      .map(row => JSON.parse(String(row.body)));
  }

  saveMonitor(org: string, monitor: Record<string, any>) {
    this.db.prepare('INSERT INTO monitors VALUES (?, ?, ?) ON CONFLICT(org,id) DO UPDATE SET body=excluded.body')
      .run(org, monitor.id, JSON.stringify(monitor));
  }

  deleteMonitor(org: string, id: string) {
    this.db.prepare('DELETE FROM monitors WHERE org = ? AND id = ?').run(org, id);
  }

  private assertAdministratorRemains(org: string, id: string, nextRole: UserRole) {
    const users = this.users(org);
    if (nextRole !== 'admin' && users.find(user => user.id === id)?.role === 'admin'
      && users.filter(user => user.role === 'admin').length <= 1) {
      throw new ConflictException('The last organization administrator cannot be removed.');
    }
  }

  private seed(raw?: string) {
    if (!raw) return;
    const identities = JSON.parse(raw);
    if (!Array.isArray(identities)) throw new Error('AUTH_USERS_JSON must be an array.');
    for (const identity of identities) this.seedIdentity(identity);
  }

  private seedIdentity(identity: Identity & { teams?: string[] }) {
    if (!identity.tenantSlug || !identity.email || !['admin', 'user'].includes(identity.role)) {
      throw new Error('Invalid bootstrap identity.');
    }
    const email = identity.email.trim().toLowerCase();
    if (this.db.prepare('SELECT 1 FROM bootstrap WHERE org = ? AND email = ?').get(identity.tenantSlug, email)) return;
    for (const id of new Set([...(identity.teams ?? []), ...(identity.teamId ? [identity.teamId] : [])])) {
      this.db.prepare('INSERT OR IGNORE INTO teams VALUES (?, ?, ?)').run(identity.tenantSlug, id, id);
    }
    if (!this.identity(identity.tenantSlug, email)) {
      this.createUser({ id: randomUUID(), email, role: identity.role,
        tenantSlug: identity.tenantSlug, teamId: identity.teamId, passwordHash: identity.passwordHash, version: 1 });
    }
    this.db.prepare('INSERT INTO bootstrap VALUES (?, ?)').run(identity.tenantSlug, email);
  }
}
