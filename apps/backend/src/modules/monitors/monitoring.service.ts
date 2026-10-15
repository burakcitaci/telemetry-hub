import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PlatformStore } from '../auth/platform-store.service';
import { AdminService } from '../auth/admin.service';
import type { TenantScope } from '../auth/auth.types';
import { SignalRegistry } from './signal-registry';
import { SIGNAL_EVALUATOR, SignalEvaluator } from './signal-evaluator';
import { CreateMonitorDto, type PatchMonitorDto } from './dto/unified-monitor.dto';
import { monitorConfiguration, monitorStatus } from './monitor-contract.mapper';
import { validateMonitorInput } from './monitor-input.pipe';
import { validateEvaluation } from './monitor-state';
import { validateNotificationPolicy } from './notification-policy';
import type { Monitor } from './monitor.model';
import { monitoringConfig, type MonitoringConfig } from './monitoring.config';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly settings: MonitoringConfig;
  constructor(private readonly store: PlatformStore, private readonly admin: AdminService,
    private readonly adapters: SignalRegistry, @Inject(SIGNAL_EVALUATOR) private readonly evaluator: SignalEvaluator,
    @Optional() config: ConfigService = new ConfigService()) { this.settings = monitoringConfig(config); }

  async create(scope: TenantScope, dto: CreateMonitorDto): Promise<Monitor> {
    const configuration = await this.configuration(scope, dto);
    if (this.store.monitorIds(scope.tenantSlug).length >= 100) throw new ConflictException('The limit is 100 monitors per organization.');
    const monitor: Monitor = { ...configuration, enabled: configuration.enabled ?? true,
      id: randomUUID(), schemaVersion: 2, configurationVersion: 1, created_at: new Date().toISOString() };
    this.store.monitorRepository.save(scope.tenantSlug, monitor);
    this.enqueue(scope.tenantSlug, monitor.id);
    return monitor;
  }

  async patch(scope: TenantScope, id: string, patch: PatchMonitorDto): Promise<Monitor> {
    if (!Object.keys(patch).length) throw new BadRequestException('Supply at least one monitor field.');
    const existing = this.require(scope.tenantSlug, id);
    const configuration = await this.configuration(scope, { ...monitorConfiguration(existing), ...patch });
    const next: Monitor = { ...configuration, enabled: configuration.enabled ?? true, id, schemaVersion: 2,
      configurationVersion: (existing.configurationVersion ?? 0) + 1, created_at: existing.created_at ?? existing.createdAt ?? new Date().toISOString() };
    const saved = this.store.monitorRepository.replaceConfiguration(scope.tenantSlug, existing, next);
    if (!saved) throw new ConflictException('Monitor changed during this update; reload and retry.');
    this.enqueue(scope.tenantSlug, id);
    return saved;
  }

  status(org: string, id: string) {
    const monitor = this.require(org, id);
    if (monitor.schemaVersion !== 2) return { id, legacy: true, value: monitor.value ?? null, status: monitor.status ?? 'Unknown', estimated: null };
    return monitorStatus(monitor as Monitor);
  }

  private require(org: string, id: string): Record<string, any> {
    const record = this.store.monitorRepository.history.load(org, id);
    if (!record) throw new NotFoundException('Monitor not found.');
    return record;
  }

  private async configuration(scope: TenantScope, input: unknown): Promise<CreateMonitorDto> {
    const dto = await validateMonitorInput(CreateMonitorDto, input);
    dto.window_seconds ??= this.settings.defaultWindowSeconds;
    if (!dto.name.trim()) throw new BadRequestException('Monitor name must not be blank.');
    this.admin.assertTeam(scope.tenantSlug, dto.team_id ?? undefined);
    for (const key of ['field', 'metric_name', 'team_id', 'service', 'env', 'muted_until'] as const)
      if (dto[key] === null) delete dto[key];
    try {
      validateEvaluation(dto as Monitor); validateNotificationPolicy(dto as Monitor);
      this.adapters.get(dto.signal_type).validate?.({ ...dto, scope } as any);
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : 'Invalid monitor definition.'); }
    return { ...dto, name: dto.name.trim() };
  }

  private enqueue(org: string, id: string): void {
    void this.evaluator.evaluate(org, id).catch(() => this.logger.error('Initial monitor evaluation could not be persisted.'));
  }
}
