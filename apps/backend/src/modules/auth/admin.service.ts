import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException,
  Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PlatformStore, type Identity } from './platform-store.service';
import type { TenantRequest } from './auth.types';
import type { CreateUserDto, UpdateUserDto } from './dto/admin.dto';
import { hashPassword } from './password';

@Injectable()
export class OrgAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (context.switchToHttp().getRequest<TenantRequest>().userRole !== 'admin') {
      throw new ForbiddenException('Organization administrator required.');
    }
    return true;
  }
}

@Injectable()
export class AdminService {
  constructor(private readonly store: PlatformStore) {}

  listUsers(org: string) { return this.store.users(org).map(user => this.publicUser(user)); }

  async createUser(org: string, dto: CreateUserDto) {
    this.assertTeam(org, dto.teamId);
    const passwordHash = await hashPassword(dto.password);
    // Recheck after asynchronous hashing (team might have been removed meanwhile).
    this.assertTeam(org, dto.teamId);
    const user: Identity = { id: randomUUID(), email: dto.email.trim().toLowerCase(),
      tenantSlug: org, role: dto.role, teamId: dto.teamId, passwordHash, version: 1 };
    this.store.createUser(user);
    return this.publicUser(user);
  }

  updateUser(org: string, id: string, dto: UpdateUserDto) {
    const user = this.requireUser(org, id);
    const teamId = dto.teamId === undefined ? user.teamId : dto.teamId || undefined;
    this.assertTeam(org, teamId);
    if ((dto.role ?? user.role) === user.role && teamId === user.teamId) return this.publicUser(user);
    const updated = { ...user, role: dto.role ?? user.role, teamId, version: user.version + 1 };
    this.store.updateUser(updated);
    return this.publicUser(updated);
  }

  async editUser(org: string, id: string, dto: UpdateUserDto) {
    if (!dto.password) return this.updateUser(org, id, dto);
    this.requireUser(org, id);
    const passwordHash = await hashPassword(dto.password);
    const user = this.requireUser(org, id);
    const teamId = dto.teamId === undefined ? user.teamId : dto.teamId || undefined;
    this.assertTeam(org, teamId);
    // One synchronous write: role/team/password cannot partially apply after revoking this caller.
    const updated = { ...user, role: dto.role ?? user.role, teamId, passwordHash, version: user.version + 1 };
    this.store.updateUser(updated);
    return this.publicUser(updated);
  }

  async resetPassword(org: string, id: string, password: string) {
    this.requireUser(org, id);
    const passwordHash = await hashPassword(password);
    const user = this.requireUser(org, id);
    this.store.updateUser({ ...user, passwordHash, version: user.version + 1 });
    return { success: true };
  }

  deleteUser(org: string, id: string) {
    this.requireUser(org, id);
    this.store.deleteUser(org, id);
    return { success: true };
  }

  assertTeam(org: string, teamId?: string) {
    if (teamId && !this.store.teams(org).some(team => team.id === teamId)) {
      throw new BadRequestException('Team does not belong to this organization.');
    }
  }

  private requireUser(org: string, id: string) {
    const user = this.store.user(org, id);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private publicUser(user: Identity) {
    return { id: user.id, email: user.email, role: user.role, teamId: user.teamId };
  }
}
