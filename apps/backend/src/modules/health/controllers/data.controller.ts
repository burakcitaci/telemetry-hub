import { Controller, Get } from '@nestjs/common';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import { DataService } from '../services/data.service';
import { trace, context } from '@opentelemetry/api';

@Controller('api')
export class DataController {
  constructor(
    private readonly dataService: DataService,
    private readonly logger: CentralLoggerService,
  ) {}

  @Get('data')
  async getData() {
    const tracer = trace.getTracer('backend-service');
    const span = tracer.startSpan('getData');

    try {
      this.logger.log('Processing data request', 'HealthDataController');

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

  @Get('health')
  getHealth() {
    this.logger.log('Health check endpoint accessed', 'HealthDataController');
    return { status: 'ok', service: 'backend' };
  }
}
