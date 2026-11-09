import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, type UserRole } from '@/features/auth/auth-context';
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
import { FIELD, LABEL, type Team } from './presentation';
import { useAdminAction, useAdminList } from './use-admin-data';

interface User {
  id: string;
  email: string;
  role: UserRole;
  teamId?: string;
}

interface UserFormProps {
  user?: User;
  teams: Team[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

function UserForm({ user, teams, busy, onSubmit, onClose }: UserFormProps) {
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
          <select name="teamId" defaultValue={user?.teamId ?? ''} className={`${FIELD} h-9 px-2`}>
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
  const users = useAdminList<User>('/admin/users');
  const teams = useAdminList<Team>('/admin/teams');
  const action = useAdminAction(t('admin.actionFailed'));
  const { confirmAction, confirmation } = useConfirmAction();
  const [editor, setEditor] = useState<{ user?: User; trigger: HTMLButtonElement }>();
  const title = t(editor?.user ? 'admin.editUser' : 'admin.createUser');
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
      await Promise.all([users.reload(), refreshSession()]).finally(closeEditor);
    });
  }

  async function removeUser(user: User) {
    if (!(await confirmAction(t('admin.confirmDeleteUser', { email: user.email })))) return;
    await action.execute(async () => {
      await api.delete(`/admin/users/${encodeURIComponent(user.id)}`);
      await Promise.all([users.reload(), refreshSession()]);
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
      />
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
          columns={columns}
          searchPlaceholder={t('admin.searchUsers')}
          emptyLabel={t('admin.noUsers')}
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
        {editor && (
          <UserForm
            user={editor.user}
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
