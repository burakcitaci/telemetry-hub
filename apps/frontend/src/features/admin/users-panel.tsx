import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/shared/api/client';
import { useConfirmAction } from '@/shared/components/confirm-action';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { FeatureContent } from '@/shared/components/feature-layout';
import { QueryError } from '@/shared/components/view-skeleton';
import {
  ActionFeedback,
  AdminFormActions,
  AdminFormSheet,
  AdminHeader,
  AdminTable,
} from './admin-layout';
import { FIELD, LABEL, type Team, type User } from './presentation';
import { useAdminAction, useAdminList } from './use-admin-data';

interface UserFormProps {
  user?: User;
  defaultTeam?: string;
  teams: Team[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

function UserForm({ user, defaultTeam, teams, busy, onSubmit, onClose }: UserFormProps) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit}>
      <fieldset className="grid min-w-0 gap-4" disabled={busy}>
        <label className="grid gap-1.5">
          <span className={LABEL}>{t('auth.email')}</span>
          <Input
            name="email"
            type="email"
            required
            readOnly={!!user}
            defaultValue={user?.email}
            maxLength={254}
            autoComplete="off"
          />
        </label>
        <label className="grid gap-1.5">
          <span className={LABEL}>{t(user ? 'admin.newPassword' : 'admin.password')}</span>
          <Input
            name="password"
            type="password"
            required={!user}
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
          <span className="text-xs text-muted-foreground">{t('admin.passwordHelp')}</span>
        </label>
        <label className="grid gap-1.5">
          <span className={LABEL}>{t('admin.role')}</span>
          <select name="role" defaultValue={user?.role ?? 'user'} className={`${FIELD} h-9 px-2`}>
            <option value="user">{t('admin.member')}</option>
            <option value="admin">{t('admin.orgAdmin')}</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className={LABEL}>{t('admin.teamMembership')}</span>
          <select name="teamId" defaultValue={user ? user.teamId ?? '' : defaultTeam ?? ''} className={`${FIELD} h-9 px-2`}>
            <option value="">{t('admin.noTeam')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <AdminFormActions
          label={t(user ? 'admin.save' : 'admin.createUser')}
          busy={busy}
          onClose={onClose}
        />
      </fieldset>
    </form>
  );
}

