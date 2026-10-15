import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { MonitorsController } from '../auth/monitors.controller';
import { MonitorEvaluatorService } from './monitor-evaluator.service';
import { MonitorQueryService } from './monitor-query.service';
import { PlatformStore } from '../auth/platform-store.service';
import { ClickhouseService } from '../telemetry/services/clickhouse.service';
import { SignalRegistry } from './signal-registry';
import { SignalEvaluator, SIGNAL_EVALUATOR } from './signal-evaluator';
import { DummyNotifier } from './dummy-notifier';
import { LogAdapter } from './adapters/log.adapter';
import { MetricAdapter } from './adapters/metric.adapter';
import { TraceAdapter } from './adapters/trace.adapter';
import { MonitoringService } from './monitoring.service';
import { AlertsController } from './alerts.controller';
import { AlertRetentionService } from './alert-retention.service';
import type { SignalAdapter, SignalType } from './signal-adapter';

export const signalProviders = [
  { provide: SignalRegistry, inject: [ClickhouseService], useFactory: (clickhouse: ClickhouseService) =>
    new SignalRegistry(new Map<SignalType, SignalAdapter>([['LOG', new LogAdapter(clickhouse)], ['METRIC', new MetricAdapter(clickhouse)], ['TRACE', new TraceAdapter(clickhouse)]])) },
  { provide: SIGNAL_EVALUATOR, inject: [PlatformStore, SignalRegistry], useFactory: (store: PlatformStore, adapters: SignalRegistry) =>
    new SignalEvaluator(store.monitorRepository, adapters, new DummyNotifier(), { now: () => new Date() }) },
];

@Module({ imports: [AuthModule, TelemetryModule], controllers: [MonitorsController, AlertsController],
  providers: [MonitorQueryService, MonitorEvaluatorService, MonitoringService, AlertRetentionService, ...signalProviders], exports: [MonitorEvaluatorService] })
export class MonitorsModule {}
