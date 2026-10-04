import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
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

const columns: ColumnDef<ServiceSummary>[] = [
  {
    accessorKey: 'ServiceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
    cell: ({ row }) => (
      <Link
        to={`/services/${encodeURIComponent(row.original.ServiceName)}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {row.original.ServiceName}
      </Link>
    ),
  },
];

function ServicesPage() {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      setServices(await getServices());
      setError(null);
    } catch (loadError: unknown) {
      setError(getErrorMessage(
        loadError,
        'Unable to load services. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadServices();
    } catch (generateError) {
      setError(getErrorMessage(
        generateError,
        'Unable to generate telemetry. Check the backend /api/data endpoint and port-forward.',
      ));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Select a service to view its one-hour performance summary.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadServices()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && services.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : services.length > 0 ? (
        <DataTable
          columns={columns}
          data={services}
          searchPlaceholder="Search services…"
          enableRowSelection={false}
          enableColumnVisibility={false}
          enablePagination
          pageSize={20}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No traced services found</p>
              <p className="text-sm text-muted-foreground">
                Generate an instrumented backend request, then allow the collector time to export it.
              </p>
            </div>
            <Button onClick={() => void generateAndRefresh()} disabled={generating}>
              {generating ? 'Generating…' : 'Generate telemetry'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ServicesPage;
