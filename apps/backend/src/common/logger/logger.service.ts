import { Injectable, LoggerService } from "@nestjs/common";
import { Logger } from "@nestjs/common";

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly logger = new Logger();

  log(message: any, context?: string) {
    this.logger.log(message, context);
  }

  error(message: any, trace?: string,context?: string) {
    this.logger.error(message, trace, context);
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, context);
  }

  debug(message: any, context?:string) {
    this.logger.debug(message, context);
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, context);
  }
}
