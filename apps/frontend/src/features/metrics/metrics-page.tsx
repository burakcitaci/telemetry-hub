import { useCallback, useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { getMetrics } from '@/features/metrics/api';
import type { MetricRecord, MetricsPage as MetricsPageData } from '@/features/metrics/types';
import { DataTable, DataTableColumnHeader } from '@/shared/components/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { getErrorMessage } from '@/shared/lib/errors';

const PAGE_SIZE = 10;

const columns: ColumnDef<MetricRecord>[] = [
  {
    accessorKey: 'serviceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Service" />,
    cell: ({ row }) => (
      <Link
        to={`/services/${encodeURIComponent(row.original.serviceName)}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {row.original.serviceName}
      </Link>
    ),
  },
  {
    accessorKey: 'metricName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Metric" />,
    cell: ({ row }) => <code className="text-xs">{row.original.metricName}</code>,
  },
  {
    accessorKey: 'metricType',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <Badge variant="secondary">{row.original.metricType}</Badge>,
  },
  {
    accessorKey: 'tableName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Table" />,
    cell: ({ row }) => (
      <code className="text-xs text-muted-foreground">{row.original.tableName}</code>
    ),
  },
];

function MetricsPage() {
  const [metricsPage, setMetricsPage] = useState<MetricsPageData | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async (requestedOffset = offset) => {
    setLoading(true);
    try {
      setMetricsPage(await getMetrics(PAGE_SIZE, requestedOffset));
      setError(null);
    } catch (loadError: unknown) {
      setError(getErrorMessage(
        loadError,
        'Unable to load metrics. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
      ));
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadMetrics(0);
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
          <h1 className="text-xl font-semibold">Metrics</h1>
          <p className="text-sm text-muted-foreground">
            Browse collected metrics and select a service to view its one-hour performance summary.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadMetrics()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !metricsPage ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : metricsPage && metricsPage.metrics.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {metricsPage.offset + 1}–{metricsPage.offset + metricsPage.metrics.length} of {metricsPage.total} metrics
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={loading || offset === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={loading || offset + metricsPage.limit >= metricsPage.total}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={metricsPage.metrics}
            enableSearch={false}
            enableRowSelection={false}
            enableColumnVisibility={false}
            enablePagination={false}
          />
        </section>
      ) : error ? null : (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Activity className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No metrics found</p>
              <p className="text-sm text-muted-foreground">
                Generate an instrumented backend request, then allow the collector time to export metrics.
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

export default MetricsPage;
