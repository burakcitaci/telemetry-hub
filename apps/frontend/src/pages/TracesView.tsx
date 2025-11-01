import { useEffect, useState, useMemo } from 'react';
import { getTraces, createEventSource, generateMockTraces, getTraceById, generateMockTraceDetail } from '../api';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/sidebar';
import { TraceDetailSheet } from '@/components/trace-detail-sheet';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { Search, RefreshCw, Wifi, WifiOff, Plus, Filter, Clock, Database as DatabaseIcon, Server, Globe, Zap, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ColumnDef } from "@tanstack/react-table";

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
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'timestamp' | 'duration' | 'service'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState<string>('6h');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const columns: ColumnDef<Trace>[] = [
    {
      accessorKey: "Timestamp",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue("Timestamp") as string;
        return (
          <div className="text-muted-foreground dark:text-gray-300 py-1 px-3 whitespace-nowrap text-xs">
            {(() => {
              try {
                return format(new Date(timestamp), 'MMM dd HH:mm:ss.SSS');
              } catch {
                return 'Invalid date';
              }
            })()}
          </div>
        );
      },
    },
    {
      accessorKey: "ServiceName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Service" />
      ),
      cell: ({ row }) => {
        const serviceName = row.getValue("ServiceName") as string;
        return (
          <div className="py-1 px-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-xs font-medium py-0.5 px-2 inline-block}`}>
                {serviceName || 'Unknown Service'}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "SpanName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resource" />
      ),
      cell: ({ row }) => {
        const spanName = row.getValue("SpanName") as string;
        const resource = row.original.Resource;
        return (
          <div className="text-foreground dark:text-gray-200 py-1 px-2 truncate text-xs" title={resource || spanName}>
            {resource || spanName}
          </div>
        );
      },
    },
    {
      accessorKey: "Duration",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) => {
        const duration = row.getValue("Duration") as number;
        return (
          <div className="text-muted-foreground dark:text-gray-300 py-1 px-2 whitespace-nowrap text-xs">
            {formatDuration(duration)}
          </div>
        );
      },
    },
    {
      accessorKey: "Method",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Method" />
      ),
      cell: ({ row }) => {
        const method = row.getValue("Method") as string;
        const spanAttributes = row.original.SpanAttributes;
        const methodValue = method || spanAttributes?.['http.method'] || 'N/A';
        return (
          <div className="py-1 px-2">
            <span className="text-xs font-medium text-foreground dark:text-gray-200 bg-muted dark:bg-slate-700 px-2 py-1 rounded inline-block">
              {methodValue}
            </span>
          </div>
        );
      },
    },
  ];


  useEffect(() => {
    loadTraces(currentPage, pageSize);

    const eventSource = createEventSource();

    eventSource.onopen = () => {
      console.log('SSE connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.traces.length > 0) {
        console.log('New traces received', data.traces);
        loadTraces(currentPage, pageSize);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE error');
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [pageSize, currentPage]);

  const loadTraces = async (page: number, pageSize: number) => {
    console.log(page, pageSize);
    try {
      setLoading(true);
      const data = await getTraces(page, pageSize);
      console.log('Fetched traces:', data);
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

  const filteredTraces = useMemo(() => {
    let filtered = traces;

    if (serviceFilters.length > 0) {
      filtered = filtered.filter(trace => serviceFilters.includes(trace.ServiceName || ''));
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter(trace => statusFilters.includes(trace.StatusCode || ''));
    }

    if (searchTerm) {
      filtered = filtered.filter(trace =>
        trace.TraceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.SpanName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trace.Resource?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    console.log('Applying time range filter:', timeRange);
    if(timeRange) {
      const now = Date.now();
      let rangeMs = 15 * 60 * 1000; // default 15 minutes

      if (timeRange.endsWith('m')) {
        rangeMs = parseInt(timeRange) * 60 * 1000;
      } else if (timeRange.endsWith('h')) {
        rangeMs = parseInt(timeRange) * 60 * 60 * 1000;
      } else if (timeRange.endsWith('d')) {
        rangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000;
      }

      filtered = filtered.filter(trace => {
        const traceTime = new Date(trace.Timestamp).getTime();
        return (now - traceTime) <= rangeMs;
      });
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
  }, [traces, searchTerm, serviceFilters, timeRange, statusFilters, sortBy, sortOrder]);

  const maxDuration = useMemo(() => {
    return Math.max(...traces.map(t => t.Duration), 1);
  }, [traces]);

  const handleRowClick = (traceId: string) => {
    setSelectedTraceId(traceId);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setSelectedTraceId(null);
  };


  // Server handles pagination, so we estimate total pages based on current results
  // If we get fewer results than pageSize, we're at the last page
  const totalPages = traces.length < pageSize ? currentPage : currentPage + 1;

  // Since backend handles pagination, display traces directly
  const paginatedTraces = useMemo(() => {
    return filteredTraces;
  }, [filteredTraces]);

  const statusCounts = useMemo(() => ({
    ok: traces.filter(t => t.StatusCode === 'OK').length,
    error: traces.filter(t => t.StatusCode === 'ERROR').length,
    total: traces.length
  }), [traces]);

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
    <div className="flex h-screen bg-background dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        services={services}
        selectedServices={serviceFilters}
        onServicesSelect={setServiceFilters}
        statusCounts={statusCounts}
        selectedStatuses={statusFilters}
        onStatusesSelect={setStatusFilters}
        timeRange={timeRange}
        onTimeRangeSelect={setTimeRange}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border dark:border-slate-700 px-4 py-3 flex-shrink-0 bg-background dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
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
              <Button onClick={()=>loadTraces(currentPage,pageSize)} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="border-b border-border dark:border-slate-700 px-4 py-2 flex-shrink-0 bg-muted dark:bg-slate-800">
          <div className="flex items-center gap-3">
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
                {searchTerm || serviceFilters.length > 0 || statusFilters.length > 0
                  ? 'No traces match your filters'
                  : 'No traces found'}
              </div>
              {!searchTerm && serviceFilters.length === 0 && statusFilters.length === 0 && (
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
            <div className="flex-1 px-2 overflow-auto">
              <DataTable
                columns={columns}
                data={paginatedTraces}
                searchPlaceholder="Search traces..."
                enableRowSelection={false}
                enableColumnVisibility={true}
                enablePagination={true}
                pageSize={pageSize}
                onRowClick={(row) => handleRowClick(row.TraceId)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Trace Detail Sheet */}
      <TraceDetailSheet
        traceId={selectedTraceId}
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
      />
    </div>
  );
}

export default TracesView;
