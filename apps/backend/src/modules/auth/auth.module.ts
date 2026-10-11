import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantJwtGuard } from './tenant-jwt.guard';
import { PlatformStore } from './platform-store.service';
import { AdminController } from './admin.controller';
import { AdminService, OrgAdminGuard } from './admin.service';
import { MonitorsController } from './monitors.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('AUTH_JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('AUTH_JWT_SECRET must contain at least 32 characters.');
        }
        return {
          secret,
          signOptions: { expiresIn: '8h', algorithm: 'HS256' as const },
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController, AdminController, MonitorsController],
  providers: [PlatformStore, AuthService, TenantJwtGuard, AdminService, OrgAdminGuard],
  exports: [JwtModule, TenantJwtGuard, PlatformStore],
})
export class AuthModule {}
