import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { QueryError, ViewSkeleton } from '@/shared/components/view-skeleton';
import { DataTable } from '@/shared/components/data-table';
import { FeatureHeader } from '@/shared/components/feature-header';
import { FeatureEmptyState, FeaturePanel } from '@/shared/components/feature-layout';

interface AdminHeaderProps {
  title: string;
  description: string;
  action: string;
  children?: ReactNode;
  disabled?: boolean;
  onAction: (trigger: HTMLButtonElement) => void;
}

export function AdminHeader({
  title,
  description,
  action,
  children,
  disabled,
  onAction,
}: AdminHeaderProps) {
  return (
    <FeatureHeader
      title={title}
      description={description}
      actions={
        <Button size="sm" disabled={disabled} onClick={(event) => onAction(event.currentTarget)}>
          <Plus aria-hidden="true" /> {action}
        </Button>
      }
    >
      {children}
    </FeatureHeader>
  );
}

interface AdminTableProps<T> {
  rows: T[] | undefined;
  columns: ColumnDef<T>[];
  searchPlaceholder: string;
  enableColumnVisibility?: boolean;
  emptyLabel: string;
  error: string;
  loading: boolean;
  reload: () => Promise<void>;
}

export function AdminTable<T>({
  rows,
  columns,
  searchPlaceholder,
  enableColumnVisibility,
  emptyLabel,
  error,
  loading,
  reload,
}: AdminTableProps<T>) {
  const { t } = useTranslation();
  return (
    <>
      {error && (
        <QueryError
          title={t('admin.loadFailed')}
          message={error}
          onRetry={reload}
          isRetrying={loading}
        />
      )}
      {(loading || rows?.length || !error) && (
        <FeaturePanel aria-busy={loading}>
          {rows?.length ? (
            <DataTable
              density="telemetry"
              data={rows}
              columns={columns}
              searchPlaceholder={searchPlaceholder}
              enableColumnVisibility={enableColumnVisibility}
            />
          ) : loading ? (
            <ViewSkeleton showHeader={false} variant="list" label={t('admin.loading')} />
          ) : (
            <FeatureEmptyState>{emptyLabel}</FeatureEmptyState>
          )}
        </FeaturePanel>
      )}
    </>
  );
}

export function ActionFeedback({ error, saved = false }: { error: string; saved?: boolean }) {
  const { t } = useTranslation();
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (saved)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t('admin.saved')}
      </p>
    );
  return null;
}

interface AdminFormSheetProps {
  title: string;
  description: string;
  open: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  returnFocus: HTMLButtonElement | null;
  children: ReactNode;
}

export function AdminFormSheet({
  title,
  description,
  open,
  busy,
  error,
  onClose,
  returnFocus,
  children,
}: AdminFormSheetProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <SheetContent
        className="w-full max-w-full overflow-y-auto sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current = returnFocus;
          titleRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          const trigger = triggerRef.current;
          if (!trigger) return;
          event.preventDefault();
          const target = trigger.isConnected ? trigger : document.getElementById(trigger.id);
          target?.focus();
        }}
      >
        <SheetHeader className="mb-6 pr-4 text-left">
          <SheetTitle ref={titleRef} tabIndex={-1}>
            {title}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <ActionFeedback error={error} />
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminFormActions({
  label,
  busy,
  onClose,
}: {
  label: string;
  busy: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
        {t('admin.cancel')}
      </Button>
      <Button type="submit" disabled={busy}>
        {label}
      </Button>
    </div>
  );
}