export function UsersPanel() {
  const { t } = useTranslation();
  const { refreshSession } = useAuth();
  const [params, setParams] = useSearchParams();
  const users = useAdminList<User>('/admin/users');
  const teams = useAdminList<Team>('/admin/teams');
  const action = useAdminAction(t('admin.actionFailed'));
  const { confirmAction, confirmation } = useConfirmAction();
  const [editor, setEditor] = useState<{ user?: User; assignTo?: Team; trigger: HTMLButtonElement }>();
  const teamId = params.get('teamId') ?? '';
  const selectedTeam = teams.rows?.find(team => team.id === teamId);
  const activeFilter = teamId === '_unassigned' || selectedTeam ? teamId : '';
  const members = activeFilter ? users.rows?.filter(user => (user.teamId ?? '_unassigned') === activeFilter) : users.rows;
  const eligible = users.rows?.filter(user => user.teamId !== teamId) ?? [];
  const title = t(editor?.assignTo ? 'admin.assignExisting' : editor?.user ? 'admin.editUser' : 'admin.createUser');
  const closeEditor = () => {
    setEditor(undefined);
    action.clearError();
  };

  function openEditor(trigger: HTMLButtonElement, user?: User) {
    action.clearError();
    setEditor({ trigger, user });
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const teamId = String(data.get('teamId') || '');
    const password = String(data.get('password') || '');
    const role = String(data.get('role'));
    const user = editor?.user;
    await action.execute(async () => {
      if (user) {
        await api.patch(`/admin/users/${encodeURIComponent(user.id)}`, {
          role,
          teamId,
          password: password || undefined,
        });
      } else {
        await api.post('/admin/users', {
          email: String(data.get('email')),
          role,
          teamId: teamId || undefined,
          password,
        });
      }
      closeEditor();
      await Promise.allSettled([users.reload(), refreshSession()]);
    });
  }

  async function assignUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = String(new FormData(event.currentTarget).get('userId') ?? '');
    const team = editor?.assignTo;
    if (!team || !id) return;
    await action.execute(async () => {
      await api.patch('/admin/users/' + encodeURIComponent(id), { teamId: team.id });
      closeEditor();
      await Promise.allSettled([users.reload(), refreshSession()]);
    });
  }

  async function removeUser(user: User) {
    if (!(await confirmAction(t('admin.confirmDeleteUser', { email: user.email })))) return;
    await action.execute(async () => {
      await api.delete(`/admin/users/${encodeURIComponent(user.id)}`);
      await Promise.allSettled([users.reload(), refreshSession()]);
    });
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'email',
      size: 240,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('auth.email')} />,
      cell: ({ row }) => (
        <span className="block truncate font-medium" title={row.original.email}>
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'role',
      size: 110,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.role')} />,
      cell: ({ row }) => (
        <Badge variant={row.original.role === 'admin' ? 'secondary' : 'outline'}>
          {t(row.original.role === 'admin' ? 'admin.orgAdmin' : 'admin.member')}
        </Badge>
      ),
    },
    {
      accessorKey: 'teamId',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.team')} />,
      cell: ({ row }) => {
        const name =
          teams.rows?.find((team) => team.id === row.original.teamId)?.name ?? row.original.teamId;
        return (
          <span className="block truncate" title={name}>
            {name ?? '—'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      size: 160,
      header: () => <span className="sr-only">{t('admin.actions')}</span>,
      enableHiding: false,
      cell: ({ row: { original: user } }) => (
        <div className="flex justify-end">
          <Button
            id={`edit-user-${user.id}`}
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={action.busy || !teams.rows}
            onClick={(event) => openEditor(event.currentTarget, user)}
          >
            {t('admin.edit')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            disabled={action.busy}
            onClick={() => void removeUser(user)}
          >
            {t('admin.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminHeader
        title={t('admin.users')}
        description={t('admin.manageUsersHelp')}
        action={t('admin.createUser')}
        disabled={action.busy || !users.rows || !teams.rows}
        onAction={openEditor}
      >
        <label className="inline-flex items-center gap-2 text-sm">
          {t('admin.filterTeam')}
          <select className={FIELD + ' h-8 px-2'} value={activeFilter} disabled={!teams.rows} onChange={event => {
            const next = new URLSearchParams(params);
            if (event.target.value) next.set('teamId', event.target.value); else next.delete('teamId');
            setParams(next);
          }}>
            <option value="">{t('admin.allTeams')}</option>
            <option value="_unassigned">{t('admin.noTeam')}</option>
            {teams.rows?.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        {selectedTeam && <Button size="sm" variant="outline" disabled={action.busy || !eligible.length}
          onClick={event => { action.clearError(); setEditor({ trigger: event.currentTarget, assignTo: selectedTeam }); }}>
          {t('admin.assignExisting')}
        </Button>}
      </AdminHeader>
      <FeatureContent>
        {!editor && <ActionFeedback error={action.error} saved={action.saved} />}
        {teams.error && (
          <QueryError
            title={t('admin.loadTeamsFailed')}
            message={teams.error}
            onRetry={teams.reload}
            isRetrying={teams.loading}
          />
        )}
        <AdminTable
          {...users}
          rows={members}
          columns={columns}
          searchPlaceholder={t('admin.searchUsers')}
          emptyLabel={t(activeFilter ? 'admin.noMatchingMembers' : 'admin.noUsers')}
        />
      </FeatureContent>
      <AdminFormSheet
        title={title}
        description={t('admin.manageUsersHelp')}
        open={!!editor}
        busy={action.busy}
        error={action.error}
        onClose={closeEditor}
        returnFocus={editor?.trigger ?? null}
      >
        {editor?.assignTo ? <AssignUserForm team={editor.assignTo} users={eligible} busy={action.busy}
          onSubmit={event => void assignUser(event)} onClose={closeEditor} /> : editor && (
          <UserForm
            user={editor.user}
            defaultTeam={selectedTeam?.id}
            teams={teams.rows ?? []}
            busy={action.busy}
            onSubmit={(event) => void saveUser(event)}
            onClose={closeEditor}
          />
        )}
      </AdminFormSheet>
      {confirmation}
    </>
  );
}

function AssignUserForm({ team, users, busy, onSubmit, onClose }: Omit<UserFormProps, 'user' | 'teams'> & { team: Team; users: User[] }) {
  const { t } = useTranslation();
  return <form onSubmit={onSubmit}>
    <fieldset disabled={busy} className="grid gap-4">
      <p className="text-sm">{t('admin.assignHelp', { team: team.name })}</p>
      <label className="grid gap-1.5">
        <span className={LABEL}>{t('admin.users')}</span>
        <select required name="userId" defaultValue="" className={FIELD + ' h-9 px-2'}>
          <option value="" disabled>{t('admin.selectUser')}</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.email}</option>)}
        </select>
      </label>
      <AdminFormActions label={t('admin.assignExisting')} busy={busy} onClose={onClose} />
    </fieldset>
  </form>;
}
