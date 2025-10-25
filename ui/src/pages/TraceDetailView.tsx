import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTraceById } from '../api';

interface Span {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes: Record<string, string>;
}

function TraceDetailView() {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId) {
      loadTrace();
    }
  }, [traceId]);

  const loadTrace = async () => {
    try {
      setLoading(true);
      const data = await getTraceById(traceId!);
      setSpans(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (nanoseconds: number) => {
    const ms = nanoseconds / 1000000;
    return `${ms.toFixed(2)}ms`;
  };

  const calculateTotalDuration = () => {
    if (spans.length === 0) return 0;
    const timestamps = spans.map(s => new Date(s.Timestamp).getTime());
    const durations = spans.map(s => s.Duration / 1000000);
    const minTime = Math.min(...timestamps);
    const maxEndTime = Math.max(...timestamps.map((t, i) => t + durations[i]));
    return maxEndTime - minTime;
  };

  const getSpanPosition = (span: Span) => {
    if (spans.length === 0) return { left: 0, width: 100 };
    
    const totalDuration = calculateTotalDuration();
    const spanStart = new Date(span.Timestamp).getTime();
    const rootStart = Math.min(...spans.map(s => new Date(s.Timestamp).getTime()));
    const spanDuration = span.Duration / 1000000;
    
    const left = ((spanStart - rootStart) / totalDuration) * 100;
    const width = (spanDuration / totalDuration) * 100;
    
    return { left, width: Math.max(width, 1) };
  };

  const buildSpanTree = () => {
    const rootSpans = spans.filter(s => !s.ParentSpanId);
    const childMap = new Map<string, Span[]>();
    
    spans.forEach(span => {
      if (span.ParentSpanId) {
        if (!childMap.has(span.ParentSpanId)) {
          childMap.set(span.ParentSpanId, []);
        }
        childMap.get(span.ParentSpanId)!.push(span);
      }
    });

    const renderSpan = (span: Span, depth: number = 0) => {
      const position = getSpanPosition(span);
      const children = childMap.get(span.SpanId) || [];
      
      return (
        <div key={span.SpanId} style={{ marginLeft: `${depth * 20}px` }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.5rem', 
            borderBottom: '1px solid #30363d',
            cursor: 'pointer'
          }}>
            <div style={{ flex: '0 0 250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {span.SpanName}
            </div>
            <div style={{ flex: 1, position: 'relative', height: '24px', background: '#0d1117', borderRadius: '4px', margin: '0 1rem' }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${position.left}%`,
                  width: `${position.width}%`,
                  height: '100%',
                  background: span.StatusCode === 'ERROR' ? '#da3633' : '#58a6ff',
                  borderRadius: '4px',
                }}
                title={`${span.SpanName}: ${formatDuration(span.Duration)}`}
              />
            </div>
            <div style={{ flex: '0 0 100px', textAlign: 'right' }}>
              {formatDuration(span.Duration)}
            </div>
          </div>
          {children.map(child => renderSpan(child, depth + 1))}
        </div>
      );
    };

    return rootSpans.map(span => renderSpan(span));
  };

  if (loading) {
    return <div className="loading">Loading trace details...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (spans.length === 0) {
    return <div className="empty-state">No spans found for this trace</div>;
  }

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ 
          background: '#21262d', 
          border: '1px solid #30363d', 
          color: '#e6edf3', 
          padding: '0.5rem 1rem', 
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}>
          ← Back
        </button>
        <h2>Trace Details</h2>
        <p><code>{traceId}</code></p>
      </div>

      <div className="grid">
        <div className="metric-card">
          <div className="metric-value">{spans.length}</div>
          <div className="metric-label">Total Spans</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{formatDuration(calculateTotalDuration() * 1000000)}</div>
          <div className="metric-label">Total Duration</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{spans[0]?.ServiceName || 'Unknown'}</div>
          <div className="metric-label">Service</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Span Waterfall</h3>
        {buildSpanTree()}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Span Details</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Span Name</th>
              <th>Service</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {spans.map(span => (
              <tr key={span.SpanId}>
                <td>{span.SpanName}</td>
                <td>{span.ServiceName}</td>
                <td>{formatDuration(span.Duration)}</td>
                <td>
                  <span className={`status-badge ${span.StatusCode === 'ERROR' ? 'status-error' : 'status-ok'}`}>
                    {span.StatusCode || 'UNSET'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TraceDetailView;
