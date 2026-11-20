import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { Tenant } from '../auth/tenant-request.decorator';
import type { TenantScope } from '../auth/auth.types';
import { PlatformStore } from '../auth/platform-store.service';
import { AlertsQueryDto } from './dto/unified-monitor.dto';
import { AlertTriageDto } from './dto/monitor-operations.dto';
import type { AlertEvent, AlertTriage } from './monitor.model';

@ApiTags('monitors')
@Controller('api/alerts')
@UseGuards(TenantJwtGuard)
export class AlertsController {
  constructor(private readonly store: PlatformStore) {}

  @Get() list(@Tenant() scope: TenantScope, @Query() query: AlertsQueryDto) {
    if (query.monitor_id) this.store.monitorRepository.history.load(scope.tenantSlug, query.monitor_id);
    else this.store.monitorRepository.records(scope.tenantSlug);
    const page = this.store.monitorRepository.history.list(scope.tenantSlug, query);
    return { ...page, items: page.items.map(item => {
      if (!('triage' in item) || !item.triage) return item;
      const { triage, ...event } = item;
      return this.canManage(scope, item) ? { ...event, triage: { ...triage, notes: [] } } : event;
    }) };
  }

  @Get(':id/triage') details(@Tenant() scope: TenantScope, @Param('id') id: string) {
    const event = this.requireFiring(scope, id);
    return { triage: event.triage ?? { version: 0, notes: [] },
      self: scope.sub, assignees: this.assignees(scope, event) };
  }

  @Patch(':id/triage') triage(@Tenant() scope: TenantScope, @Param('id') id: string, @Body() dto: AlertTriageDto) {
    const event = this.requireFiring(scope, id);
    const current = event.triage ?? { version: 0, notes: [] };
    if (dto.version !== current.version) throw new ConflictException('Alert triage changed. Reload it and retry.');
    const actor = scope.sub && this.store.user(scope.tenantSlug, scope.sub);
    if (!actor) throw new ForbiddenException('An active user is required.');
    const next = this.apply(scope, event, current, dto, actor.email);
    if (!this.store.monitorRepository.history.updateTriage(scope.tenantSlug, id, dto.version, next))
      throw new ConflictException('Alert triage changed. Reload it and retry.');
    return next;
  }

  private requireFiring(scope: TenantScope, id: string) {
    const event = this.store.monitorRepository.history.event(scope.tenantSlug, id);
    if (!event || event.state !== 'FIRING') throw new NotFoundException('Firing alert not found.');
    if (!this.canManage(scope, event))
      throw new ForbiddenException('Only this team or an organization administrator can manage this alert.');
    return event;
  }

  private canManage(scope: TenantScope, event: AlertEvent) {
    return scope.role === 'admin' || !event.team_id || event.team_id === scope.teamId;
  }

  private assignees(scope: TenantScope, event: AlertEvent) {
    return this.store.users(scope.tenantSlug).filter(user =>
      (scope.role === 'admin' || user.id === scope.sub) &&
      (!event.team_id || user.teamId === event.team_id || user.role === 'admin'))
      .map(({ id, email }) => ({ id, email }));
  }

  private apply(scope: TenantScope, event: AlertEvent, current: AlertTriage, dto: AlertTriageDto, by: string): AlertTriage {
    const next = { ...current, version: current.version + 1 };
    const at = new Date().toISOString();
    if (dto.action === 'acknowledge') {
      next.acknowledgment ??= { by, at };
    } else if (dto.action === 'note') {
      const text = dto.note?.trim();
      if (!text) throw new BadRequestException('Enter a note.');
      if (next.notes.length >= 100) throw new ConflictException('This alert has reached its 100-note limit.');
      next.notes = [...next.notes, { by, at, text }];
    } else {
      if (dto.assignee_id === undefined) throw new BadRequestException('Choose an assignee or unassign.');
      if (scope.role !== 'admin' && current.assignee && current.assignee.id !== scope.sub)
        throw new ForbiddenException('This alert is already assigned to another user.');
      const assignee = this.assignees(scope, event).find(user => user.id === dto.assignee_id);
      if (dto.assignee_id && !assignee) throw new BadRequestException('Choose an eligible assignee.');
      if (assignee) next.assignee = assignee; else delete next.assignee;
    }
    return next;
  }
}
