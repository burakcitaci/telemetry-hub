import { useEffect, useState, useMemo } from 'react';
import { getLogs, createEventSource, generateMockLogs } from '../api';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sidebar } from '@/components/sidebar';
import { Plus, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react';
import { LogDetailSheet } from '@/components/log-detail-sheet';

interface Log {
  Timestamp: string;
  TimestampTime: string;
  TraceId: string;
  SpanId: string;
  TraceFlags: number;
  SeverityText: string;
  SeverityNumber: number;
  ServiceName: string;
  Body: string;
  ResourceSchemaUrl?: string;
  ResourceAttributes?: Record<string, any>;
  ScopeSchemaUrl?: string;
  ScopeName?: string;
  ScopeVersion?: string;
  ScopeAttributes?: Record<string, any>;
  LogAttributes?: Record<string, any>;
}

function LogsView() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [severityFilters, setSeverityFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'timestamp' | 'service' | 'severity'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState<string>('6h');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);

  useEffect(() => {
    loadLogs(currentPage, pageSize);

    const eventSource = createEventSource();

    eventSource.onopen = () => {
      console.log('SSE connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.logs.length > 0) {
        console.log('New logs received', data.logs);
        loadLogs(currentPage, pageSize);
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

  const loadLogs = async (page: number, pageSize: number) => {
    console.log(page, pageSize);
    try {
      setLoading(true);
      const data = await getLogs(pageSize);
      console.log('Fetched logs:', data);
      setLogs(data);
      setError(null);
    } catch (err: any) {
      console.log('Using mock data for demonstration');
      setLogs(generateMockLogs(100));
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    setLoading(true);
    const newLogs = generateMockLogs(50);
    setLogs(prev => [...newLogs, ...prev].slice(0, 200));
    setLoading(false);
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

  const services = useMemo(() => {
    const uniqueServices = [...new Set(logs.map(log => log.ServiceName))];
    return uniqueServices.sort();
  }, [logs]);

  const metrics = useMemo(() => {
    const errorLogs = logs.filter(l => l.SeverityText === 'ERROR');
    const warnLogs = logs.filter(l => l.SeverityText === 'WARN');
    const infoLogs = logs.filter(l => l.SeverityText === 'INFO');

    return {
      totalLogs: logs.length,
      errorCount: errorLogs.length,
      warnCount: warnLogs.length,
      infoCount: infoLogs.length,
      logsPerMinute: (logs.length * 60).toFixed(0),
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    if (serviceFilters.length > 0) {
      filtered = filtered.filter(log => serviceFilters.includes(log.ServiceName || ''));
    }

    if (severityFilters.length > 0) {
      filtered = filtered.filter(log => severityFilters.includes(log.SeverityText || ''));
    }

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.Body.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ServiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.TraceId.toLowerCase().includes(searchTerm.toLowerCase())
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

      filtered = filtered.filter(log => {
        const logTime = new Date(log.Timestamp).getTime();
        return (now - logTime) <= rangeMs;
      });
    }
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.Timestamp).getTime();
          bValue = new Date(b.Timestamp).getTime();
          break;
        case 'service':
          aValue = a.ServiceName;
          bValue = b.ServiceName;
          break;
        case 'severity':
          aValue = a.SeverityText;
          bValue = b.SeverityText;
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
  }, [logs, searchTerm, serviceFilters, timeRange, severityFilters, sortBy, sortOrder]);

  const severityCounts = useMemo(() => ({
    ok: logs.filter(l => l.SeverityText === 'INFO').length,
    error: logs.filter(l => l.SeverityText === 'ERROR').length,
    total: logs.length
  }), [logs]);

  // Calculate total pages based on filtered results
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  // Paginate the filtered logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, pageSize]);

  if (loading && logs.length === 0) {
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
        statusCounts={severityCounts}
        selectedStatuses={severityFilters}
        onStatusesSelect={setSeverityFilters}
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
                {metrics.logsPerMinute} logs/min
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground dark:text-gray-300">Errors</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{metrics.errorCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground dark:text-gray-300">Warnings</span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">{metrics.warnCount}</span>
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
              <Button onClick={()=>loadLogs(currentPage,pageSize)} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="border-b border-border dark:border-slate-700 px-4 py-2 flex-shrink-0 bg-muted dark:bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
              <Search className="h-3 w-3 text-muted-foreground dark:text-gray-500 flex-shrink-0" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-xs border-input dark:border-slate-600 dark:bg-slate-700 dark:text-gray-50 dark:placeholder-gray-400"
              />
            </div>

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
                <SelectItem value="service-asc">Service A-Z</SelectItem>
                <SelectItem value="service-desc">Service Z-A</SelectItem>
                <SelectItem value="severity-desc">Severity High</SelectItem>
                <SelectItem value="severity-asc">Severity Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mx-4 mt-3">
            <AlertDescription>Error: {error}</AlertDescription>
          </Alert>
        )}

        {filteredLogs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-sm text-muted-foreground dark:text-gray-300 mb-3">
                {searchTerm || serviceFilters.length > 0 || severityFilters.length > 0
                  ? 'No logs match your filters'
                  : 'No logs found'}
              </div>
              {!searchTerm && serviceFilters.length === 0 && severityFilters.length === 0 && (
                <Button onClick={generateSampleData} size="sm">
                  Generate Sample Data
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-1 text-xs text-muted-foreground dark:text-gray-400 flex-shrink-0">
              {filteredLogs.length} logs
            </div>
            <div className="flex-1 overflow-auto">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 bg-muted dark:bg-slate-800 border-b border-border dark:border-slate-700 h-6">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-36 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Timestamp</TableHead>
                    <TableHead className="w-20 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Severity</TableHead>
                    <TableHead className="font-semibold text-foreground dark:text-gray-200 h-6 py-1">Service</TableHead>
                    <TableHead className="flex-1 min-w-48 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Message</TableHead>
                    <TableHead className="w-24 font-semibold text-foreground dark:text-gray-200 h-6 py-1">Trace ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log, idx) => (
                    <TableRow
                      key={`${log.Timestamp}-${idx}`}
                      className="cursor-pointer hover:bg-accent dark:hover:bg-slate-800/80 transition-colors border-b border-border dark:border-slate-700 h-7 bg-background dark:bg-slate-900"
                      onClick={() => {
                        setSelectedLog(log);
                        setIsLogDetailOpen(true);
                      }}
                    >
                      <TableCell className="text-muted-foreground dark:text-gray-300 py-1 px-3 whitespace-nowrap text-xs">
                        {(() => {
                          try {
                            return format(new Date(log.Timestamp), 'MMM dd HH:mm:ss.SSS');
                          } catch {
                            return 'Invalid date';
                          }
                        })()}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        {getSeverityBadge(log.SeverityText)}
                      </TableCell>
                      <TableCell className="py-1 px-2">
                        <Badge variant="outline" className="text-xs font-medium py-0.5 px-2">
                          {log.ServiceName || 'Unknown Service'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground dark:text-gray-200 py-1 px-2 truncate text-xs" title={log.Body}>
                        {log.Body}
                      </TableCell>
                      <TableCell className="text-muted-foreground dark:text-gray-300 py-1 px-2 whitespace-nowrap text-xs">
                        {log.TraceId ? log.TraceId.substring(0, 8) : (log.SpanId ? log.SpanId.substring(0, 8) : 'N/A')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-background dark:bg-slate-800">
                <div className="text-xs text-muted-foreground">
                  Page {currentPage} of {totalPages} ({filteredLogs.length} total)
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
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p +1)}
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

        {/* Log Detail Sheet */}
        <LogDetailSheet
          log={selectedLog}
          isOpen={isLogDetailOpen}
          onClose={() => {
            setIsLogDetailOpen(false);
            setSelectedLog(null);
          }}
        />
      </div>
    </div>
  );
}

export default LogsView;
