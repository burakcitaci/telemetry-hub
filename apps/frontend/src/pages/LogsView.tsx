import { useEffect, useState } from 'react';
import { getLogs, createEventSource } from '../api';

interface Log {
  Timestamp: string;
  TraceId: string;
  SeverityText: string;
  ServiceName: string;
  Body: string;
}

function LogsView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadLogs();

    const eventSource = createEventSource();
    
    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.logs.length > 0) {
        loadLogs();
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getLogs(100);
      setLogs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return '#da3633';
      case 'WARN':
        return '#d29922';
      case 'INFO':
        return '#58a6ff';
      default:
        return '#8b949e';
    }
  };

  if (loading && logs.length === 0) {
    return <div className="loading">Loading logs...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2>Logs</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <p>Real-time log streaming</p>
          <div className="connection-status">
            <div className={`status-indicator ${connected ? '' : 'disconnected'}`}></div>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {logs.length === 0 ? (
        <div className="empty-state">
          <h3>No logs found</h3>
          <p>Logs will appear here as they are generated</p>
        </div>
      ) : (
        <div className="card">
          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {logs.map((log, index) => (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid #30363d',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ color: '#8b949e', minWidth: '150px' }}>
                  {new Date(log.Timestamp).toLocaleString()}
                </div>
                <div
                  style={{
                    color: getSeverityColor(log.SeverityText),
                    fontWeight: 600,
                    minWidth: '60px'
                  }}
                >
                  {log.SeverityText || 'INFO'}
                </div>
                <div style={{ color: '#58a6ff', minWidth: '120px' }}>
                  {log.ServiceName}
                </div>
                <div style={{ flex: 1 }}>{log.Body}</div>
                {log.TraceId && (
                  <div style={{ color: '#8b949e', fontSize: '0.75rem' }}>
                    <code>{log.TraceId.substring(0, 8)}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LogsView;
