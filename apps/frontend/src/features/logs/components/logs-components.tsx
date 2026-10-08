import type { ColumnDef } from '@tanstack/react-table';
import type { LogRecord } from '@/features/logs/types';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { Badge } from '@/components/ui/badge';
import { formatTelemetryTimestamp } from '@/shared/lib/telemetry';

export function severityBadge(severity: string) {
  const normalized = severity.toUpperCase();
  if (normalized === 'ERROR' || normalized === 'FATAL') {
    return <Badge variant="destructive">{normalized}</Badge>;
  }
  if (normalized === 'WARN' || normalized === 'WARNING') {
    return <Badge variant="warning">WARN</Badge>;
  }
  if (normalized === 'INFO') return <Badge variant="info">INFO</Badge>;
  return <Badge variant="secondary">{normalized || 'UNSET'}</Badge>;
}

export const columns: ColumnDef<LogRecord>[] = [
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
    accessorKey: 'SeverityText',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Severity" />
    ),
    cell: ({ row }) => severityBadge(row.original.SeverityText),
  },
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Service" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.original.ServiceName || 'Unknown service'}
      </Badge>
    ),
  },
  {
    accessorKey: 'Body',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Message" />
    ),
    cell: ({ row }) => (
      <span
        className="block max-w-xl truncate text-xs"
        title={row.original.Body}
      >
        {row.original.Body}
      </span>
    ),
  },
  {
    accessorKey: 'TraceId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Trace ID" />
    ),
    cell: ({ row }) => (
      <code className="whitespace-nowrap text-xs text-muted-foreground">
        {row.original.TraceId ? `${row.original.TraceId.slice(0, 10)}…` : 'N/A'}
      </code>
    ),
  },
];
