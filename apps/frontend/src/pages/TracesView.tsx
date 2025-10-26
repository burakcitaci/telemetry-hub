import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTraces, createEventSource } from '../api';
import { formatDistance } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw, Wifi, WifiOff } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
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
    const variant = status === 'ERROR' ? 'destructive' :
                   status === 'OK' ? 'success' : 'secondary';
    return (
      <Badge variant={variant}>
        {status || 'UNSET'}
      </Badge>
    );
  };

  const filteredTraces = useMemo(() => {
    if (!searchTerm) return traces;
    return traces.filter(trace =>
      trace.TraceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trace.SpanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trace.ServiceName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [traces, searchTerm]);

  const handleRowClick = (traceId: string) => {
    navigate(`/trace/${traceId}`);
  };

  if (loading && traces.length === 0) {
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
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Traces
                {connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>Real-time distributed tracing data</CardDescription>
            </div>
            <Button onClick={loadTraces} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search traces by ID, span name, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
          )}

          {filteredTraces.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">
                {searchTerm ? 'No traces match your search' : 'No traces found'}
              </div>
              {!searchTerm && (
                <div className="text-sm text-muted-foreground">
                  Send a request to the Backend to generate traces
                </div>
              )}
              <code className="block mt-4 p-3 bg-muted rounded-md text-sm font-mono max-w-md mx-auto">
                curl http://localhost:3001/api/data
              </code>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trace ID</TableHead>
                    <TableHead>Span Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTraces.map((trace, idx) => (
                    <TableRow
                      key={`${trace.TraceId}-${idx}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(trace.TraceId)}
                    >
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {trace.TraceId.substring(0, 16)}...
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{trace.SpanName}</TableCell>
                      <TableCell>{trace.ServiceName}</TableCell>
                      <TableCell>{formatDuration(trace.Duration)}</TableCell>
                      <TableCell>{getStatusBadge(trace.StatusCode)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(trace.Timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TracesView;
