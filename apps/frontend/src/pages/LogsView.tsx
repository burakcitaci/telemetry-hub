import { useEffect, useState, useMemo } from 'react';
import { getLogs, createEventSource } from '../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, RefreshCw, Wifi, WifiOff, Filter, Clock } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');

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

  const getSeverityBadge = (severity: string) => {
    const variant = severity?.toUpperCase() === 'ERROR' || severity?.toUpperCase() === 'FATAL' ? 'destructive' :
                   severity?.toUpperCase() === 'WARN' ? 'warning' :
                   severity?.toUpperCase() === 'INFO' ? 'info' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs">
        {severity || 'INFO'}
      </Badge>
    );
  };

  const getUniqueServices = () => {
    const services = logs.map(log => log.ServiceName).filter(Boolean);
    return Array.from(new Set(services));
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm ||
        log.Body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.TraceId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity = severityFilter === 'all' ||
        log.SeverityText?.toUpperCase() === severityFilter.toUpperCase();

      const matchesService = serviceFilter === 'all' ||
        log.ServiceName === serviceFilter;

      return matchesSearch && matchesSeverity && matchesService;
    });
  }, [logs, searchTerm, severityFilter, serviceFilter]);

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-24" />
            </div>
            <CardDescription>
              <Skeleton className="h-4 w-48" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 flex-1" />
                </div>
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
                Logs
                {connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>Real-time log streaming</CardDescription>
            </div>
            <Button onClick={loadLogs} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {getUniqueServices().map(service => (
                    <SelectItem key={service} value={service}>{service}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>Error: {error}</AlertDescription>
            </Alert>
          )}

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">
                {searchTerm || severityFilter !== 'all' || serviceFilter !== 'all'
                  ? 'No logs match your filters'
                  : 'No logs found'}
              </div>
              <div className="text-sm text-muted-foreground">
                Logs will appear here as they are generated
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2">
                Showing {filteredLogs.length} of {logs.length} logs
              </div>
              <ScrollArea className="h-[600px] rounded-md border">
                <div className="space-y-1">
                  {filteredLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(log.Timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="min-w-0 flex-shrink-0">
                        {getSeverityBadge(log.SeverityText)}
                      </div>

                      <div className="min-w-0 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {log.ServiceName}
                        </Badge>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-mono break-all">
                          {log.Body}
                        </div>
                      </div>

                      {log.TraceId && (
                        <div className="min-w-0 flex-shrink-0">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {log.TraceId.substring(0, 8)}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LogsView;
