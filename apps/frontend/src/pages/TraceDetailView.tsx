import { useEffect, useState, ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTraceById, generateMockTraceDetail } from '../api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Activity, Server, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface Span {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  ServiceName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes?: Record<string, string>;
  Resource?: string;
  Method?: string;
}

function TraceDetailView() {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());

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
      console.log('Using mock trace data for demonstration');
      setSpans(generateMockTraceDetail(traceId!));
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (nanoseconds: number) => {
    const ms = nanoseconds / 1000000;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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

    return { left, width: Math.max(width, 0.5) };
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ERROR':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'OK':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'ERROR' ? 'destructive' : status === 'OK' ? 'success' : 'secondary';
    return (
      <div className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="text-xs">{status || 'UNSET'}</span>
      </div>
    );
  };

  const getServiceColor = (serviceName: string) => {
    const colors = {
      'api-gateway': 'bg-purple-500',
      'user-service': 'bg-blue-500',
      'order-service': 'bg-green-500',
      'payment-service': 'bg-yellow-500',
      'inventory-service': 'bg-red-500',
      'shipping-service': 'bg-indigo-500',
      'auth-service': 'bg-pink-500',
      'notification-service': 'bg-orange-500'
    };
    return colors[serviceName as keyof typeof colors] || 'bg-gray-500';
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

    spans.forEach(span => {
      const children = childMap.get(span.SpanId) || [];
      children.sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
      childMap.set(span.SpanId, children);
    });

    const renderSpan = (span: Span, depth: number = 0): ReactElement => {
      const position = getSpanPosition(span);
      const children = childMap.get(span.SpanId) || [];
      const isExpanded = expandedSpans.has(span.SpanId);

      return (
        <div key={span.SpanId}>
          <div
            className={`flex items-center h-8 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer border-l-2 ${
              selectedSpan?.SpanId === span.SpanId ? 'bg-blue-50 dark:bg-slate-800 border-l-blue-500' : 'border-l-transparent'
            }`}
            onClick={() => setSelectedSpan(span)}
          >
            <div className="flex items-center gap-1 flex-shrink-0 px-2" style={{ marginLeft: `${depth * 12}px` }}>
              {children.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newExpanded = new Set(expandedSpans);
                    if (newExpanded.has(span.SpanId)) {
                      newExpanded.delete(span.SpanId);
                    } else {
                      newExpanded.add(span.SpanId);
                    }
                    setExpandedSpans(newExpanded);
                  }}
                  className="hover:bg-gray-200 dark:hover:bg-slate-700 rounded p-0.5 text-gray-700 dark:text-gray-300"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              ) : (
                <div className="w-3" />
              )}
            </div>

            <div className="w-32 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-1">
                <div className={`w-1.5 h-1.5 rounded-full ${getServiceColor(span.ServiceName)} flex-shrink-0`} />
                <span className="text-xs font-medium truncate text-gray-900 dark:text-gray-100">{span.ServiceName}</span>
              </div>
            </div>

            <div className="w-40 flex-shrink-0 px-1">
              <span className="text-xs truncate text-gray-700 dark:text-gray-200">{span.SpanName}</span>
            </div>

            <div className="relative h-6 bg-gray-100 dark:bg-slate-800 rounded mx-2 flex-1 min-w-64">
              <div
                className={`absolute top-0.5 h-5 rounded transition-all duration-200 ${
                  span.StatusCode === 'ERROR' ? 'bg-red-500' : getServiceColor(span.ServiceName)
                }`}
                style={{
                  left: `${position.left}%`,
                  width: `${Math.max(position.width, 0.5)}%`,
                }}
                title={`${span.SpanName}: ${formatDuration(span.Duration)}`}
              />
            </div>

            <div className="w-20 flex-shrink-0 text-xs text-right pr-2 text-gray-600 dark:text-gray-300">
              {formatDuration(span.Duration)}
            </div>

            <div className="w-12 flex-shrink-0 flex justify-end pr-2">
              {getStatusIcon(span.StatusCode)}
            </div>
          </div>

          {isExpanded && children.map(child => renderSpan(child, depth + 1))}
        </div>
      );
    };

    return rootSpans.map(span => renderSpan(span));
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error: {error}</AlertDescription>
      </Alert>
    );
  }

  if (spans.length === 0) {
    return (
      <div className="p-8 text-center text-gray-600">
        No spans found for this trace
      </div>
    );
  }

  const errorSpans = spans.filter(s => s.StatusCode === 'ERROR').length;
  const services = new Set(spans.map(s => s.ServiceName)).size;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 p-4 flex-shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1 h-6 w-6">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Trace: {traceId?.substring(0, 8)}...</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{traceId}</p>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{spans.length}</span>
              <span className="text-gray-600 dark:text-gray-300">spans</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatDuration(calculateTotalDuration() * 1000000)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{services}</span>
              <span className="text-gray-600 dark:text-gray-300">services</span>
            </div>
            {errorSpans > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-600 dark:text-red-400">{errorSpans}</span>
                <span className="text-gray-600 dark:text-gray-300">errors</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Waterfall View */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
          {/* Column Headers */}
          <div className="border-b border-gray-200 dark:border-slate-700 px-4 py-2 bg-gray-50 dark:bg-slate-800 flex-shrink-0">
            <div className="flex items-center h-6 text-xs font-semibold text-gray-700 dark:text-gray-200">
              <div className="w-48 flex-shrink-0">Service & Operation</div>
              <div className="relative h-6 flex-1 mx-2">Timeline</div>
              <div className="w-20 text-right pr-2">Duration</div>
              <div className="w-12 text-right pr-2">Status</div>
            </div>
          </div>

          {/* Spans List */}
          <div className="flex-1 overflow-auto">
            <div className="px-4 py-1">{buildSpanTree()}</div>
          </div>
        </div>

        {/* Details Panel */}
        {selectedSpan && (
          <div className="w-80 border-l border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 overflow-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Span Information</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getServiceColor(selectedSpan.ServiceName)}`} />
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">Service</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{selectedSpan.ServiceName}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Operation</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{selectedSpan.SpanName}</div>
                </div>

                <div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Status</div>
                  {getStatusBadge(selectedSpan.StatusCode)}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Duration</div>
                    <div className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{formatDuration(selectedSpan.Duration)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Method</div>
                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100">{selectedSpan.Method || selectedSpan.SpanAttributes?.['http.method'] || 'N/A'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">Start Time</div>
                  <div className="text-xs font-mono text-gray-900 dark:text-gray-100">{new Date(selectedSpan.Timestamp).toLocaleString()}</div>
                </div>
              </div>

              {selectedSpan.Resource && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-gray-600 dark:text-gray-400 text-xs mb-2 font-semibold">Resource</div>
                  <div className="text-xs bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-600 font-mono break-words text-gray-900 dark:text-gray-100">
                    {selectedSpan.Resource}
                  </div>
                </div>
              )}

              {selectedSpan.SpanAttributes && Object.keys(selectedSpan.SpanAttributes).length > 0 && (
                <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                  <div className="text-gray-600 dark:text-gray-400 text-xs mb-2 font-semibold">Attributes</div>
                  <div className="space-y-1.5">
                    {Object.entries(selectedSpan.SpanAttributes).slice(0, 10).map(([key, value]) => (
                      <div key={key} className="text-xs">
                        <div className="text-gray-600 dark:text-gray-400">{key}</div>
                        <div className="font-mono text-gray-700 dark:text-gray-200 break-words bg-white dark:bg-slate-900 p-1 rounded border border-gray-200 dark:border-slate-600">
                          {String(value).substring(0, 50)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200 dark:border-slate-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {selectedSpan.SpanId.substring(0, 12)}...</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TraceDetailView;

