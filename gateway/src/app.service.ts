import { Injectable, Logger } from '@nestjs/common';
import { trace, context } from '@opentelemetry/api';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  async fetchData(): Promise<any[]> {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('fetchData', {
      attributes: { 'operation.type': 'database' },
    });

    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        await this.simulateDelay(50, 150);
        
        const data = [
          { id: 1, name: 'Item 1', category: 'electronics' },
          { id: 2, name: 'Item 2', category: 'books' },
          { id: 3, name: 'Item 3', category: 'clothing' },
          { id: 4, name: 'Item 4', category: 'electronics' },
          { id: 5, name: 'Item 5', category: 'food' },
        ];

        span.setAttribute('data.count', data.length);
        this.logger.debug(`Fetched ${data.length} items`);
        
        return data;
      });
    } finally {
      span.end();
    }
  }

  async processData(data: any[]): Promise<any> {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('processData', {
      attributes: { 'operation.type': 'transformation' },
    });

    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        await this.simulateDelay(30, 100);
        
        const enrichedData = await this.enrichData(data);
        
        const result = {
          timestamp: new Date().toISOString(),
          items: enrichedData,
          summary: {
            total: enrichedData.length,
            categories: [...new Set(enrichedData.map(item => item.category))],
          },
        };

        span.setAttribute('processed.count', result.items.length);
        this.logger.debug(`Processed ${result.items.length} items`);
        
        return result;
      });
    } finally {
      span.end();
    }
  }

  private async enrichData(data: any[]): Promise<any[]> {
    const tracer = trace.getTracer('gateway-service');
    const span = tracer.startSpan('enrichData');

    try {
      return await context.with(trace.setSpan(context.active(), span), async () => {
        await this.simulateDelay(20, 80);
        
        return data.map(item => ({
          ...item,
          enriched: true,
          timestamp: new Date().toISOString(),
          price: Math.floor(Math.random() * 1000) + 10,
        }));
      });
    } finally {
      span.end();
    }
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
