import { registerAs } from "@nestjs/config";

export interface ValidationConfig {
  whitelist: boolean;
  forbidNonWhitelisted: boolean;
  transform: boolean;
  transformOptions: {
    enableImplicitConversion: boolean;
  };
}

export default registerAs("validation", (): ValidationConfig => ({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
