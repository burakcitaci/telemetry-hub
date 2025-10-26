import './tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: [
      'http://localhost:5000',
      'http://localhost:5001',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:4173',
      'http://localhost:8080',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`Backend API is running on port ${port}`);
}

bootstrap();
