import { HttpException, Inject, Injectable, Logger, Optional, ServiceUnavailableException, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PlatformStore } from '../auth/platform-store.service';
import type { MonitorDto } from '../auth/dto/monitor.dto';
import { MonitorQueryService } from './monitor-query.service';
import { overallState, type MonitorEvaluation, type MonitorGroup } from './monitor-rule';
import { runTelemetryContext } from '../../common/telemetry/tenant-context';
import { SIGNAL_EVALUATOR, type SignalEvaluator } from './signal-evaluator';
import { ConfigService } from '@nestjs/config';
import { performance } from 'node:perf_hooks';
import { monitoringConfig, type MonitoringConfig } from './monitoring.config';
import { MonitoringTelemetry } from './monitoring.telemetry';

@Injectable()
export class MonitorEvaluatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitorEvaluatorService.name);
  private timer?: ReturnType<typeof setInterval>;
  private initial?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private running = false;
  private readonly pending = new Map<string, Promise<Record<string, any> | undefined>>();
  private readonly settings: MonitoringConfig;
  constructor(private readonly store: PlatformStore, private readonly query: MonitorQueryService,
    @Optional() @Inject(SIGNAL_EVALUATOR) private readonly signals?: SignalEvaluator,
    @Optional() config: ConfigService = new ConfigService(),
    @Optional() private readonly telemetry?: MonitoringTelemetry) {
    this.settings = monitoringConfig(config);
    this.store.registerMonitorCleanup(() => this.onModuleDestroy());
  }

  onModuleInit(): void {
    this.initial = setTimeout(() => void this.tick(), this.settings.initialDelayMs);
    this.initial.unref();
    this.timer = setInterval(() => void this.tick(), this.settings.intervalMs);
    this.timer.unref();
  }

  get overdueAfterMs(): number { return this.settings.intervalMs * 3; }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.initial); clearInterval(this.timer);
    await this.signals?.stop();
    await Promise.allSettled([...this.pending.values()]);
  }

  evaluate(org: string, id: string): Promise<Record<string, any> | undefined> {
    const key = JSON.stringify([org, id]);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const task = this.evaluateOnce(org, id).catch(() => {
      this.logger.error('Monitor result could not be persisted.'); return undefined;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }

  async preview(org: string, rule: MonitorDto): Promise<MonitorEvaluation> {
    try { return await this.query.evaluate(org, rule); }
    catch (cause) {
      if (cause instanceof HttpException) throw cause;
      throw new ServiceUnavailableException('Preview data is unavailable. Check metric type, units and group cardinality.', { cause });
    }
  }

  async history(org: string, rule: MonitorDto, from: Date, to: Date) {
    try { return await this.query.history(org, rule, from, to); }
    catch (cause) {
      if (cause instanceof HttpException) throw cause;
      throw new ServiceUnavailableException('Historical monitor data is unavailable.', { cause });
    }
  }

  private async tick(): Promise<void> {
    if (this.running || this.stopped) return;
    const started = performance.now();
    this.running = true;
    try {
      for (const org of this.store.monitorOrganizations()) for (const id of this.store.monitorIds(org)) {
        if (this.stopped) return;
        await this.evaluate(org, id);
      }
    } catch { this.logger.error('Monitor evaluation cycle failed.'); }
    finally { this.running = false; this.telemetry?.cycle(started); }
  }

  private async evaluateOnce(org: string, id: string) {
    const monitor = this.store.monitor(org, id);
    if (!monitor) return undefined;
    if (monitor.schemaVersion === 2) {
      if (!this.signals) throw new Error('Unified signal evaluator is not configured.');
      return runTelemetryContext({ scope: { tenantSlug: org, role: 'admin', teamId: monitor.team_id } },
        () => this.signals!.evaluate(org, id));
    }
    return this.evaluateLegacy(org, monitor);
  }

  private async evaluateLegacy(org: string, monitor: Record<string, any>) {
    let result: MonitorEvaluation;
    try { result = await runTelemetryContext({ scope: { tenantSlug: org, role: 'admin', teamId: monitor.teamId } },
      () => this.query.evaluate(org, monitor as MonitorDto)); }
    catch {
      const at = new Date().toISOString();
      result = { status: 'Unknown', value: null, unit: '', groups: [], evaluatedAt: at, from: at, to: at,
        error: 'Evaluation failed. Check the rule, metric type and data availability.' };
    }
    const current = this.store.monitor(org, monitor.id);
    if (!current || current.updatedAt !== monitor.updatedAt || current.configurationVersion !== monitor.configurationVersion || this.stopped) return current;
    return this.persist(org, current, result);
  }

  private persist(org: string, monitor: Record<string, any>, result: MonitorEvaluation) {
    if (!result.error) this.includeMissingGroups(monitor.groups ?? [], result);
    const at = Date.parse(result.evaluatedAt);
    const history = [...(monitor.history ?? []), { t: at, v: result.value, status: result.status }]
      .filter(point => point.t >= at - 86_400_000).slice(-2880);
    const changed = monitor.status !== result.status;
    const events = changed && !monitor.isMuted ? [{ id: randomUUID(), monitorId: monitor.id, at: result.evaluatedAt, status: result.status,
      ...(result.value === null ? {} : { value: result.value }), message: `${monitor.status ?? 'Unknown'} → ${result.status}` },
      ...(monitor.events ?? [])].slice(0, 100) : monitor.events ?? [];
    const next = { ...monitor, status: result.status, lastEvaluatedAt: result.evaluatedAt, value: result.value,
      unit: result.unit, groups: result.groups, evaluationError: result.error ?? null,
      evaluationEnabled: true, history, events, windowFrom: result.from, windowTo: result.to,
      ...(changed && result.status === 'Alert' && !monitor.isMuted ? { lastTriggeredAt: result.evaluatedAt } : {}) };
    this.store.saveMonitor(org, next);
    return next;
  }

  private includeMissingGroups(previous: MonitorGroup[], result: MonitorEvaluation): void {
    const current = new Set(result.groups.map(group => group.key));
    const missing = previous.filter(group => !current.has(group.key)).map(group =>
      ({ ...group, value: null, status: 'No Data' as const, samples: 0 }));
    result.groups = [...result.groups, ...missing].slice(0, 100);
    result.status = overallState(result.groups);
  }
}
