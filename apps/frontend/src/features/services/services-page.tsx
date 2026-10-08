import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, RefreshCw, Search, Filter, Star, LayoutList, Map as MapIcon,
  ChevronDown, Info, ExternalLink, GitBranch, Users, Circle, Settings
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { getServices } from '@/features/services/api';
import type { ServiceSummary } from '@/features/services/types';
import { DataTable, DataTableColumnHeader } from '@/shared/components/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { getErrorMessage } from '@/shared/lib/errors';
import { ServiceMetadata } from './service-meta.sheet';
import { useServiceMetadata } from './hooks/useServiceMetaData';


// --- Types ---
type ServiceRow = ServiceSummary & {
  Type: string;
  Team: string;
  OnCall: string;
  Contact: string;
  Repo: string;
  Telemetry: string;
  MetadataSource: string;
};

// --- Mapper: merges API data with saved static metadata ---
const mapServiceToRow = (
  service: ServiceSummary,
  metadata: Record<string, ServiceMetadata>,
): ServiceRow => {
  const saved = metadata[service.ServiceName];
  const hash = service.ServiceName.length;
  const types = ['Web', 'DB', 'Cache', 'Function', 'Custom'];
  const teams = ['transactions', 'data-science', 'communication', 'dba', 'orders', 'shopist'];

  return {
    ...service,
    Type: saved?.type ?? types[hash % types.length],
    Team: saved?.team || teams[hash % teams.length],
    OnCall: saved?.onCall || (hash % 2 === 0 ? 'Yes' : 'No'),
    Contact: saved?.contact || '@slack-channel',
    Repo: saved?.repo || 'github.com/org/repo',
    Telemetry: 'APM',
    MetadataSource: saved?.metadataSource ?? 'UI',
  };
};

