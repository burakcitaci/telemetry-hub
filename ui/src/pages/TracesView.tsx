import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTraces, createEventSource } from '../api';
import { formatDistance } from 'date-fns';

interface Trace {
  TraceId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
}

function TracesView() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTraces();

    const eventSource = createEventSource();
    
    eventSource.onopen = () => {
      console.log('SSE connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.traces.length > 0) {
        console.log('New traces received', data.traces);
        loadTraces();
      }
    };

    eventSource.onerror = () => {
      console.error('SSE error');
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const loadTraces = async () => {
    try {
      setLoading(true);
      const data = await getTraces(100);
      setTraces(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (nanoseconds: number) => {
    const ms = nanoseconds / 1000000;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  };

  const getStatusBadge = (status: string) => {
    const className = status === 'ERROR' ? 'status-error' : 
                      status === 'OK' ? 'status-ok' : 'status-unset';
    return <span className={`status-badge ${className}`}>{status || 'UNSET'}</span>;
  };

  const handleRowClick = (traceId: string) => {
    navigate(`/trace/${traceId}`);
  };

  if (loading && traces.length === 0) {
    return <div className="loading">Loading traces...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Traces</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <p>Real-time distributed tracing data</p>
          <div className="connection-status">
            <div className={`status-indicator ${connected ? '' : 'disconnected'}`}></div>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {traces.length === 0 ? (
        <div className="empty-state">
          <h3>No traces found</h3>
          <p>Send a request to the Gateway to generate traces</p>
          <code style={{ display: 'block', marginTop: '1rem', padding: '1rem', background: '#161b22', borderRadius: '6px' }}>
            curl http://localhost:3000/api/data
          </code>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Trace ID</th>
                <th>Span Name</th>
                <th>Service</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace) => (
                <tr key={`${trace.TraceId}-${trace.SpanId}`} onClick={() => handleRowClick(trace.TraceId)}>
                  <td><code>{trace.TraceId.substring(0, 16)}...</code></td>
                  <td>{trace.SpanName}</td>
                  <td>{trace.ServiceName}</td>
                  <td>{formatDuration(trace.Duration)}</td>
                  <td>{getStatusBadge(trace.StatusCode)}</td>
                  <td>{formatTimestamp(trace.Timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TracesView;
