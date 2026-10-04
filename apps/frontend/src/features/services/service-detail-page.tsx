import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link, useParams } from 'react-router-dom';
import { getServiceMetrics } from '@/features/services/api';
import type { ServiceMetrics } from '@/features/services/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/shared/lib/errors';
import { formatDuration } from '@/shared/lib/telemetry';

function numberValue(value: unknown): number {
  if (typeof value !== 'string' && typeof value !== 'number') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ServiceDetailPage() {
  const { serviceName = '' } = useParams();
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setMetrics(null);
    try {
      setMetrics(await getServiceMetrics(serviceName));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(
        loadError,
        `Unable to load the one-hour summary for ${serviceName}.`,
      ));
    } finally {
      setLoading(false);
    }
  }, [serviceName]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics, refreshCount]);

  const requestCount = numberValue(metrics?.request_count);
  const errorCount = numberValue(metrics?.error_count);
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  const latencyData = metrics ? [
    { name: 'P50', value: numberValue(metrics.p50_duration) / 1_000_000 },
    { name: 'P95', value: numberValue(metrics.p95_duration) / 1_000_000 },
    { name: 'P99', value: numberValue(metrics.p99_duration) / 1_000_000 },
  ] : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Services
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{serviceName}</h1>
            <p className="text-sm text-muted-foreground">One-hour performance summary</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshCount((count) => count + 1)}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : metrics ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{requestCount}</p>
                  <p className="text-sm text-muted-foreground">Requests (1h)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{errorRate.toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground">Error rate</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatDuration(metrics.avg_duration)}</p>
                  <p className="text-sm text-muted-foreground">Average span duration</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latency percentiles</CardTitle>
                <CardDescription>Span duration distribution for {serviceName}.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} unit="ms" />
                    <Tooltip
                      formatter={(value) => [`${numberValue(value).toFixed(2)}ms`, 'Duration']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">One-hour summary</CardTitle>
                <CardDescription>Aggregated directly by the telemetry API.</CardDescription>
              </CardHeader>
              <CardContent className="divide-y rounded-md border text-sm">
                {[
                  ['P50 latency', formatDuration(metrics.p50_duration)],
                  ['P95 latency', formatDuration(metrics.p95_duration)],
                  ['P99 latency', formatDuration(metrics.p99_duration)],
                  ['Error span count', String(errorCount)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ServiceDetailPage;
