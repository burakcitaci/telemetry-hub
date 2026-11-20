import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PlatformStore } from '../auth/platform-store.service';
import type { AlertEvent, Monitor } from './monitor.model';
import type { Notifier } from './notifier';
import { parseMonitorQuery } from './query-parser';
import { WebhookNotifier } from './webhook-notifier';
import type { CreateMaintenanceDto } from './dto/monitor-operations.dto';
import type { MaintenanceWindow, TestDelivery } from './monitor-operations.store';

const serviceKeys = new Set(['service.name']);
const identifier = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object.');
  return value as Record<string, unknown>;
}

function endpoint(value: unknown): string {
  const url = typeof value === 'string' ? URL.parse(value) : null;
  if (url?.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash)
    throw new Error('Destinations must be HTTPS URLs without credentials or fragments.');
  return url.href;
}

function configuration(raw: string): Map<string, Map<string, string>> {
  try {
    return new Map(Object.entries(object(JSON.parse(raw))).map(([org, routes]) => {
      if (!identifier.test(org)) throw new Error('Invalid organization.');
      return [org, new Map(Object.entries(object(routes)).map(([name, url]) => {
        if (!identifier.test(name)) throw new Error('Invalid destination name.');
        return [name, endpoint(url)];
      }))];
    }));
  } catch { throw new Error('MONITOR_TEAM_DESTINATIONS must map organization slugs to named HTTPS destinations.'); }
}

@Injectable()
export class TeamMonitorOperations {
  private readonly destinations: Map<string, Map<string, string>>;
  constructor(private readonly store: PlatformStore, @Optional() config: ConfigService = new ConfigService()) {
    this.destinations = configuration(config.get<string>('MONITOR_TEAM_DESTINATIONS') || '{}');
  }

  team(org: string, id: string) {
    const team = this.store.teams(org).find(item => item.id === id);
    if (!team) throw new NotFoundException('Team not found.');
    return team;
  }

  effectiveTeam(org: string, monitor: { team_id?: string; teamId?: string; service?: string; query?: string; schemaVersion?: number }) {
    const service = this.effectiveService(monitor);
    return monitor.team_id || monitor.teamId || (service ? this.store.serviceTeam(org, service) : undefined);
  }

  private effectiveService(monitor: { service?: string; query?: string; schemaVersion?: number }): string | undefined {
    if (monitor.service || monitor.schemaVersion !== 2 || !monitor.query) return monitor.service;
    try { return parseMonitorQuery(monitor.query, serviceKeys).filters['service.name']; }
    catch { return undefined; }
  }

  routing(org: string, team: string) {
    this.team(org, team);
    return {
      destination: this.store.monitorOperations.destination(org, team) ?? null,
      options: [...(this.destinations.get(org)?.keys() ?? [])].sort(),
      tests: this.store.monitorOperations.deliveries(org, team),
    };
  }

  setDestination(org: string, team: string, destination: string | null) {
    this.team(org, team);
    if (destination !== null && !this.destinations.get(org)?.has(destination))
      throw new BadRequestException('Choose a configured destination for this organization.');
    this.store.monitorOperations.setDestination(org, team, destination);
    return this.routing(org, team);
  }

  policy(org: string, monitor: Monitor, at: string) {
    const team = this.effectiveTeam(org, monitor);
    return { team, destination: team ? this.store.monitorOperations.destination(org, team) : undefined,
      maintenance: this.store.monitorOperations.maintenanceFor(org, team, this.effectiveService(monitor), at) };
  }

  async deliver(org: string, event: AlertEvent, fallback: Notifier) {
    const destination = event.notification?.destination;
    if (!destination) return fallback.notify(event);
    await this.publisher(org, destination).notify(event);
  }

  async testDestination(org: string, team: string) {
    const { destination, tests } = this.routing(org, team);
    if (!destination) throw new BadRequestException('Select a team destination first.');
    const publisher = this.publisher(org, destination);
    if (tests[0] && Date.now() - Date.parse(tests[0].at) < 10_000)
      throw new ConflictException('Wait 10 seconds between test messages.');
    const receipt: TestDelivery = { id: randomUUID(), destination, at: new Date().toISOString(), status: 'PENDING' };
    this.store.monitorOperations.saveDelivery(org, team, receipt);
    try {
      await publisher.publish({ id: receipt.id, type: 'monitor.test', organization: org, team_id: team, at: receipt.at });
      receipt.status = 'SENT';
    } catch { receipt.status = 'FAILED'; }
    this.store.monitorOperations.saveDelivery(org, team, receipt);
    return receipt;
  }

  private publisher(org: string, destination: string) {
    const url = this.destinations.get(org)?.get(destination);
    if (!url) throw new BadRequestException('The selected destination is unavailable.');
    return new WebhookNotifier(url);
  }

  createWindow(org: string, dto: CreateMaintenanceDto) {
    const { starts_at, ends_at } = this.windowTimes(dto);
    const service = dto.service?.trim();
    if (!dto.name.trim() || !dto.team_id && !service) throw new BadRequestException('Supply a name and a team or service.');
    if (dto.team_id) this.team(org, dto.team_id);
    const window: MaintenanceWindow = { id: randomUUID(), name: dto.name.trim(), starts_at, ends_at,
      ...(dto.team_id ? { team_id: dto.team_id } : {}), ...(service ? { service } : {}) };
    this.store.monitorOperations.saveWindow(org, window);
    return window;
  }

  private windowTimes(dto: CreateMaintenanceDto) {
    const start = Date.parse(dto.starts_at), end = Date.parse(dto.ends_at);
    const zoned = /(?:Z|[+-]\d\d:\d\d)$/i;
    if (!zoned.test(dto.starts_at) || !zoned.test(dto.ends_at) || !Number.isFinite(start) ||
      !Number.isFinite(end) || end <= start || end <= Date.now())
      throw new BadRequestException('Supply a start and future end with time zones. End must follow start.');
    return { starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString() };
  }
}
