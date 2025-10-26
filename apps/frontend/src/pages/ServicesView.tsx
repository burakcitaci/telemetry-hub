import { useEffect, useState } from 'react';
import { getServices, getServiceMetrics } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';

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
    return <div className="loading">Loading services...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (services.length === 0) {
    return (
      <div className="empty-state">
        <h3>No services found</h3>
        <p>Services will appear here once traces are generated</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Services</h2>
        <p className="text-muted-foreground">Monitor service health and performance metrics</p>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Services</h3>
        <div className="flex gap-4 flex-wrap">
          {services.map((service) => (
            <Button
              key={service.ServiceName}
              onClick={() => setSelectedService(service.ServiceName)}
              variant={selectedService === service.ServiceName ? "default" : "outline"}
              size="sm"
            >
              {service.ServiceName}
            </Button>
          ))}
        </div>
      </div>

      {selectedService && metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{metrics.request_count}</div>
              <div className="text-sm text-muted-foreground">Total Requests (1h)</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-destructive">{calculateErrorRate()}%</div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{formatDuration(metrics.avg_duration)}</div>
              <div className="text-sm text-muted-foreground">Average Duration</div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Latency Percentiles</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getLatencyChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis dataKey="name" stroke="#8b949e" />
                <YAxis stroke="#8b949e" label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#8b949e' }} />
                <Tooltip 
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '6px' }}
                  formatter={(value: any) => [`${value.toFixed(2)}ms`, 'Duration']}
                />
                <Bar dataKey="value" fill="#58a6ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Detailed Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold">Metric</th>
                    <th className="text-left py-2 px-4 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 px-4 border-b">P50 Latency</td>
                    <td className="py-2 px-4 border-b">{formatDuration(metrics.p50_duration)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">P95 Latency</td>
                    <td className="py-2 px-4 border-b">{formatDuration(metrics.p95_duration)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 border-b">P99 Latency</td>
                    <td className="py-2 px-4 border-b">{formatDuration(metrics.p99_duration)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4">Error Count</td>
                    <td className="py-2 px-4">{metrics.error_count}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ServicesView;
