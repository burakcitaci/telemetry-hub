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
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Middleware
  app.use(new LoggerMiddleware().use);

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
    new LoggingInterceptor(),
  );

  // CORS
  app.enableCors(configService.get("cors"));

  const port = configService.get("app.port") || 3001;
  const host = configService.get("app.host") || "0.0.0.0";
  
  await app.listen(port, host);
  
  console.log(`Backend API is running on ${host}:${port}`);
  console.log(`Environment: ${configService.get("app.nodeEnv")}`);
}

bootstrap();
