import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { toIso, formatValue, type TableRow } from '../model';

const timeColumn = (): ColumnDef<TableRow> => ({
  accessorKey: 'timestamp',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
  cell: ({ row }) => <span className="text-xs text-muted-foreground">
    {new Date(toIso(row.original.timestamp)).toLocaleString()}
  </span>,
});

const valueColumn = (unit: string): ColumnDef<TableRow> => ({
  accessorKey: 'value',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
  cell: ({ row }) => <span className="tabular-nums">{formatValue(row.original.value, unit)}</span>,
});

const groupColumn = (): ColumnDef<TableRow> => ({
  accessorKey: 'group',
  header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
  cell: ({ row }) => <span className="text-xs">{row.original.group}</span>,
});

export function useMetricColumns(metricUnit: string) {
  return useMemo(() => [timeColumn(), valueColumn(metricUnit), groupColumn()], [metricUnit]);
}
