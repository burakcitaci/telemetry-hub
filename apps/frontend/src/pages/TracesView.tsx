import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTraces, createEventSource, generateMockTraces, getTraceById, generateMockTraceDetail } from '../api';
import { formatDistance, format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw, Wifi, WifiOff, Database, Plus, Filter, Clock, ArrowUpDown, Eye, Activity, Database as DatabaseIcon, Server, Globe, Zap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Trace {
  TraceId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes?: Record<string, string>;
  Resource?: string;
  Method?: string;
}

function TracesView() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration' | 'service'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState<string>('15m');
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
      // Fallback to mock data when backend is not available
      console.log('Using mock data for demonstration');
      setTraces(generateMockTraces(50));
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    setLoading(true);
    // Generate new mock traces with current timestamp
    const newTraces = generateMockTraces(25);
    setTraces(prev => [...newTraces, ...prev].slice(0, 100)); // Keep max 100 traces
    setLoading(false);
  };

  const services = useMemo(() => {
    const uniqueServices = [...new Set(traces.map(trace => trace.ServiceName))];
    return uniqueServices.sort();
  }, [traces]);

  const operations = useMemo(() => {
    const uniqueOperations = [...new Set(traces.map(trace => trace.SpanName))];
    return uniqueOperations.sort();
  }, [traces]);

  const methods = useMemo(() => {
    const uniqueMethods = [...new Set(traces.map(trace => trace.Method || trace.SpanAttributes?.['http.method']))].filter(Boolean);
    return uniqueMethods.sort();
  }, [traces]);

  // Calculate metrics for summary cards
  const metrics = useMemo(() => {
    const okTraces = traces.filter(t => t.StatusCode === 'OK');
    const errorTraces = traces.filter(t => t.StatusCode === 'ERROR');
    const durations = traces.map(t => t.Duration / 1000000); // Convert to ms
    
    return {
      totalTraces: traces.length,
      successCount: okTraces.length,
      errorCount: errorTraces.length,
      successRate: traces.length > 0 ? ((okTraces.length / traces.length) * 100).toFixed(1) : 0,
      avgDuration: durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : 0,
      p99Duration: durations.length > 0 ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)] : 0,
      p95Duration: durations.length > 0 ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] : 0,
    };
  }, [traces]);

  const formatDuration = (nanoseconds: number) => {
    const microseconds = nanoseconds / 1000;
    if (microseconds < 1000) {
      return `${microseconds.toFixed(1)}μs`;
    } else {
      const ms = microseconds / 1000;
      return `${ms.toFixed(1)}ms`;
    }
  };

  const formatDurationMs = (nanoseconds: number) => {
    const ms = nanoseconds / 1000000;
    return ms.toFixed(1);
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  };

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes('mongodb') || serviceName.includes('mongo')) {
      return <DatabaseIcon className="h-3 w-3 text-green-600" />;
    }
    if (serviceName.includes('redis') || serviceName.includes('cache')) {
      return <Zap className="h-3 w-3 text-red-500" />;
    }
    if (serviceName.includes('api') || serviceName.includes('gtw')) {
      return <Globe className="h-3 w-3 text-blue-500" />;
    }
    if (serviceName.includes('ingestion') || serviceName.includes('engine')) {
      return <Server className="h-3 w-3 text-purple-500" />;
    }
    return <Server className="h-3 w-3 text-gray-500" />;
  };

  const getServiceColor = (serviceName: string) => {
    if (serviceName.includes('mongodb') || serviceName.includes('mongo')) {
      return 'bg-green-100 text-green-800';
    }
    if (serviceName.includes('redis') || serviceName.includes('cache')) {
      return 'bg-red-100 text-red-800';
    }
    if (serviceName.includes('api') || serviceName.includes('gtw')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (serviceName.includes('ingestion') || serviceName.includes('engine')) {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-gray-100 text-gray-800';
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
    let filtered = traces;

    // Apply service filter
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(trace => trace.ServiceName === serviceFilter);
    }

    // Apply operation filter
    if (operationFilter !== 'all') {
      filtered = filtered.filter(trace => trace.SpanName === operationFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trace => trace.StatusCode === statusFilter);
    }

    // Apply method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(trace =>
        (trace.Method || trace.SpanAttributes?.['http.method']) === methodFilter
      );
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trace =>
        trace.TraceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.SpanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.Resource?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.Timestamp).getTime();
          bValue = new Date(b.Timestamp).getTime();
          break;
        case 'duration':
          aValue = a.Duration;
          bValue = b.Duration;
          break;
        case 'service':
          aValue = a.ServiceName;
          bValue = b.ServiceName;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [traces, searchTerm, serviceFilter, operationFilter, statusFilter, methodFilter, sortBy, sortOrder]);

  const maxDuration = useMemo(() => {
    return Math.max(...traces.map(t => t.Duration), 1);
  }, [traces]);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">APM</h1>
          <p className="text-sm text-gray-600">Real-time distributed tracing data</p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <Wifi className="h-4 w-4" />
              <span>Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
              <WifiOff className="h-4 w-4" />
              <span>Disconnected</span>
            </div>
          )}
          <Button onClick={generateSampleData} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Generate Data
          </Button>
          <Button onClick={loadTraces} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards - Datadog Style */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Requests</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{metrics.totalTraces}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Success Rate</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{metrics.successRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Avg Duration</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{metrics.avgDuration}ms</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">P95 Duration</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{metrics.p95Duration?.toFixed(1)}ms</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Errors</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">{metrics.errorCount}</p>
            </div>
            <Database className="h-8 w-8 text-red-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <Input
            placeholder="Search traces by ID, operation, service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-gray-200"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-400" />
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map(service => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OK">Success</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-');
            setSortBy(field as any);
            setSortOrder(order as any);
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timestamp-desc">Latest First</SelectItem>
              <SelectItem value="timestamp-asc">Oldest First</SelectItem>
              <SelectItem value="duration-desc">Slowest First</SelectItem>
              <SelectItem value="duration-asc">Fastest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      {filteredTraces.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-2">
            {searchTerm || serviceFilter !== 'all' || statusFilter !== 'all'
              ? 'No traces match your filters'
              : 'No traces found'}
          </div>
          {!searchTerm && serviceFilter === 'all' && statusFilter === 'all' && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Click "Generate Data" to create sample traces for demonstration
              </div>
              <Button onClick={generateSampleData} className="gap-2">
                <Database className="h-4 w-4" />
                Generate Sample Traces
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600 font-medium">
              Showing {filteredTraces.length} of {traces.length} traces
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-700">{filteredTraces.filter(t => t.StatusCode === 'OK').length} Successful</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-gray-700">{filteredTraces.filter(t => t.StatusCode === 'ERROR').length} Errors</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/40 border-b border-gray-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-40 font-semibold text-gray-900">Timestamp</TableHead>
                    <TableHead className="w-40 font-semibold text-gray-900">Service</TableHead>
                    <TableHead className="min-w-64 font-semibold text-gray-900">Operation</TableHead>
                    <TableHead className="w-32 font-semibold text-gray-900">Method</TableHead>
                    <TableHead className="w-32 font-semibold text-gray-900">Duration</TableHead>
                    <TableHead className="w-24 font-semibold text-gray-900">Status</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredTraces.map((trace, idx) => (
                  <TableRow
                    key={`${trace.TraceId}-${idx}`}
                    className="cursor-pointer hover:bg-blue-50/50 transition-colors border-b border-gray-100"
                    onClick={() => handleRowClick(trace.TraceId)}
                  >
                    <TableCell className="text-xs text-gray-600">
                      {format(new Date(trace.Timestamp), 'MMM dd HH:mm:ss.SSS')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getServiceIcon(trace.ServiceName)}
                        <Badge variant="outline" className={`text-xs font-medium ${getServiceColor(trace.ServiceName)}`}>
                          {trace.ServiceName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-64 truncate text-gray-900" title={trace.SpanName}>
                      {trace.SpanName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-medium">
                        {trace.Method || trace.SpanAttributes?.['http.method'] || 'GET'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-5 bg-gray-100 rounded-sm overflow-hidden relative">
                          <div
                            className={`h-full transition-all ${
                              trace.StatusCode === 'ERROR' ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{
                              width: `${(trace.Duration / maxDuration) * 100}%`,
                              minWidth: '2px'
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 min-w-14">
                          {formatDuration(trace.Duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={trace.StatusCode === 'ERROR' ? 'destructive' : 'success'}
                        className="text-xs font-medium"
                      >
                        {trace.StatusCode === 'ERROR' ? 'ERROR' : 'OK'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export default TracesView;
