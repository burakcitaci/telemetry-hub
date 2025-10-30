import { Controller, Get, Logger } from '@nestjs/common';
import { DataService } from './data.service';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

@Controller('api')
export class DataController {
  private readonly logger = new Logger(DataController.name);

  constructor(private readonly dataService: DataService) {}

@Get('data')
  async getData() {
    const tracer = trace.getTracer('backend-service');

    const span = tracer.startSpan('getData', { attributes: { 'operation.type': 'database' } }, context.active());
    try {
      const result = await context.with(trace.setSpan(context.active(), span), async () => {
        this.logger.log('Processing data request');

        const data = await this.dataService.fetchData();
        const processed = await this.dataService.processData(data);

        span.addEvent('Data processed successfully', {
          recordCount: processed.items.length,
        });

        return processed;
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'backend' };
  }
}
