import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/auth-context';
import { api, unwrap } from '@/shared/api/client';
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

const DEFAULT_VALIDITY_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

interface IngestionKey {
  id: string;
  name: string;
  teamId: string;
  expiresAt: number;
  revokedAt?: number;
}

interface IngestionKeyFormProps {
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

function IngestionKeyForm({ busy, onSubmit, onClose }: IngestionKeyFormProps) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit}>
      <fieldset className="grid min-w-0 gap-4" disabled={busy}>
        <label className="grid gap-1.5">
          <span className={LABEL}>{t('admin.keyName')}</span>
          <Input name="name" required pattern=".*\S.*" maxLength={100} placeholder="orders-api" />
        </label>
        <label className="grid gap-1.5">
          <span className={LABEL}>{t('admin.validityDays')}</span>
          <Input
            name="expiresInDays"
            type="number"
            min={1}
            max={3650}
            defaultValue={DEFAULT_VALIDITY_DAYS}
            required
          />
        </label>
        <AdminFormActions label={t('admin.generateKey')} busy={busy} onClose={onClose} />
      </fieldset>
    </form>
  );
}

function GeneratedKey({ value, onDismiss }: { value: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  const [notice, setNotice] = useState('');

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(t('admin.keyCopied'));
    } catch {
      setNotice(t('admin.keyCopyFailed'));
    }
  }

  return (
    <section
      aria-labelledby="generated-key-title"
      className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4"
    >
      <h2 id="generated-key-title" className="font-semibold">
        {t('admin.generatedKey')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('admin.generatedKeyHelp')}</p>
      <Input readOnly value={value} aria-label={t('admin.generatedKey')} className="font-mono" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void copyKey()}>
          {t('admin.copyKey')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
          {t('admin.dismissKey')}
        </Button>
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </section>
  );
}

export function IngestionKeysPanel({
  createdKey,
  setCreatedKey,
}: {
  createdKey: string;
  setCreatedKey: (key: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { confirmAction, confirmation } = useConfirmAction();
  const keys = useAdminList<IngestionKey>('/admin/ingestion-keys');
  const teams = useAdminList<Team>('/admin/teams');
  const action = useAdminAction(t('admin.actionFailed'));
  const [selectedTeam, setSelectedTeam] = useState('');
  const availableTeams = teams.rows ?? [];
  const defaultTeam =
    availableTeams.length === 1
      ? availableTeams[0]
      : availableTeams.find((team) => team.id === session?.teamId);
  const teamId = availableTeams.find((team) => team.id === selectedTeam)?.id ?? defaultTeam?.id;
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const closeForm = () => {
    setTrigger(null);
    action.clearError();
  };

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teamId) return;
    const data = new FormData(event.currentTarget);
    await action.execute(async () => {
      const response = await api.post('/admin/ingestion-keys', {
        name: String(data.get('name')).trim(),
        teamId,
        expiresInDays: Number(data.get('expiresInDays')),
      });
      setCreatedKey(unwrap<{ key: string }>(response.data).key);
      await keys.reload();
      closeForm();
    });
  }

  async function revoke(key: IngestionKey) {
    const team = availableTeams.find((team) => team.id === key.teamId)?.name ?? key.teamId;
    if (!(await confirmAction(t('admin.confirmRevokeKey', { name: key.name, team })))) return;
    await action.execute(async () => {
      await api.delete(`/admin/ingestion-keys/${encodeURIComponent(key.id)}`);
      await keys.reload();
    });
  }

  const columns: ColumnDef<IngestionKey>[] = [
    {
      accessorKey: 'name',
      size: 180,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.keyName')} />,
      cell: ({ row }) => (
        <span className="block truncate font-medium" title={row.original.name}>
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      size: 220,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('admin.expires')} />,
      cell: ({ row }) => {
        const expiry = new Date(row.original.expiresAt);
        const count = Math.max(
          0,
          Math.ceil((expiry.getTime() - Date.now()) / MILLISECONDS_PER_DAY),
        );
        return (
          <span className="whitespace-nowrap" title={expiry.toLocaleString(i18n.language)}>
            {expiry.toLocaleDateString(i18n.language, { dateStyle: 'medium' })}{' '}
            <span className="text-muted-foreground">({t('admin.daysRemaining', { count })})</span>
          </span>
        );
      },
    },
    {
      id: 'status',
      size: 100,
      header: t('admin.status'),
      cell: ({ row: { original: key } }) => {
        const state = key.revokedAt
          ? 'revoked'
          : key.expiresAt <= Date.now()
            ? 'expired'
            : 'active';
        return (
          <Badge variant={state === 'active' ? 'success' : 'outline'}>
            {t(`admin.keyStatus.${state}`)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      size: 110,
      header: () => <span className="sr-only">{t('admin.actions')}</span>,
      enableHiding: false,
      cell: ({ row: { original: key } }) =>
        !key.revokedAt && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={action.busy}
              className="h-7 text-xs text-destructive"
              onClick={() => void revoke(key)}
            >
              {t('admin.revokeKey')}
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <AdminHeader
        title={t('admin.keys')}
        description={t('admin.manageKeysHelp')}
        action={t('admin.generateKey')}
        disabled={action.busy || !keys.rows || !teamId}
        onAction={(button) => {
          action.clearError();
          setTrigger(button);
        }}
      >
        {availableTeams.length > 1 && (
          <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span>{t('admin.newKeyTeam')}</span>
            <select
              name="keyOwner"
              className={`${FIELD} h-9 w-auto max-w-full px-2`}
              value={teamId ?? ''}
              disabled={action.busy}
              onChange={(event) => setSelectedTeam(event.target.value)}
            >
              <option value="" disabled>
                {t('admin.chooseTeam')}
              </option>
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </AdminHeader>
      <FeatureContent>
        {teams.error && (
          <QueryError
            title={t('admin.loadTeamsFailed')}
            message={teams.error}
            onRetry={teams.reload}
            isRetrying={teams.loading}
          />
        )}
        {teams.rows?.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('admin.teamRequiredForKey')}</p>
        )}
        {!trigger && <ActionFeedback error={action.error} saved={action.saved && !createdKey} />}
        {createdKey && (
          <GeneratedKey key={createdKey} value={createdKey} onDismiss={() => setCreatedKey('')} />
        )}
        <AdminTable
          {...keys}
          columns={columns}
          searchPlaceholder={t('admin.searchKeys')}
          enableColumnVisibility={false}
          emptyLabel={t('admin.noKeys')}
        />
      </FeatureContent>
      <AdminFormSheet
        title={t('admin.generateKey')}
        description={t('admin.keyFormHelp')}
        open={!!trigger}
        busy={action.busy}
        error={action.error}
        onClose={closeForm}
        returnFocus={trigger}
      >
        <IngestionKeyForm
          busy={action.busy}
          onSubmit={(event) => void createKey(event)}
          onClose={closeForm}
        />
      </AdminFormSheet>
      {confirmation}
    </>
  );
}
