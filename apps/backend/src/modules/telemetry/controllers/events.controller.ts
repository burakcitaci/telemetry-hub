import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { CentralLoggerService } from '../../../common/logger/central-logger.service';
import { ClickhouseService } from '../services/clickhouse.service';

@Controller('api/events')
export class EventsController {
  private lastCheckTime: Date = new Date();

  constructor(
    private readonly clickhouse: ClickhouseService,
    private readonly logger: CentralLoggerService,
  ) {}

  @Get('stream')
  async stream(@Res() res: Response) {
    const connectionStartTime = Date.now();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.logger.logWithAttributes(
      'Client connected to SSE stream',
      'INFO',
      {
        endpoint: '/api/events/stream',
        userAgent: res.req.headers['user-agent'] as string,
      },
      'EventsController',
    );

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

          this.logger.logWithAttributes(
            'SSE update sent',
            'DEBUG',
            {
              traceCount: traces.length,
              logCount: logs.length,
            },
            'EventsController',
          );
        }

        this.lastCheckTime = now;
      } catch (error) {
        this.logger.error(
          `Error fetching updates: ${error.message}`,
          error.stack,
          'EventsController',
        );
      }
    }, 3000);

    res.on('close', () => {
      clearInterval(interval);
      const connectionDuration = Date.now() - connectionStartTime;

      this.logger.logWithAttributes(
        'Client disconnected from SSE stream',
        'INFO',
        {
          endpoint: '/api/events/stream',
          connectionDuration: `${connectionDuration}ms`,
        },
        'EventsController',
      );

      res.end();
    });
  }
}
