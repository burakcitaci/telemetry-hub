import { Controller, Get, UseGuards } from '@nestjs/common';
import { TenantJwtGuard } from '../../auth/tenant-jwt.guard';
import { Tenant } from '../../auth/tenant-request.decorator';
import type { TenantScope } from '../../auth/auth.types';
import { TenantTelemetryService } from '../services/tenant-telemetry.service';
import { tenantAttributes } from '../../../common/telemetry/tenant-metrics';
import { flushMetrics } from '../../../tracing';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import { DataService } from '../services/data.service';
import { trace, context, metrics, SpanStatusCode } from '@opentelemetry/api';

// ── Metrics instruments (created once) ───────────────────────────────────────
const meter = metrics.getMeter('my-app', '1.0.0');

const requestCounter = meter.createCounter('http.requests', {
  description: 'Total HTTP requests',
  unit: '1',
});

const responseTime = meter.createHistogram('http.test_time', {
  description: 'HTTP response time',
  unit: 'ms',
});

meter.createObservableGauge('memory.usage', {
  description: 'Process memory usage',
  unit: 'bytes',
}).addCallback((result) => {
  result.observe(process.memoryUsage().heapUsed);
});

@Controller('api')
@UseGuards(TenantJwtGuard)
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly logger: CentralLoggerService,
    private readonly tenantTelemetry: TenantTelemetryService,
  ) { }

  @Get('data')
  async getData(@Tenant() tenant: TenantScope) {
    const tracer = trace.getTracer(process.env.BACKEND_SERVICE_NAME);
    const span = tracer.startSpan('getData');

    try {
      this.logger.log('Processing data request', 'HealthDataController');
      this.logger.log('Fetching data from DataService', process.env.OTEL_SERVICE_NAME);

      const activeContext = trace.setSpan(context.active(), span);

      return await context.with(activeContext, async () => {
        const data = await this.dataService.fetchData();
        const processed = await this.dataService.processData(data);
        await this.tenantTelemetry.generate(tenant);

        span.addEvent('Data processed successfully', {
          recordCount: processed.items.length,
        });

        // ✅ Explicit success status
        span.setStatus({ code: SpanStatusCode.OK });

        this.logger.log(
          `Request completed with ${processed.items.length} items`,
          'HealthDataController',
        );

        return processed;
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      span.recordException(err);                    // records type, message, stack
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });

      this.logger.error('Error processing request', err.stack, 'HealthDataController');
      throw err;
    } finally {
      span.end();
    }
  }

  @Get('data/metrics')
  async getMetrics(@Tenant() tenant: TenantScope) {
    // Simulate a bit of work so the histogram records varying values
    const started = Date.now();
    const jitter = Math.random() * 200; // 0..200ms
    await new Promise((r) => setTimeout(r, Math.min(jitter, 30))); // don't sleep too long
    const durationMs = Date.now() - started + jitter;

    const failed = Math.random() < 0.05; // 5% error rate
    const status = failed ? 500 : 200;

    const attributes = { ...tenantAttributes(tenant), method: 'GET', status: String(status) };
    requestCounter.add(1, attributes);
    responseTime.record(durationMs, attributes);
    await flushMetrics();

    return {
      ok: !failed,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
    };
  }
}
