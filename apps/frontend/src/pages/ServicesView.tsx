import { useEffect, useState } from 'react';
import { getServices, getServiceMetrics } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface Service {
  ServiceName: string;
}

interface ServiceMetrics {
  request_count: string;
  avg_duration: string;
  p50_duration: string;
  p95_duration: string;
  p99_duration: string;
  error_count: string;
}

function ServicesView() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedService) {
      loadMetrics(selectedService);
    }
  }, [selectedService]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getServices();
      setServices(data);
      if (data.length > 0) {
        setSelectedService(data[0].ServiceName);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async (service: string) => {
    try {
      const data = await getServiceMetrics(service);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDuration = (nanoseconds: string | number) => {
    const ns = typeof nanoseconds === 'string' ? parseFloat(nanoseconds) : nanoseconds;
    const ms = ns / 1000000;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const calculateErrorRate = () => {
    if (!metrics) return 0;
    const total = parseFloat(metrics.request_count);
    const errors = parseFloat(metrics.error_count);
    if (total === 0) return 0;
    return ((errors / total) * 100).toFixed(2);
  };

  const getLatencyChartData = () => {
    if (!metrics) return [];
    return [
      { name: 'P50', value: parseFloat(metrics.p50_duration) / 1000000 },
      { name: 'P95', value: parseFloat(metrics.p95_duration) / 1000000 },
      { name: 'P99', value: parseFloat(metrics.p99_duration) / 1000000 },
    ];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-32" />
            </div>
            <CardDescription>
              <Skeleton className="h-4 w-64" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error: {error}</AlertDescription>
      </Alert>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground mb-2">No services found</div>
          <div className="text-sm text-muted-foreground">
            Services will appear here once traces are generated
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Services
              </CardTitle>
              <CardDescription>Monitor service health and performance metrics</CardDescription>
            </div>
            <Button onClick={loadServices} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="text-sm text-muted-foreground mb-3">
              Select a service to view detailed metrics
            </div>
            <div className="flex gap-2 flex-wrap">
              {services.map((service) => (
                <Button
                  key={service.ServiceName}
                  onClick={() => setSelectedService(service.ServiceName)}
                  variant={selectedService === service.ServiceName ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-3 w-3" />
                  {service.ServiceName}
                </Button>
              ))}
            </div>
          </div>

          {selectedService && metrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="text-2xl font-bold">{metrics.request_count}</div>
                      <div className="text-sm text-muted-foreground">Total Requests (1h)</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{calculateErrorRate()}%</div>
                      <div className="text-sm text-muted-foreground">Error Rate</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold font-mono">{formatDuration(metrics.avg_duration)}</div>
                      <div className="text-sm text-muted-foreground">Average Duration</div>
                    </div>
                  </div>
                </Card>
                  <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Latency Percentiles</CardTitle>
                  <CardDescription>Response time distribution for {selectedService}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getLatencyChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        label={{
                          value: 'ms',
                          angle: -90,
                          position: 'insideLeft',
                          fill: 'hsl(var(--muted-foreground))'
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                        formatter={(value: any) => [`${value.toFixed(2)}ms`, 'Duration']}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Metrics</CardTitle>
                  <CardDescription>
                    Complete performance breakdown for {selectedService}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">P50 Latency</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatDuration(metrics.p50_duration)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">P95 Latency</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatDuration(metrics.p95_duration)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">P99 Latency</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatDuration(metrics.p99_duration)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Error Count</TableCell>
                          <TableCell className="text-right font-mono">
                            {metrics.error_count}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ServicesView;
