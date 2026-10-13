import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../auth/admin.service';
import { InfrastructureController } from './infrastructure.controller';
import { InfrastructureService } from './infrastructure.service';
import { KubernetesService } from './kubernetes.service';

@Module({
  imports: [AuthModule],
  controllers: [InfrastructureController],
  providers: [InfrastructureService, KubernetesService, OrgAdminGuard],
})
export class InfrastructureModule {}
