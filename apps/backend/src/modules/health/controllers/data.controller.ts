import { Controller, Get } from '@nestjs/common';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import { DataService } from '../services/data.service';
import { trace, context } from '@opentelemetry/api';
import { meterProvider } from '../../../tracing';

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

  @Get('metrics')
  async getMetrics() {


    const meter = meterProvider.getMeter('my-app', '1.0.0');

    // Counter example
    const requestCounter = meter.createCounter('http.requests', {
      description: 'Total HTTP requests',
      unit: '1',
    });
    requestCounter.add(1, { method: 'GET', status: '200' });

    // Histogram example
    const responseTime = meter.createHistogram('http.response_time', {
      description: 'HTTP response time',
      unit: 'ms',
    });
    responseTime.record(42, { method: 'GET' });

    // Gauge example (async)
    meter.createObservableGauge('memory.usage', {
      description: 'Process memory usage',
      unit: 'bytes',
    }).addCallback((result) => {
      result.observe(process.memoryUsage().heapUsed);
    });
  }
}
