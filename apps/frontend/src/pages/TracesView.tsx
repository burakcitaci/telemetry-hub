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
import { Search, RefreshCw, Wifi, WifiOff, Plus, Filter, Clock, Database as DatabaseIcon, Server, Globe, Zap, TrendingUp } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      console.log('Using mock data for demonstration');
      setTraces(generateMockTraces(50));
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    setLoading(true);
    const newTraces = generateMockTraces(25);
    setTraces(prev => [...newTraces, ...prev].slice(0, 100));
    setLoading(false);
  };

  const services = useMemo(() => {
    const uniqueServices = [...new Set(traces.map(trace => trace.ServiceName))];
    return uniqueServices.sort();
  }, [traces]);

  const metrics = useMemo(() => {
    const okTraces = traces.filter(t => t.StatusCode === 'OK');
    const errorTraces = traces.filter(t => t.StatusCode === 'ERROR');
    const durations = traces.map(t => t.Duration / 1000000);

    return {
      totalTraces: traces.length,
      successCount: okTraces.length,
      errorCount: errorTraces.length,
      successRate: traces.length > 0 ? ((okTraces.length / traces.length) * 100).toFixed(1) : 0,
      avgDuration: durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : 0,
      p99Duration: durations.length > 0 ? durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)] : 0,
      spansPerSecond: (traces.length * 60).toFixed(0),
    };
  }, [traces]);

  const formatDuration = (nanoseconds: number) => {
    const microseconds = nanoseconds / 1000;
    if (microseconds < 1000) {
      return `${microseconds.toFixed(1)}μs`;
    } else {
      const ms = microseconds / 1000;
      return `${ms.toFixed(2)}ms`;
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'OK') {
      return <Badge variant="success" className="text-xs font-semibold py-0.5 px-2">200</Badge>;
    } else if (status === 'ERROR') {
      return <Badge variant="destructive" className="text-xs font-semibold py-0.5 px-2">ERROR</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2">N/A</Badge>;
    }
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

  const filteredTraces = useMemo(() => {
    let filtered = traces;

    if (serviceFilter !== 'all') {
      filtered = filtered.filter(trace => trace.ServiceName === serviceFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(trace => trace.StatusCode === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(trace =>
        trace.TraceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.SpanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.Resource?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

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
  }, [traces, searchTerm, serviceFilter, statusFilter, sortBy, sortOrder]);

  const maxDuration = useMemo(() => {
    return Math.max(...traces.map(t => t.Duration), 1);
  }, [traces]);

  const handleRowClick = (traceId: string) => {
    navigate(`/trace/${traceId}`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(filteredTraces.length / pageSize);

  const paginatedTraces = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTraces.slice(start, start + pageSize);
  }, [filteredTraces, currentPage, pageSize]);

  if (loading && traces.length === 0) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-8 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-1 rounded-sm  dark:border-slate-200 bg-background dark:bg-slate-950">
      {/* Compact Header */}
      <div className="border-b border-border rounded-sm dark:border-slate-700 px-4 py-3 flex-shrink-0 bg-background dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground dark:text-gray-50">
            {metrics.spansPerSecond} spans/s
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground dark:text-gray-300">P99</span>
              <span className="font-semibold text-foreground dark:text-gray-100">{metrics.p99Duration?.toFixed(2)}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground dark:text-gray-300">Errors</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{metrics.errorCount}</span>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400 font-medium">Offline</span>
                </>
              )}
            </div>
            <Button onClick={generateSampleData} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
              <Plus className="h-3 w-3 mr-1" />
              Generate
            </Button>
            <Button onClick={loadTraces} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Bar - Compact */}
      <div className="border-b border-border dark:border-slate-700 px-4 py-2 flex-shrink-0 bg-muted dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
            <Search className="h-3 w-3 text-muted-foreground dark:text-gray-500 flex-shrink-0" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs border-input dark:border-slate-600 dark:bg-slate-700 dark:text-gray-50 dark:placeholder-gray-400"
            />
          </div>

          <Filter className="h-3 w-3 text-muted-foreground dark:text-gray-500 flex-shrink-0" />

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28 h-7 text-xs border-input dark:border-slate-600 dark:bg-slate-700 dark:text-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="6h">6h</SelectItem>
              <SelectItem value="24h">24h</SelectItem>
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-40 h-7 text-xs border-input dark:border-slate-600 dark:bg-slate-700 dark:text-gray-50">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
              <SelectItem value="all">All Services</SelectItem>
              {services.map(service => (
                <SelectItem key={service} value={service}>
                  {service}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 h-7 text-xs border-input dark:border-slate-600 dark:bg-slate-700 dark:text-gray-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
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
            <SelectTrigger className="w-32 h-7 text-xs border-input dark:border-slate-600 dark:bg-slate-700 dark:text-gray-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
              <SelectItem value="timestamp-desc">Latest</SelectItem>
              <SelectItem value="timestamp-asc">Oldest</SelectItem>
              <SelectItem value="duration-desc">Slowest</SelectItem>
              <SelectItem value="duration-asc">Fastest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mx-4 mt-3">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      )}

      {filteredTraces.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="text-sm text-muted-foreground dark:text-gray-300 mb-3">
              {searchTerm || serviceFilter !== 'all' || statusFilter !== 'all'
                ? 'No traces match your filters'
                : 'No traces found'}
            </div>
            {!searchTerm && serviceFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={generateSampleData} size="sm">
                Generate Sample Data
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-1 text-xs text-muted-foreground dark:text-gray-400 flex-shrink-0">
            {filteredTraces.length} traces
          </div>
          <div className="flex-1 overflow-auto">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 bg-muted dark:bg-slate-800 border-b border-border dark:border-slate-700 h-6">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-36 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Date</TableHead>
                  <TableHead className="font-semibold text-foreground dark:text-gray-200 h-6 py-1">Service</TableHead>
                  <TableHead className="flex-1 min-w-48 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Resource</TableHead>
                  <TableHead className="w-24 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Duration</TableHead>
                  <TableHead className="w-24 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Method</TableHead>
                  <TableHead className="w-16 font-semibold text-foreground dark:text-gray-200 h-6 py-1 text-right pr-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTraces.map((trace, idx) => (
                  <TableRow
                    key={`${trace.TraceId}-${idx}`}
                    className="cursor-pointer hover:bg-accent dark:hover:bg-slate-800/80 transition-colors border-b border-border dark:border-slate-700 h-7 bg-background dark:bg-slate-900"
                    onClick={() => handleRowClick(trace.TraceId)}
                  >
                    <TableCell className="text-muted-foreground dark:text-gray-300 py-1 px-3 whitespace-nowrap text-xs">
                      {format(new Date(trace.Timestamp), 'MMM dd HH:mm:ss.SSS')}
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <div className="flex items-center gap-1.5">
                        {getServiceIcon(trace.ServiceName)}
                        <Badge variant="outline" className={`text-xs font-medium py-0.5 px-2 inline-block ${getServiceColor(trace.ServiceName)}`}>
                          {trace.ServiceName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground dark:text-gray-200 py-1 px-2 truncate text-xs" title={trace.SpanName}>
                      {trace.Resource || trace.SpanName}
                    </TableCell>
                    <TableCell className="text-muted-foreground dark:text-gray-300 py-1 px-2 whitespace-nowrap text-xs">
                      {formatDuration(trace.Duration)}
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <span className="text-xs font-medium text-foreground dark:text-gray-200 bg-muted dark:bg-slate-700 px-2 py-1 rounded inline-block">
                        {trace.Method || trace.SpanAttributes?.['http.method'] || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="py-1 px-2 text-right pr-2">
                      {getStatusIcon(trace.StatusCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

            </Table>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-background dark:bg-slate-800">
              <div className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredTraces.length} total)
              </div>
              <div className="flex items-center gap-2">
                <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(parseInt(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-7 w-[70px] text-xs bg-background border-input dark:bg-slate-700 dark:border-slate-600">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-slate-700 dark:border-slate-600">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="h-7 px-2 text-xs bg-background dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="h-7 px-2 text-xs bg-background dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}
    </div>
  );
}

export default TracesView;
