import { Controller, Get, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ClickhouseService } from './clickhouse.service';

@Controller('api/events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  private lastCheckTime: Date = new Date();

  constructor(private readonly clickhouse: ClickhouseService) {}

  @Get('stream')
  async stream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.logger.log('Client connected to SSE stream');

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent({ type: 'connected', message: 'SSE stream established' });

    const interval = setInterval(async () => {
      try {
        const now = new Date();
        const traces = await this.clickhouse.getRecentTraces(this.lastCheckTime);
        const logs = await this.clickhouse.getRecentLogs(this.lastCheckTime);

        if (traces.length > 0 || logs.length > 0) {
          sendEvent({
            type: 'update',
            timestamp: now.toISOString(),
            traces,
            logs,
          });
        }

        this.lastCheckTime = now;
      } catch (error) {
        this.logger.error('Error fetching updates', error);
      }
    }, 3000);

    res.on('close', () => {
      clearInterval(interval);
      this.logger.log('Client disconnected from SSE stream');
      res.end();
    });
  }
}
