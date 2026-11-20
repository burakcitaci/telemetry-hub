import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
import { platformFilterSearch } from '@/shared/lib/platform-filters';
import { LABEL, type Team, type User } from './presentation';
import { useAdminAction, useAdminList } from './use-admin-data';

export function TeamsPanel() {
  const { t } = useTranslation();
  const { refreshSession, session } = useAuth();
  const { search } = useLocation();
  const base = '/org/' + session?.tenantSlug;
  const users = useAdminList<User>('/admin/users');
  const teams = useAdminList<Team>('/admin/teams');
  const action = useAdminAction(t('admin.actionFailed'));
  const { confirmAction, confirmation } = useConfirmAction();
  const [editor, setEditor] = useState<{ trigger: HTMLButtonElement; team?: Team }>();
  const trigger = editor?.trigger ?? null;
  const closeForm = () => {
    setEditor(undefined);
    action.clearError();
  };

  async function saveTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await action.execute(async () => {
      const name = String(data.get('name') ?? '').trim();
      if (editor?.team) await api.patch('/admin/teams/' + encodeURIComponent(editor.team.id), { name });
      else await api.post('/admin/teams', { id: data.get('id'), name });
      closeForm();
      await Promise.allSettled([teams.reload(), refreshSession()]);
    });
  }

  async function removeTeam(team: Team) {
    if (!(await confirmAction(t('admin.confirmDeleteTeam', { name: team.name })))) return;
    await action.execute(async () => {
      await api.delete(`/admin/teams/${encodeURIComponent(team.id)}`);
      await Promise.allSettled([teams.reload(), refreshSession()]);
    });
  }

  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: 'name',
      size: 220,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.teamName')} />,
      cell: ({ row }) => (
        <Link className="block truncate font-medium underline-offset-4 hover:underline" title={row.original.name}
          to={base + "/admin/teams/" + encodeURIComponent(row.original.id)}>{row.original.name}</Link>
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
      id: 'members',
      size: 100,
      header: () => t('admin.members'),
      cell: ({ row }) => users.rows ? users.rows.filter(user => user.teamId === row.original.id).length : '—',
    },
    {
      id: 'actions',
      size: 330,
      header: () => <span className="sr-only">{t('admin.actions')}</span>,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link to={{ pathname: base + "/admin/users", search: teamSearch(search, "teamId", row.original.id) }}>{t("admin.manageMembers")}</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to={{ pathname: base + "/monitors", search: teamSearch(search, "team", row.original.id, true) }}>{t("admin.createTeamMonitor")}</Link>
          </Button>
          <Button size="sm" variant="ghost" id={"edit-team-" + row.original.id} disabled={action.busy}
            onClick={event => { action.clearError(); setEditor({ trigger: event.currentTarget, team: row.original }); }}>
            {t("admin.edit")}
          </Button>
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
          setEditor({ trigger: button });
        }}
      >
        <Button size="sm" variant="outline" asChild><Link to={base + '/admin/maintenance'}>Maintenance windows</Link></Button>
      </AdminHeader>
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
        title={t(editor?.team ? 'admin.editTeam' : 'admin.createTeam')}
        description={t('admin.manageTeamsHelp')}
        open={!!trigger}
        busy={action.busy}
        error={action.error}
        onClose={closeForm}
        returnFocus={trigger}
      >
        {editor && <form key={editor.team?.id ?? "new"} onSubmit={(event) => void saveTeam(event)}>
          <fieldset disabled={action.busy} className="grid min-w-0 gap-4">
            <TeamFields team={editor.team} />
            <AdminFormActions
              label={t(editor.team ? 'admin.save' : 'admin.createTeam')}
              busy={action.busy}
              onClose={closeForm}
            />
          </fieldset>
        </form>}
      </AdminFormSheet>
      {confirmation}
    </>
  );
}

function teamSearch(search: string, key: string, id: string, createMonitor = false) {
  const params = new URLSearchParams(platformFilterSearch(search));
  params.set(key, id);
  if (createMonitor) { params.set('new', '1'); params.delete('globalStatus'); }
  return '?' + params;
}

function teamSlug(name: string) {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64).replace(/-+$/, '');
}

function TeamFields({ team }: { team?: Team }) {
  const { t } = useTranslation();
  const [name, setName] = useState(team?.name ?? '');
  const [manualSlug, setManualSlug] = useState<string>();
  return <>
    <label className="grid gap-1.5">
      <span className={LABEL}>{t('admin.teamName')}</span>
      <Input name="name" required maxLength={100} placeholder="Platform Engineering"
        value={name} onChange={event => setName(event.target.value)} />
    </label>
    <label className="grid gap-1.5">
      <span className={LABEL}>{t('admin.teamSlug')}</span>
      <Input name="id" required readOnly={!!team} maxLength={64} pattern="(?!all$)[a-z0-9][a-z0-9._\-]{0,63}"
        value={team?.id ?? manualSlug ?? teamSlug(name)} onChange={event => setManualSlug(event.target.value)} />
      <span className="text-xs text-muted-foreground">{t('admin.teamSlugHelp')}</span>
    </label>
  </>;
}
