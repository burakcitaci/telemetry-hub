import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/shared/api/client';
import { useConfirmAction } from '@/shared/components/confirm-action';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { FeatureContent } from '@/shared/components/feature-layout';
import {
  ActionFeedback,
  AdminFormActions,
  AdminFormSheet,
  AdminHeader,
  AdminTable,
} from './admin-layout';
import { LABEL, type Team } from './presentation';
import { useAdminAction, useAdminList } from './use-admin-data';

export function TeamsPanel() {
  const { t } = useTranslation();
  const { refreshSession } = useAuth();
  const teams = useAdminList<Team>('/admin/teams');
  const action = useAdminAction(t('admin.actionFailed'));
  const { confirmAction, confirmation } = useConfirmAction();
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const closeForm = () => {
    setTrigger(null);
    action.clearError();
  };

  async function addTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action.execute(async () => {
      await api.post('/admin/teams', { id: data.get('id'), name: data.get('name') });
      await Promise.all([teams.reload(), refreshSession()]).finally(closeForm);
    });
  }

  async function removeTeam(team: Team) {
    if (!(await confirmAction(t('admin.confirmDeleteTeam', { name: team.name })))) return;
    await action.execute(async () => {
      await api.delete(`/admin/teams/${encodeURIComponent(team.id)}`);
      await Promise.all([teams.reload(), refreshSession()]);
    });
  }

  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: 'name',
      size: 220,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.teamName')} />,
      cell: ({ row }) => (
        <span className="block truncate font-medium" title={row.original.name}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'id',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.teamSlug')} />,
      cell: ({ row }) => (
        <span className="block truncate font-mono text-muted-foreground" title={row.original.id}>
          {row.original.id}
        </span>
      ),
    },
    {
      id: 'actions',
      size: 110,
      header: () => <span className="sr-only">{t('admin.actions')}</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive"
            disabled={action.busy}
            onClick={() => void removeTeam(row.original)}
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
        title={t('admin.teams')}
        description={t('admin.manageTeamsHelp')}
        action={t('admin.createTeam')}
        disabled={action.busy || !teams.rows}
        onAction={(button) => {
          action.clearError();
          setTrigger(button);
        }}
      />
      <FeatureContent>
        {!trigger && <ActionFeedback error={action.error} saved={action.saved} />}
        <AdminTable
          {...teams}
          columns={columns}
          searchPlaceholder={t('admin.searchTeams')}
          emptyLabel={t('admin.noTeams')}
        />
      </FeatureContent>
      <AdminFormSheet
        title={t('admin.createTeam')}
        description={t('admin.manageTeamsHelp')}
        open={!!trigger}
        busy={action.busy}
        error={action.error}
        onClose={closeForm}
        returnFocus={trigger}
      >
        <form onSubmit={(event) => void addTeam(event)}>
          <fieldset disabled={action.busy} className="grid min-w-0 gap-4">
            <label className="grid gap-1.5">
              <span className={LABEL}>{t('admin.teamSlug')}</span>
              <Input
                name="id"
                required
                pattern="[a-z0-9][a-z0-9._\-]{0,63}"
                maxLength={64}
                placeholder="platform"
              />
            </label>
            <label className="grid gap-1.5">
              <span className={LABEL}>{t('admin.teamName')}</span>
              <Input name="name" required maxLength={100} placeholder="Platform Engineering" />
            </label>
            <AdminFormActions
              label={t('admin.createTeam')}
              busy={action.busy}
              onClose={closeForm}
            />
          </fieldset>
        </form>
      </AdminFormSheet>
      {confirmation}
    </>
  );
}
