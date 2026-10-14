import { LayoutList, ExternalLink, GitBranch } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useLocation } from 'react-router-dom';
import { DataTableColumnHeader } from '@/shared/components/data-table';
import { ServiceRow } from '@/features/services/model';
import { useAuth } from '@/features/auth/auth-context';

export const columns: ColumnDef<ServiceRow>[] = [
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
        <ServiceDetailLink serviceName={row.original.ServiceName} />
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
    accessorKey: 'Repo',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="REPO" />
    ),
    cell: () => <GitBranch className="h-4 w-4 text-muted-foreground" />,
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

function ServiceDetailLink({ serviceName }: { serviceName: string }) {
  const { search } = useLocation();
  const { session } = useAuth();
  return (
    <Link
      to={{ pathname: `/org/${session?.tenantSlug}/services/${encodeURIComponent(serviceName)}`, search }}
      className="font-medium text-primary hover:underline"
    >
      {serviceName}
    </Link>
  );
}