// --- Column Definitions ---
const columns: ColumnDef<ServiceRow>[] = [
  {
    id: 'favorite',
    header: () => <Star className="h-4 w-4 text-muted-foreground" />,
    cell: () => <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-400 cursor-pointer" />,
    size: 40,
  },
  {
    accessorKey: 'Type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="TYPE" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded-sm bg-blue-100 flex items-center justify-center">
          <LayoutList className="h-3 w-3 text-blue-600" />
        </div>
        <span className="text-sm font-medium">{row.original.Type}</span>
      </div>
    ),
  },
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="SERVICE" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Link
          to={`/services/${encodeURIComponent(row.original.ServiceName)}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.original.ServiceName}
        </Link>
        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50" />
      </div>
    ),
  },
  {
    accessorKey: 'Team',
    header: ({ column }) => <DataTableColumnHeader column={column} title="TEAM" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.Team || '—'}</span>
    ),
  },
  {
    accessorKey: 'OnCall',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ON-CALL" />,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
          {row.original.Team?.charAt(0).toUpperCase() || '?'}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'Contact',
    header: ({ column }) => <DataTableColumnHeader column={column} title="CONTACT" />,
    cell: () => (
      <div className="flex gap-1">
        <div className="h-4 w-4 bg-blue-500 rounded-sm" />
        <div className="h-4 w-4 bg-red-500 rounded-sm" />
      </div>
    ),
  },
  {
    accessorKey: 'Repo',
    header: ({ column }) => <DataTableColumnHeader column={column} title="REPO" />,
    cell: () => <GitBranch className="h-4 w-4 text-muted-foreground" />,
  },
  {
    accessorKey: 'Telemetry',
    header: ({ column }) => <DataTableColumnHeader column={column} title="TELEMETRY" />,
    cell: () => (
      <div className="flex gap-1">
        <Activity className="h-4 w-4 text-purple-500" />
        <Activity className="h-4 w-4 text-blue-500" />
      </div>
    ),
  },
  {
    accessorKey: 'MetadataSource',
    header: ({ column }) => <DataTableColumnHeader column={column} title="METADATA SOURCE" />,
    cell: ({ row }) => (
      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
        {row.original.MetadataSource}
      </span>
    ),
  },
];

// --- Facet Sidebar Component ---
const FacetSection = ({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) => (
  <div className="mb-6">
    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h3>
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{item.label}</span>
          </label>
          <span className="text-xs text-muted-foreground">{item.count}</span>
        </div>
      ))}
    </div>
  </div>
);

function ServicesPage() {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared metadata store (same source of truth as Service Detail page)
  const { metadata } = useServiceMetadata();

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServices();
      setServices(data);
      setError(null);
    } catch (loadError: unknown) {
      setError(
        getErrorMessage(
          loadError,
          'Unable to load services. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  // Merge API services with static metadata for the table
  const rows: ServiceRow[] = useMemo(
    () => services.map((s) => mapServiceToRow(s, metadata)),
    [services, metadata],
  );

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadServices();
    } catch (generateError) {
      setError(
        getErrorMessage(
          generateError,
          'Unable to generate telemetry. Check the backend /api/data endpoint and port-forward.',
        ),
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="flex h-14 items-center border-b px-4 gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          <span className="font-semibold text-lg">Service Catalog</span>
        </div>
        <nav className="flex gap-4 text-sm font-medium">
          <a href="#" className="text-blue-600 border-b-2 border-blue-600 pb-4 pt-4">
            Explore
          </a>
          <Link
            to="/setup"
            className="text-muted-foreground hover:text-foreground pb-4 pt-4 flex items-center gap-1"
          >
            <Settings className="h-3 w-3" /> Setup & Config
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span>Feb 22, 10:40 am – Feb 22, 11:40 am</span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Info className="mr-1 h-3 w-3" /> Learn More
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r bg-slate-50/50 overflow-y-auto p-4 hidden md:block">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search facets"
                className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <FacetSection
            title="Service Overview"
            items={[
              { label: 'Discovered', count: 226 },
              { label: 'User-defined', count: 4 },
            ]}
          />
          <FacetSection
            title="Telemetry Type"
            items={[
              { label: 'Distributed Tracing', count: 189 },
              { label: 'Universal Service Mon...', count: 20 },
              { label: 'Infrastructure Mon...', count: 54 },
              { label: 'Network Performa...', count: 47 },
              { label: 'Log Management', count: 106 },
              { label: 'Real User Monitori...', count: 10 },
              { label: 'Continuous Profiler', count: 0 },
              { label: 'No Telemetry Data', count: 5 },
            ]}
          />
          <FacetSection
            title="Type"
            items={[
              { label: 'Web', count: 61 },
              { label: 'DB', count: 22 },
              { label: 'Cache', count: 5 },
              { label: 'Function', count: 10 },
              { label: 'Custom', count: 119 },
              { label: 'Browser', count: 6 },
              { label: 'Mobile', count: 7 },
            ]}
          />
        </aside>

        {/* Right Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Top Action Bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <LayoutList className="h-3 w-3" /> List
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
                <MapIcon className="h-3 w-3" /> Map
              </Button>
              <div className="relative ml-4 w-96">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for service by name or facets"
                  className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-3 w-3" /> Hide Controls
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                All <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {/* Table Section */}
          <div className="rounded-sm bg-card">
            {error && (
              <Alert variant="destructive" className="m-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {loading && services.length === 0 ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : rows.length > 0 ? (
              <DataTable
                columns={columns}
                data={rows}
                searchPlaceholder="Search for services"
                enableRowSelection={false}
                enableColumnVisibility={false}
                enablePagination
                pageSize={20}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No traced services found</p>
                  <p className="text-sm text-muted-foreground">
                    Generate an instrumented backend request, then allow the collector time to
                    export it.
                  </p>
                </div>
                <Button onClick={() => void generateAndRefresh()} disabled={generating}>
                  {generating ? 'Generating…' : 'Generate telemetry'}
                </Button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadServices()}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ServicesPage;