import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getServiceMetrics, getServices } from '@/features/services/api';
import type { ServiceMetrics, ServiceSummary } from '@/features/services/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateTelemetry } from '@/shared/api/telemetry-api';
import { getErrorMessage } from '@/shared/lib/errors';
import { formatDuration } from '@/shared/lib/telemetry';

function numberValue(value: string | number | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ServicesPage() {
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [metricsRefresh, setMetricsRefresh] = useState(0);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const data = await getServices();
      setServices(data);
      setSelectedService((current) => (
        current && data.some((service) => service.ServiceName === current)
          ? current
          : data[0]?.ServiceName || null
      ));
      setServicesError(null);
    } catch (loadError) {
      setServicesError(getErrorMessage(
        loadError,
        'Unable to load services. Verify that the backend is reachable and VITE_BACKEND_URL is correct.',
      ));
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (!selectedService) {
      setMetrics(null);
      return;
    }

    let active = true;
    setLoadingMetrics(true);
    setMetrics(null);
    setMetricsError(null);

    void getServiceMetrics(selectedService)
      .then((data) => {
        if (active) setMetrics(data);
      })
      .catch((loadError) => {
        if (active) {
          setMetricsError(getErrorMessage(
            loadError,
            `Unable to load the one-hour summary for ${selectedService}.`,
          ));
        }
      })
      .finally(() => {
        if (active) setLoadingMetrics(false);
      });

    return () => {
      active = false;
    };
  }, [metricsRefresh, selectedService]);

  const refreshServicesAndMetrics = async () => {
    await loadServices();
    setMetricsRefresh((value) => value + 1);
  };

  const generateAndRefresh = async () => {
    setGenerating(true);
    try {
      await generateTelemetry();
      await loadServices();
      setMetricsRefresh((value) => value + 1);
    } catch (generateError) {
      setServicesError(getErrorMessage(
        generateError,
        'Unable to generate telemetry. Check the backend /api/data endpoint and port-forward.',
      ));
    } finally {
      setGenerating(false);
    }
  };

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
        <div>
          <h1 className="text-xl font-semibold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Service names and one-hour performance summaries derived from stored traces.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refreshServicesAndMetrics()} disabled={loadingServices || loadingMetrics}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loadingServices ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {servicesError && (
        <Alert variant="destructive">
          <AlertDescription>{servicesError}</AlertDescription>
        </Alert>
      )}

      {loadingServices && services.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        </div>
      ) : services.length === 0 ? (
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
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Traced services</CardTitle>
              <CardDescription>Select a service to inspect its last hour of trace data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {services.map((service) => (
                <Button
                  key={service.ServiceName}
                  variant={selectedService === service.ServiceName ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedService(service.ServiceName)}
                >
                  {service.ServiceName}
                </Button>
              ))}
            </CardContent>
          </Card>

          {metricsError && (
            <Alert variant="destructive">
              <AlertDescription>{metricsError}</AlertDescription>
            </Alert>
          )}

          {loadingMetrics ? (
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
                    <div><p className="text-2xl font-bold">{requestCount}</p><p className="text-sm text-muted-foreground">Requests (1h)</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-5">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div><p className="text-2xl font-bold">{errorRate.toFixed(2)}%</p><p className="text-sm text-muted-foreground">Error rate</p></div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex items-center gap-3 p-5">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div><p className="text-2xl font-bold">{formatDuration(metrics.avg_duration)}</p><p className="text-sm text-muted-foreground">Average span duration</p></div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Latency percentiles</CardTitle>
                    <CardDescription>Span duration distribution for {selectedService}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={latencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} unit="ms" />
                        <Tooltip formatter={(value) => [`${numberValue(value as number).toFixed(2)}ms`, 'Duration']} />
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
        </>
      )}
    </div>
  );
}

export default ServicesPage;
