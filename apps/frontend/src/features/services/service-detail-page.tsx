import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings,
  Users,
  GitBranch,
  Phone,
  Tag,
  ExternalLink,
  Pencil,
  ChevronLeft,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TimeRangePicker } from '@/app/components/timer-range.picker';
import { QueryError, ViewSkeleton } from '@/components/shared/view-skeleton';
import { PageLayout } from '@/components/shared/page-layout';
import { EnvironmentFilter } from '@/shared/components/environment-filter';
import { TelemetryWidget as Card } from '@/components/shared/telemetry-widget';
import {
  DataValue,
  MetricCard,
} from '@/components/shared/telemetry-primitives';
import { formatDuration } from '@/shared/lib/telemetry';
import { ServiceMetadataSheet } from './components/service-metadata-sheet';
import { EMPTY_METADATA, type ServiceMetadata } from './types';
import { useServiceMetadata } from './hooks/use-service-metadata';
import { useServiceSummary } from './hooks/use-service-summary';

function numberValue(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function displayDuration(value: unknown): string {
  const number = numberValue(value);
  return number === null ? '—' : formatDuration(number);
}

function traceSearch(search: string, serviceName: string): string {
  const params = new URLSearchParams(search);
  params.delete('service');
  params.append('service', serviceName);
  return `?${params}`;
}

function ServiceDetailPage() {
  const { tenant = '', serviceName = '' } = useParams();
  const { search } = useLocation();
  const { metrics, loading, error, timeRange, setTimeRange, retry } =
    useServiceSummary(serviceName);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { metadata, saveForService, loading: metadataLoading, error: metadataError, reload: reloadMetadata } = useServiceMetadata();
  const currentMetadata: ServiceMetadata =
    metadata[serviceName] ?? EMPTY_METADATA(serviceName);

  const requestCount = numberValue(metrics?.request_count);
  const errorCount = numberValue(metrics?.error_count);
  const errorRate = requestCount !== null && requestCount > 0 && errorCount !== null
    ? (errorCount / requestCount) * 100
    : null;

  const latencyData = metrics
    ? [
      { name: 'P50', value: numberValue(metrics.p50_duration) },
      { name: 'P95', value: numberValue(metrics.p95_duration) },
      { name: 'P99', value: numberValue(metrics.p99_duration) },
    ].flatMap((point) => point.value === null ? [] : [{ ...point, value: point.value / 1_000_000 }])
    : [];

  const hasMetadata = Boolean(metadata[serviceName]);

  return (
    <PageLayout>
      {/* Modernized Header */}
      <header className="flex flex-col gap-4 border-b border-border pb-0">
        <div className="flex items-center justify-between gap-2">
          <div className='flex'>
            <Button asChild variant="ghost" size="icon" className="h-8 w-8 -ml-2 text-muted-foreground">
              <Link to={{ pathname: `/org/${tenant}/services`, search }}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{serviceName}</h1>
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                {currentMetadata.type}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="w-48">
              <EnvironmentFilter source="traces" />
            </div>
            <TimeRangePicker value={timeRange} onChange={setTimeRange} />
            <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
            <Button
              variant={sheetOpen ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSheetOpen(true)}
              disabled={metadataLoading || !!metadataError}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Setup</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={retry}
              disabled={loading}
              className="h-9 w-9"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <ViewSkeleton showHeader={false} className="p-0 lg:p-0" />
      ) : error ? (
        <QueryError message={error} onRetry={retry} isRetrying={loading} />
      ) : metrics ? (
        <div className="space-y-6">
          {/* Metric cards - tightened gap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard className="flex items-center gap-4 p-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DataValue className="text-xl font-bold">
                  {requestCount ?? '—'}
                </DataValue>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Requests
                </p>
              </div>
            </MetricCard>
            <MetricCard className="flex items-center gap-4 p-4">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <DataValue className="text-xl font-bold">
                  {errorRate === null ? '—' : `${errorRate.toFixed(2)}%`}
                </DataValue>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Error Rate
                </p>
              </div>
            </MetricCard>
            <MetricCard className="flex items-center gap-4 p-4">
              <div className="p-2 bg-success/10 rounded-full">
                <Clock className="h-4 w-4 text-success" />
              </div>
              <div>
                <DataValue className="text-xl font-bold">
                  {displayDuration(metrics.avg_duration)}
                </DataValue>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Avg Duration
                </p>
              </div>
            </MetricCard>
            <MetricCard className="flex items-center gap-4 p-4">
              <div className="p-2 bg-warning/10 rounded-full">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <DataValue className="text-xl font-bold">
                  {displayDuration(metrics.p95_duration)}
                </DataValue>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  P95 Duration
                </p>
              </div>
            </MetricCard>
          </div>

          {/* Charts + summary - Compacted Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle className="text-base font-medium">Latency Percentiles</CardTitle>
                  <CardDescription className="text-xs">
                    Span duration distribution (ms)
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="h-8 shrink-0 text-xs">
                  <Link to={{ pathname: `/org/${tenant}/traces`, search: traceSearch(search, serviceName) }}>
                    View related traces
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={latencyData}
                    margin={{ top: 10, right: 6, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      fontSize={11}
                      unit="ms"
                      tickLine={false}
                      axisLine={false}
                    // Increased width to prevent overlap
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [
                        `${Number(value).toFixed(2)}ms`,
                        'Duration',
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
              <p className="px-6 pb-4 text-[11px] text-muted-foreground">
                Trace results are limited to the batch currently returned by the trace API.
              </p>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Summary
                </CardTitle>
                <CardDescription className="text-xs">
                  Aggregated by telemetry API
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-4">
                  {[
                    ['P50 latency', displayDuration(metrics.p50_duration)],
                    ['P95 latency', displayDuration(metrics.p95_duration)],
                    ['P99 latency', displayDuration(metrics.p99_duration)],
                    ['Error span count', errorCount === null ? '—' : String(errorCount)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <DataValue className="font-medium">{value}</DataValue>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ownership / Metadata summary card - Modernized List */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium">Ownership</CardTitle>
                <CardDescription className="text-xs">
                  Static metadata configured for this service.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSheetOpen(true)}
                disabled={metadataLoading || !!metadataError}
                className="-mr-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                {hasMetadata ? 'Edit' : 'Configure'}
              </Button>
            </CardHeader>
            <CardContent>
              {hasMetadata ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
                  <MetadataField
                    icon={<Tag className="h-3.5 w-3.5" />}
                    label="Type"
                    value={currentMetadata.type}
                  />
                  <MetadataField
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="Team"
                    value={currentMetadata.team || '—'}
                  />
                  <MetadataField
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label="On-Call"
                    value={currentMetadata.onCall || '—'}
                  />
                  <MetadataField
                    icon={<Users className="h-3.5 w-3.5" />}
                    label="Contact"
                    value={currentMetadata.contact || '—'}
                  />
                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-border/50">
                    <MetadataField
                      icon={<GitBranch className="h-3.5 w-3.5" />}
                      label="Repository"
                      value={
                        currentMetadata.repo ? (
                          <a
                            href={`https://${currentMetadata.repo.replace(/^https?:\/\//, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                          >
                            {currentMetadata.repo}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          '—'
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border">
                  <div className="p-3 bg-background rounded-full shadow-sm">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">No metadata configured</p>
                    <p className="text-xs text-muted-foreground max-w-[250px]">
                      Add ownership information to help your team manage this service.
                    </p>
                  </div>
                  <Button disabled={metadataLoading || !!metadataError} size="sm" variant="secondary" onClick={() => setSheetOpen(true)}>
                    Configure Metadata
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed p-6 text-center">
          <p className="text-sm font-medium">No service summary available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No aggregated KPI response was returned for this service and selected scope.
          </p>
          <Button className="mt-4" variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </Card>
      )}

      {metadataLoading && <p role="status" className="text-xs text-muted-foreground">Loading service metadata…</p>}
      {metadataError && <QueryError message={metadataError} onRetry={() => void reloadMetadata()} />}
      {/* Setup & Config sheet */}
      <ServiceMetadataSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        serviceName={serviceName}
        metadata={metadata[serviceName] ?? null}
        onSave={saveForService}
      />
    </PageLayout>
  );
}

function MetadataField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-medium">
        {icon} {label}
      </p>
      <div className="text-sm font-medium text-foreground truncate">
        {value}
      </div>
    </div>
  );
}

export default ServiceDetailPage;
