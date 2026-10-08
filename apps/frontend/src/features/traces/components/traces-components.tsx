import { PanelLeft } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type { TraceSummary } from '@/features/traces/types';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatDuration,
  formatTelemetryTimestamp,
} from '@/shared/lib/telemetry';

export function statusBadge(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ERROR') return <Badge variant="destructive">Error</Badge>;
  if (normalized === 'OK') return <Badge variant="success">OK</Badge>;
  return <Badge variant="secondary">{status || 'Unset'}</Badge>;
}

export const columns: ColumnDef<TraceSummary>[] = [
  {
    accessorKey: 'Timestamp',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatTelemetryTimestamp(row.original.Timestamp)}
      </span>
    ),
  },
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Service" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.ServiceName}</Badge>
    ),
  },
  {
    accessorKey: 'SpanName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Operation" />
    ),
    cell: ({ row }) => (
      <span
        className="block max-w-xl truncate text-xs"
        title={row.original.SpanName}
      >
        {row.original.SpanName}
      </span>
    ),
  },
  {
    accessorKey: 'Duration',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Duration" />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDuration(row.original.Duration)}
      </span>
    ),
  },
  {
    accessorKey: 'SpanCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Spans" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.SpanCount}
      </span>
    ),
  },
  {
    accessorKey: 'ServiceCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Services" />
    ),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.ServiceCount}
      </span>
    ),
  },
  {
    accessorKey: 'StatusCode',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => statusBadge(row.original.StatusCode),
  },
];

export const TracesSidebarShell: React.FC<{
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ open, onToggle, children }) => {
  if (!open) {
    return (
      <aside className="flex w-11 shrink-0 flex-col items-center border-r bg-muted/30 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Expand sidebar"
          className="h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 sm:w-72 shrink-0 flex-col border-r bg-muted/30 min-h-0">
      {/* Header — matches the metrics page look:
          uppercase muted title on the left, collapse icon on the right. */}
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Filters
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          title="Collapse sidebar"
          className="h-7 w-7"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Hide TelemetrySidebar's own internal header row so we don't
          duplicate the title. This targets the first child block inside
          its scroll container. */}
      <div className="traces-sidebar-body min-h-0 flex-1 overflow-y-auto [&>*:first-child>div:first-child]:hidden">
        {children}
      </div>
    </aside>
  );
};
