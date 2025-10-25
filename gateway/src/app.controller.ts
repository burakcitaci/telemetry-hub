import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { trace, context } from '@opentelemetry/api';

@Controller('api')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get('data')
  async getData() {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('getData');

    try {
      this.logger.log('Processing data request');
      
      const activeContext = trace.setSpan(context.active(), span);
      
      return await context.with(activeContext, async () => {
        const data = await this.appService.fetchData();
        const processed = await this.appService.processData(data);
        
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
    return { status: 'ok', service: 'gateway' };
  }
}
