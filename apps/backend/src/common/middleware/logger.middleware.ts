import { Request, Response, NextFunction } from 'express';
import type { CentralLoggerService } from '../logger/central-logger.service';
import { runTelemetryContext, type TelemetryContext } from '../telemetry/tenant-context';

export class LoggerMiddleware {
  constructor(private readonly logger: CentralLoggerService) {}

  use = (req: Request, res: Response, next: NextFunction) => {
    const state: TelemetryContext = {};
    runTelemetryContext(state, () => {
    const { method, originalUrl, ip } = req;

    res.on('finish', () => runTelemetryContext(state, () => {
      const { statusCode } = res;
      this.logger.logWithAttributes(
        'HTTP Request',
        'INFO',
        {
          method,
          url: originalUrl,
          status: statusCode,
          ip,
        },
        'LoggerMiddleware',
      );
    }));

    next();
    });
  }
}
