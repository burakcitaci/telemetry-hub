import { Checkbox } from '@/components/ui/checkbox';
import {
  Activity,
  Star,
  LayoutList,
  ExternalLink,
  GitBranch,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { ServiceRow } from '@/features/services/model';

export const columns: ColumnDef<ServiceRow>[] = [
  {
    id: 'favorite',
    header: () => <Star className="h-4 w-4 text-muted-foreground" />,
    cell: () => (
      <Star className="h-4 w-4 text-muted-foreground hover:text-warning cursor-pointer" />
    ),
    size: 40,
  },
  {
    accessorKey: 'Type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TYPE" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-sm bg-primary/10 flex items-center justify-center">
          <LayoutList className="h-3 w-3 text-primary" />
        </div>
        <span className="text-sm font-medium">{row.original.Type}</span>
      </div>
    ),
  },
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SERVICE" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          to={`/services/${encodeURIComponent(row.original.ServiceName)}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.ServiceName}
        </Link>
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50" />
      </div>
    ),
  },
  {
    accessorKey: 'Team',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TEAM" />
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.Team || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'OnCall',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ON-CALL" />
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-primary-foreground font-bold">
          {row.original.Team?.charAt(0).toUpperCase() || '?'}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'Contact',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CONTACT" />
    ),
    cell: () => (
      <div className="flex gap-1">
        <div className="h-4 w-4 bg-primary rounded-sm" />
        <div className="h-4 w-4 bg-destructive rounded-sm" />
      </div>
    ),
  },
  {
    accessorKey: 'Repo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="REPO" />
    ),
    cell: () => <GitBranch className="h-4 w-4 text-muted-foreground" />,
  },
  {
    accessorKey: 'Telemetry',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="TELEMETRY" />
    ),
    cell: () => (
      <div className="flex gap-1">
        <Activity className="h-4 w-4 text-primary" />
        <Activity className="h-4 w-4 text-primary" />
      </div>
    ),
  },
  {
    accessorKey: 'MetadataSource',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="METADATA SOURCE" />
    ),
    cell: ({ row }) => (
      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
        {row.original.MetadataSource}
      </span>
    ),
  },
];

export const FacetSection = ({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) => (
  <div className="mb-6">
    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
      {title}
    </h3>
    <div className="space-y-1.5">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between text-sm"
        >
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox />
            <span>{item.label}</span>
          </label>
          <span className="text-xs text-muted-foreground">{item.count}</span>
        </div>
      ))}
    </div>
  </div>
);
