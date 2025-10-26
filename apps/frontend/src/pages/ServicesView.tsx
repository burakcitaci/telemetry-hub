import { useEffect, useState } from 'react';
import { getServices, getServiceMetrics } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      <div className="page-header">
        <h2>Services</h2>
        <p>Monitor service health and performance metrics</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Services</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {services.map((service) => (
            <button
              key={service.ServiceName}
              onClick={() => setSelectedService(service.ServiceName)}
              style={{
                padding: '0.75rem 1.5rem',
                background: selectedService === service.ServiceName ? '#58a6ff' : '#21262d',
                color: '#fff',
                border: '1px solid #30363d',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {service.ServiceName}
            </button>
          ))}
        </div>
      </div>

      {selectedService && metrics && (
        <>
          <div className="grid">
            <div className="metric-card">
              <div className="metric-value">{metrics.request_count}</div>
              <div className="metric-label">Total Requests (1h)</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{calculateErrorRate()}%</div>
              <div className="metric-label">Error Rate</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{formatDuration(metrics.avg_duration)}</div>
              <div className="metric-label">Average Duration</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Latency Percentiles</h3>
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

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Detailed Metrics</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>P50 Latency</td>
                  <td>{formatDuration(metrics.p50_duration)}</td>
                </tr>
                <tr>
                  <td>P95 Latency</td>
                  <td>{formatDuration(metrics.p95_duration)}</td>
                </tr>
                <tr>
                  <td>P99 Latency</td>
                  <td>{formatDuration(metrics.p99_duration)}</td>
                </tr>
                <tr>
                  <td>Error Count</td>
                  <td>{metrics.error_count}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ServicesView;
