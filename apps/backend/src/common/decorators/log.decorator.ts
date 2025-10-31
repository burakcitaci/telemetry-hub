import { createParamDecorator, ExecutionContext, Inject } from '@nestjs/common';
import { CentralLoggerService } from '../logger/central-logger.service';

/**
 * @Log() decorator - Injects CentralLoggerService into controller methods
 * Usage:
 *   @Get()
 *   getData(@Log() logger: CentralLoggerService) {
 *     logger.log('Message', 'ClassName');
 *   }
 *
 * Note: This decorator is optional as dependency injection is the preferred method.
 * You can also inject directly in the controller constructor.
 */
export const Log = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Get the logger from the request context if available
    // For proper usage, inject CentralLoggerService directly in the controller/service constructor
    return request.loggerService || null;
  },
);
