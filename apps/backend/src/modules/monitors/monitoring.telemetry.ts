import { metrics, trace, SpanStatusCode, type Meter, type Tracer } from '@opentelemetry/api';
import { logs, SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { performance } from 'node:perf_hooks';
import { recordTelemetrySpanScope, runTelemetryContext } from '../../common/telemetry/tenant-context';
import type { AlertEvent, Monitor } from './monitor.model';
import type { EvaluationOutcome, MonitorObserver } from './monitor-observer';

export class MonitoringTelemetry implements MonitorObserver {
  private readonly duration; private readonly evaluations; private readonly errors;
  private readonly alerts; private readonly deliveries; private readonly cycleDuration;

  constructor(meter: Meter = metrics.getMeter('monitoring'), private readonly logger: Logger = logs.getLogger('monitoring'),
    private readonly tracer: Tracer = trace.getTracer('monitoring'), private readonly now = () => performance.now()) {
    this.duration = meter.createHistogram('monitoring.evaluation.duration', { unit: 's' });
    this.cycleDuration = meter.createHistogram('monitoring.cycle.duration', { unit: 's' });
    this.evaluations = meter.createCounter('monitoring.evaluations');
    this.errors = meter.createCounter('monitoring.evaluation.errors');
    this.alerts = meter.createCounter('monitoring.alerts');
    this.deliveries = meter.createCounter('monitoring.notifications');
  }

  run<T>(org: string, monitor: Monitor, action: () => Promise<T>): Promise<T> {
    const scope = { tenantSlug: org, role: 'admin' as const, teamId: monitor.team_id };
    return runTelemetryContext({ scope }, () => this.tracer.startActiveSpan('monitor.evaluate', async span => {
      const started = this.now(); recordTelemetrySpanScope(span, scope);
      span.setAttributes({ 'monitor.id': monitor.id, 'monitor.signal_type': monitor.signal_type });
      try { return await action(); }
      catch (error) {
        this.evaluated(monitor, 'ERROR'); span.setStatus({ code: SpanStatusCode.ERROR }); throw error;
      } finally { this.duration.record(this.elapsed(started), { signal_type: monitor.signal_type }); span.end(); }
    }));
  }

  evaluated(monitor: Monitor, outcome: EvaluationOutcome): void {
    const attributes = { signal_type: monitor.signal_type, outcome };
    this.evaluations.add(1, attributes);
    if (outcome === 'ERROR') this.errors.add(1, { signal_type: monitor.signal_type });
    if (outcome === 'ERROR' || outcome === 'NO_DATA') this.logger.emit({
      severityNumber: outcome === 'ERROR' ? SeverityNumber.ERROR : SeverityNumber.WARN,
      body: 'monitor.evaluation_unavailable', attributes: { 'monitor.id': monitor.id, ...attributes },
    });
    if (outcome === 'ERROR') trace.getActiveSpan()?.setStatus({ code: SpanStatusCode.ERROR });
  }

  transition(event: AlertEvent): void {
    this.alerts.add(1, { signal_type: event.signal_type, state: event.state });
    this.logger.emit({ severityNumber: SeverityNumber.INFO, body: 'monitor.transition', attributes: {
      'monitor.id': event.monitor_id, 'event.id': event.id, state: event.state, estimated: event.estimated,
    } });
  }

  notification(event: AlertEvent, status: 'SENT' | 'FAILED'): void {
    this.deliveries.add(1, { signal_type: event.signal_type, status });
    this.logger.emit({ severityNumber: status === 'FAILED' ? SeverityNumber.ERROR : SeverityNumber.INFO,
      body: 'monitor.notification', attributes: { 'monitor.id': event.monitor_id, 'event.id': event.id, status } });
  }

  cycle(started: number): void { this.cycleDuration.record(this.elapsed(started)); }
  private elapsed(started: number): number { return Math.max(0, this.now() - started) / 1000; }
}
