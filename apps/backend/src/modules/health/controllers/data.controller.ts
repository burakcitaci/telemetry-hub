import { Controller, Get } from '@nestjs/common';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import { DataService } from '../services/data.service';
import { trace, context, metrics } from '@opentelemetry/api';

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
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly logger: CentralLoggerService,
  ) { }

  @Get('data')
  async getData() {
    const tracer = trace.getTracer('backend-service');
    const span = tracer.startSpan('getData');

    try {
      this.logger.log('Processing data request', 'HealthDataController');

      this.logger.log('Fetching data from DataService', process.env.OTEL_SERVICE_NAME);
      const activeContext = trace.setSpan(context.active(), span);

      return await context.with(activeContext, async () => {
        const data = await this.dataService.fetchData();
        const processed = await this.dataService.processData(data);

        span.addEvent('Data processed successfully', {
          recordCount: processed.items.length,
        });

        this.logger.log(
          `Request completed with ${processed.items.length} items`,
          'HealthDataController',
        );

        return processed;
      });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      this.logger.error(
        'Error processing request',
        error.stack,
        'HealthDataController',
      );
      throw error;
    } finally {
      span.end();
    }
  }

  @Get('data/metrics')
  async getMetrics() {
    // Simulate a bit of work so the histogram records varying values
    const started = Date.now();
    const jitter = Math.random() * 200; // 0..200ms
    await new Promise((r) => setTimeout(r, Math.min(jitter, 30))); // don't sleep too long
    const durationMs = Date.now() - started + jitter;

    const failed = Math.random() < 0.05; // 5% error rate
    const status = failed ? 500 : 200;

    requestCounter.add(1, { method: 'GET', status: String(status) });
    responseTime.record(durationMs, { method: 'GET' });

    return {
      ok: !failed,
      status,
      durationMs: Math.round(durationMs * 100) / 100,
    };
  }
}
