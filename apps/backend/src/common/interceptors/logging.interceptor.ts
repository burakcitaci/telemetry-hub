import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { CentralLoggerService } from '../logger/central-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CentralLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body } = request;

    this.logger.logWithAttributes(
      'Incoming request',
      'DEBUG',
      {
        method,
        url,
        ip,
        hasBody: !!body,
      },
      'LoggingInterceptor',
    );

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const responseTime = Date.now() - startTime;
        this.logger.logWithAttributes(
          'Request completed',
          'DEBUG',
          {
            method,
            url,
            status: response.statusCode,
            duration: `${responseTime}ms`,
          },
          'LoggingInterceptor',
        );
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        this.logger.error(
          `Request failed: ${method} ${url}`,
          error.stack,
          'LoggingInterceptor',
        );
        this.logger.logWithAttributes(
          'Request failed',
          'ERROR',
          {
            method,
            url,
            duration: `${responseTime}ms`,
            error: error.message,
          },
          'LoggingInterceptor',
        );
        throw error;
      }),
    );
  }
}
