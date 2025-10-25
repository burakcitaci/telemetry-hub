import { Controller, Get, Logger } from '@nestjs/common';
import { DataService } from './data.service';
import { trace, context } from '@opentelemetry/api';

@Controller('api')
export class DataController {
  private readonly logger = new Logger(DataController.name);

  constructor(private readonly dataService: DataService) {}

  @Get('data')
  async getData() {
    const tracer = trace.getTracer('backend-service');
    const span = tracer.startSpan('getData');

    try {
      this.logger.log('Processing data request');
      
      const activeContext = trace.setSpan(context.active(), span);
      
      return await context.with(activeContext, async () => {
        const data = await this.dataService.fetchData();
        const processed = await this.dataService.processData(data);
        
        span.addEvent('Data processed successfully', {
          recordCount: processed.items.length,
        });
        
        this.logger.log(`Request completed with ${processed.items.length} items`);
        
        return processed;
      });
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      this.logger.error('Error processing request', error.stack);
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
