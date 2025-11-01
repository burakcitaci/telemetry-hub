import { useEffect, useState, useMemo } from 'react';
import { getMetrics, createEventSource, generateMockMetrics } from '../api';
import { formatDistance, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/sidebar';
import { MetricDetailSheet } from '@/components/metric-detail-sheet.tsx';
import { Search, RefreshCw, Wifi, WifiOff, Plus, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DataTable, DataTableColumnHeader } from '@/components/data-table';
import { ColumnDef } from "@tanstack/react-table";

interface Metric {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  interval: number;
  originProduct: string;
  subproduct: string;
  productDetail: string;
  ingestedCustomMetrics: number;
  indexedCustomMetrics: number;
  hosts: number;
  tagValues: number;
  tags: Record<string, string[]>;
  historicalMetrics: boolean;
}

function MetricsView() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'name'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const columns: ColumnDef<Metric>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="text-foreground dark:text-gray-200 py-1 px-2 truncate text-xs" title={name}>
            {name}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <div className="py-1 px-2">
            <Badge variant="outline" className="text-xs font-medium py-0.5 px-2">
              {type}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "ingestedCustomMetrics",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Value" />
      ),
      cell: ({ row }) => {
        const value = row.getValue("ingestedCustomMetrics") as number;
        return (
          <div className="text-muted-foreground dark:text-gray-300 py-1 px-2 whitespace-nowrap text-xs">
            {value?.toFixed(2) || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: "originProduct",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product" />
      ),
      cell: ({ row }) => {
        const product = row.getValue("originProduct") as string;
        return (
          <div className="text-muted-foreground dark:text-gray-300 py-1 px-2 whitespace-nowrap text-xs">
            {product || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Updated" />
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue("updatedAt") as string;
        return (
          <div className="text-muted-foreground dark:text-gray-300 py-1 px-2 whitespace-nowrap text-xs">
            {(() => {
              try {
                return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
              } catch {
                return 'Invalid date';
              }
            })()}
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    loadMetrics(currentPage, pageSize);

    const eventSource = createEventSource();

    eventSource.onopen = () => {
      console.log('SSE connected');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'update' && data.metrics.length > 0) {
        console.log('New metrics received', data.metrics);
        loadMetrics(currentPage, pageSize);
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

  const loadMetrics = async (page: number, pageSize: number) => {
    console.log(page, pageSize);
    try {
      setLoading(true);
      const data = await getMetrics(page, pageSize);
      console.log('Fetched metrics:', data);
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      console.log('Using mock data for demonstration');
      setMetrics(generateMockMetrics(50));
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    setLoading(true);
    const newMetrics = generateMockMetrics(25);
    setMetrics(prev => [...newMetrics, ...prev].slice(0, 100));
    setLoading(false);
  };

  const types = useMemo(() => {
    const uniqueTypes = [...new Set(metrics.map(metric => metric.type))];
    return uniqueTypes.sort();
  }, [metrics]);

  const products = useMemo(() => {
    const uniqueProducts = [...new Set(metrics.map(metric => metric.originProduct))];
    return uniqueProducts.sort();
  }, [metrics]);

  const metricsSummary = useMemo(() => {
    return {
      totalMetrics: metrics.length,
      customMetrics: metrics.filter(m => m.ingestedCustomMetrics > 0).length,
      activeHosts: metrics.reduce((sum, m) => sum + m.hosts, 0),
      totalTags: metrics.reduce((sum, m) => sum + m.tagValues, 0),
    };
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    let filtered = metrics;

    if (typeFilters.length > 0) {
      filtered = filtered.filter(metric => typeFilters.includes(metric.type));
    }

    if (productFilters.length > 0) {
      filtered = filtered.filter(metric => productFilters.includes(metric.originProduct));
    }

    if (searchTerm) {
      filtered = filtered.filter(metric =>
        metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        metric.originProduct.toLowerCase().includes(searchTerm.toLowerCase()) ||
        metric.subproduct.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    console.log('Applying time range filter:', timeRange);
    if(timeRange) {
      const now = Date.now();
      let rangeMs = 24 * 60 * 60 * 1000; // default 24 hours

      if (timeRange.endsWith('m')) {
        rangeMs = parseInt(timeRange) * 60 * 1000;
      } else if (timeRange.endsWith('h')) {
        rangeMs = parseInt(timeRange) * 60 * 60 * 1000;
      } else if (timeRange.endsWith('d')) {
        rangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000;
      }

      filtered = filtered.filter(metric => {
        const metricTime = new Date(metric.updatedAt).getTime();
        return (now - metricTime) <= rangeMs;
      });
    }

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
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
  }, [metrics, searchTerm, typeFilters, productFilters, timeRange, sortBy, sortOrder]);

  const handleRowClick = (metric: Metric) => {
    setSelectedMetric(metric);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setSelectedMetric(null);
  };

  // Calculate total pages based on filtered results
  const totalPages = Math.ceil(filteredMetrics.length / pageSize) || 1;

  // Paginate the filtered metrics
  const paginatedMetrics = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredMetrics.slice(startIndex, endIndex);
  }, [filteredMetrics, currentPage, pageSize]);

  const statusCounts = useMemo(() => ({
    ok: metrics.filter(m => m.historicalMetrics).length,
    error: metrics.filter(m => !m.historicalMetrics).length,
    total: metrics.length
  }), [metrics]);

  const exportToCSV = () => {
    const csvContent = [
      ['Metric Name', 'Created At', 'Updated At', 'Type', 'Origin Product'],
      ...filteredMetrics.map(metric => [
        metric.name,
        format(new Date(metric.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        format(new Date(metric.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
        metric.type,
        metric.originProduct
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'metrics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && metrics.length === 0) {
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
        services={types}
        selectedServices={typeFilters}
        onServicesSelect={setTypeFilters}
        statusCounts={statusCounts}
        selectedStatuses={productFilters}
        onStatusesSelect={setProductFilters}
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
                {metricsSummary.totalMetrics} metrics
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground dark:text-gray-300">Custom</span>
                  <span className="font-semibold text-foreground dark:text-gray-100">{metricsSummary.customMetrics}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground dark:text-gray-300">Hosts</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{metricsSummary.activeHosts}</span>
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
              <Button onClick={exportToCSV} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
                <Download className="h-3 w-3 mr-1" />
                Export CSV
              </Button>
              <Button onClick={generateSampleData} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
                <Plus className="h-3 w-3 mr-1" />
                Generate
              </Button>
              <Button onClick={()=>loadMetrics(currentPage,pageSize)} variant="ghost" size="sm" className="h-6 px-2 text-xs dark:hover:bg-slate-800">
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
                <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
                <SelectItem value="updatedAt-asc">Least Recent</SelectItem>
                <SelectItem value="createdAt-desc">Recently Created</SelectItem>
                <SelectItem value="createdAt-asc">Oldest</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mx-4 mt-3">
            <AlertDescription>Error: {error}</AlertDescription>
          </Alert>
        )}

        {filteredMetrics.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-sm text-muted-foreground dark:text-gray-300 mb-3">
                {searchTerm || typeFilters.length > 0 || productFilters.length > 0
                  ? 'No metrics match your filters'
                  : 'No metrics found'}
              </div>
              {!searchTerm && typeFilters.length === 0 && productFilters.length === 0 && (
                <Button onClick={generateSampleData} size="sm">
                  Generate Sample Data
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-1 text-xs text-muted-foreground dark:text-gray-400 flex-shrink-0">
              Showing {paginatedMetrics.length} of {filteredMetrics.length} metrics
            </div>
            <div className="flex-1 px-2 ‚overflow-auto">
              <DataTable
                columns={columns}
                data={paginatedMetrics}
                searchPlaceholder="Search metrics..."
                enableRowSelection={false}
                enableColumnVisibility={true}
                enablePagination={true}
                pageSize={pageSize}
                onRowClick={(row) => handleRowClick(row)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Metric Detail Sheet */}
      <MetricDetailSheet
        metric={selectedMetric}
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
      />
    </div>
  );
}

export default MetricsView;
