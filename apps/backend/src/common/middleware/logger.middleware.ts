import { Request, Response, NextFunction } from 'express';
import { CentralLoggerService } from '../logger/central-logger.service';

export class LoggerMiddleware {
  constructor(private readonly logger: CentralLoggerService) {}

  use = (req: Request, res: Response, next: NextFunction) => {
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
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
    });

    next();
  }
}
