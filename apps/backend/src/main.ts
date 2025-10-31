import "reflect-metadata";
// Initialize OpenTelemetry tracing BEFORE anything else
import "./tracing";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "./common/pipes/validation.pipe";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ValidationExceptionFilter } from "./common/filters/validation-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { LoggerMiddleware } from "./common/middleware/logger.middleware";
import { CentralLoggerService } from './common/logger/central-logger.service';
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(CentralLoggerService);

  // Set the central logger as the NestJS logger
  app.useLogger(logger);

  console.log('DEBUG: Logger injected and set as NestJS logger');

  // Middleware
  app.use(new LoggerMiddleware(logger).use);

  // Global pipes
  app.useGlobalPipes(new ValidationPipe());

  // Global filters
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new ValidationExceptionFilter(),
  );

  // Global interceptors
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(logger),
  );

  // CORS
  app.enableCors(configService.get("cors"));

  const port = configService.get("app.port") || 3001;
  const host = configService.get("app.host") || "0.0.0.0";
  
  // Emit logs immediately to verify pipeline
  logger.log('Bootstrap: App configuration starting', 'Bootstrap');
  
  await app.listen(port, host);
  
  logger.log(`Backend API is running on ${host}:${port}`, 'Bootstrap');
  logger.log(
    `Environment: ${configService.get('app.nodeEnv')}`,
    'Bootstrap',
  );
  
  console.log('DEBUG: Bootstrap logs emitted - check ClickHouse otel_logs table');
}

bootstrap();
