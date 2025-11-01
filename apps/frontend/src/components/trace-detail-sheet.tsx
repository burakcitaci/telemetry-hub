import { useEffect, useState } from 'react';
import { getTraceById, generateMockTraceDetail } from '../api';
import { Sheet, SheetContent, SheetDialogTitle, SheetDialogDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Zap, Globe, Server, Clock, ArrowRight, Copy, ExternalLink, Activity, BarChart3, Code, Share2, ChevronDown, ChevronRight, X, GitBranch } from 'lucide-react';
import { format } from 'date-fns';

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
  Tags?: Record<string, string>;
  Events?: Array<{
    Timestamp: string;
    Name: string;
    Attributes?: Record<string, string>;
  }>;
}

interface TraceDetail {
  TraceId: string;
  ServiceName: string;
  SpanName: string;
  Timestamp: string;
  Duration: number;
  StatusCode: string;
  SpanAttributes?: Record<string, string>;
  Resource?: string;
  Method?: string;
  Tags?: Record<string, string>;
  Events?: Array<{
    Timestamp: string;
    Name: string;
    Attributes?: Record<string, string>;
  }>;
  Children?: TraceDetail[];
}

interface TraceDetailSheetProps {
  traceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TraceDetailSheet({ traceId, isOpen, onClose }: TraceDetailSheetProps) {
  const [spans, setSpans] = useState<Span[]>([]);
  const [traceDetail, setTraceDetail] = useState<TraceDetail | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId && isOpen) {
      loadTraceDetail(traceId);
    }
  }, [traceId, isOpen]);

  const loadTraceDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTraceById(id);
      console.log('TraceDetailSheet response:', data);

      let spansData: Span[] = [];
      if (Array.isArray(data)) {
        // Backend returns array of spans
        spansData = data.map((span: any, index: number) => ({
          TraceId: span.TraceId || id,
          SpanId: span.SpanId || span.TraceId || `span-${index}`,
          ParentSpanId: span.ParentSpanId || "",
          SpanName: span.SpanName || span.Resource || 'Unknown Operation',
          ServiceName: span.ServiceName || 'Unknown Service',
          Timestamp: span.Timestamp || new Date().toISOString(),
          Duration: span.Duration || 0,
          StatusCode: span.StatusCode || 'OK',
          SpanAttributes: span.SpanAttributes || {},
          Resource: span.Resource,
          Method: span.Method || span.SpanAttributes?.['http.method'],
          Tags: span.Tags,
          Events: span.Events
        }));
      } else if (data && typeof data === 'object') {
        // Backend returns single trace object
        spansData = [{
          TraceId: data.TraceId || id,
          SpanId: data.TraceId || `span-root`,
          ParentSpanId: "",
          SpanName: data.SpanName || data.Resource || 'Root Operation',
          ServiceName: data.ServiceName || 'Unknown Service',
          Timestamp: data.Timestamp || new Date().toISOString(),
          Duration: data.Duration || 0,
          StatusCode: data.StatusCode || 'OK',
          SpanAttributes: data.SpanAttributes || {},
          Resource: data.Resource,
          Method: data.Method || data.SpanAttributes?.['http.method'],
          Tags: data.Tags,
          Events: data.Events
        }];
      }

      setSpans(spansData);

      // Set traceDetail for backward compatibility (first span or mock)
      if (spansData.length > 0) {
        setTraceDetail({
          TraceId: spansData[0].TraceId,
          ServiceName: spansData[0].ServiceName,
          SpanName: spansData[0].SpanName,
          Timestamp: spansData[0].Timestamp,
          Duration: spansData[0].Duration,
          StatusCode: spansData[0].StatusCode,
          SpanAttributes: spansData[0].SpanAttributes,
          Resource: spansData[0].Resource,
          Method: spansData[0].Method,
          Tags: spansData[0].Tags,
          Events: spansData[0].Events
        });

        // Auto-expand root spans
        const rootSpanIds = spansData.filter(s => !s.ParentSpanId).map(s => s.SpanId);
        setExpandedSpans(new Set(rootSpanIds));
      }
    } catch (err: any) {
      console.log('Using mock data for demonstration');
      const mockSpans = generateMockTraceDetail(id);
      if (mockSpans.length > 0) {
        // Convert mock spans to proper format
        const spansData: Span[] = mockSpans.map((span: any, index: number) => ({
          TraceId: span.TraceId || id,
          SpanId: span.SpanId || span.TraceId || `span-${index}`,
          ParentSpanId: span.ParentSpanId || "",
          SpanName: span.SpanName || span.Resource || 'Unknown Operation',
          ServiceName: span.ServiceName || 'Unknown Service',
          Timestamp: span.Timestamp || new Date().toISOString(),
          Duration: span.Duration || 0,
          StatusCode: span.StatusCode || 'OK',
          SpanAttributes: span.SpanAttributes || {},
          Resource: span.Resource,
          Method: span.Method || span.SpanAttributes?.['http.method'],
          Tags: span.Tags,
          Events: span.Events
        }));

        setSpans(spansData);
        setTraceDetail({
          TraceId: spansData[0].TraceId,
          ServiceName: spansData[0].ServiceName,
          SpanName: spansData[0].SpanName,
          Timestamp: spansData[0].Timestamp,
          Duration: spansData[0].Duration,
          StatusCode: spansData[0].StatusCode,
          SpanAttributes: spansData[0].SpanAttributes,
          Resource: spansData[0].Resource,
          Method: spansData[0].Method,
          Tags: spansData[0].Tags,
          Events: spansData[0].Events
        });

        // Auto-expand root spans
        const rootSpanIds = spansData.filter(s => !s.ParentSpanId).map(s => s.SpanId);
        setExpandedSpans(new Set(rootSpanIds));
      }
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (nanoseconds: number) => {
    if (!nanoseconds || nanoseconds < 0) return '0μs';

    const microseconds = nanoseconds / 1000;
    if (microseconds < 1000) {
      return `${microseconds.toFixed(1)}μs`;
    } else {
      const ms = microseconds / 1000;
      return `${ms.toFixed(2)}ms`;
    }
  };

  const safeFormatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'MMM dd HH:mm:ss.SSS');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const safeFormatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      return format(date, 'HH:mm:ss');
    } catch (error) {
      return 'Invalid time';
    }
  };

  const getServiceIcon = (serviceName: string) => {
    if (!serviceName) {
      return <Server className="h-4 w-4 text-gray-500" />;
    }

    const service = serviceName.toLowerCase();
    if (service.includes('mongodb') || service.includes('mongo')) {
      return <Database className="h-4 w-4 text-green-600" />;
    }
    if (service.includes('redis') || service.includes('cache')) {
      return <Zap className="h-4 w-4 text-red-500" />;
    }
    if (service.includes('api') || service.includes('gtw')) {
      return <Globe className="h-4 w-4 text-blue-500" />;
    }
    if (service.includes('ingestion') || service.includes('engine')) {
      return <Server className="h-4 w-4 text-purple-500" />;
    }
    return <Server className="h-4 w-4 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    if (!status) {
      return <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2">N/A</Badge>;
    }

    if (status === 'OK') {
      return <Badge variant="success" className="text-xs font-semibold py-0.5 px-2">200</Badge>;
    } else if (status === 'ERROR') {
      return <Badge variant="destructive" className="text-xs font-semibold py-0.5 px-2">ERROR</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2">{status}</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getServiceColor = (serviceName: string) => {
    const colors = {
      "api-gateway": "bg-purple-500",
      "customer-app-gateway": "bg-purple-500",
      "user-service": "bg-blue-500",
      "order-service": "bg-green-500",
      "payment-service": "bg-yellow-500",
      "inventory-service": "bg-red-500",
      "shipping-service": "bg-indigo-500",
      "auth-service": "bg-pink-500",
      "notification-service": "bg-orange-500",
    };
    return colors[serviceName as keyof typeof colors] || "bg-gray-500";
  };

  const buildSpanTree = () => {
    if (spans.length === 0) return null;

    const rootSpans = spans.filter((s) => !s.ParentSpanId);
    const childMap = new Map<string, Span[]>();

    spans.forEach((span) => {
      if (span.ParentSpanId) {
        if (!childMap.has(span.ParentSpanId)) {
          childMap.set(span.ParentSpanId, []);
        }
        childMap.get(span.ParentSpanId)!.push(span);
      }
    });

    spans.forEach((span) => {
      const children = childMap.get(span.SpanId) || [];
      children.sort(
        (a, b) =>
          new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
      );
      childMap.set(span.SpanId, children);
    });

    const renderSpanTree = (span: Span, depth: number = 0) => {
      const children = childMap.get(span.SpanId) || [];
      const isExpanded = expandedSpans.has(span.SpanId);

      return (
        <div key={span.SpanId}>
          <div
            className={`flex items-center gap-2 py-1 rounded hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-1">
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
                  className="hover:bg-muted dark:hover:bg-slate-700 rounded p-0.5 text-foreground dark:text-gray-300"
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
              <div
                className={`w-1.5 h-1.5 rounded-full ${getServiceColor(
                  span.ServiceName
                )} flex-shrink-0`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground dark:text-gray-200 truncate">
                  {span.SpanName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(span.Duration)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{span.ServiceName || 'Unknown Service'}</span>
                {span.Method && <span>• {span.Method}</span>}
                <span>• {safeFormatTime(span.Timestamp)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {getStatusIcon(span.StatusCode)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(span.SpanId)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                title="Copy Span ID"
              >
                <Copy className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>

          {isExpanded && children.map((child) => renderSpanTree(child, depth + 1))}
        </div>
      );
    };

    return rootSpans.map((span) => renderSpanTree(span));
  };

  const renderCompactSpan = (span: TraceDetail, depth = 0) => (
    <div key={span.TraceId} className={`${depth > 0 ? 'ml-4' : ''}`}>
      {/* Span Header - Compact */}
      <div className="group flex items-center gap-2 py-2 px-2 rounded hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors">
        <div
          className="w-1 h-4 rounded-full flex-shrink-0"
          style={{
            backgroundColor: !span.StatusCode ? '#6b7280' :
              span.StatusCode === 'OK' ? '#10b981' :
                span.StatusCode === 'ERROR' ? '#ef4444' : '#6b7280'
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground dark:text-gray-200 truncate">
              {span.SpanName || 'Unknown Span'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDuration(span.Duration)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{span.ServiceName || 'Unknown Service'}</span>
            {span.Method && <span>• {span.Method}</span>}
            <span>• {safeFormatTime(span.Timestamp)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon(span.StatusCode)}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(span.TraceId)}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            title="Copy Span ID"
          >
            <Copy className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>

      {/* Resource - Compact */}
      {span.Resource && (
        <div className="ml-6 py-1 px-2 text-xs">
          <span className="text-muted-foreground">Resource:</span>
          <span className="ml-2 font-mono text-foreground dark:text-gray-200">{span.Resource}</span>
        </div>
      )}

      {/* Events - Compact */}
      {span.Events && span.Events.length > 0 && (
        <div className="ml-6 py-1">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Events ({span.Events.length})</span>
          </div>
          <div className="space-y-1">
            {span.Events.slice(0, 2).map((event, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1 px-2 bg-muted/30 dark:bg-slate-800/30 rounded text-xs">
                <span className="font-medium text-foreground dark:text-gray-200">{event.Name}</span>
                <span className="text-muted-foreground">
                  {safeFormatTime(event.Timestamp)}
                </span>
              </div>
            ))}
            {span.Events.length > 2 && (
              <div className="text-xs text-muted-foreground px-2">
                +{span.Events.length - 2} more events
              </div>
            )}
          </div>
        </div>
      )}

      {/* Children spans */}
      {span.Children && span.Children.length > 0 && (
        <div className="ml-6 mt-2">
          <div className="flex items-center gap-1 mb-2">
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {span.Children.length} child span{span.Children.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {span.Children.map((child) => renderCompactSpan(child, depth + 1))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 border-t-4 dark:border-t-green-400 [&>button:first-of-type]:hidden" >
        <SheetDialogTitle className="sr-only">Trace Details</SheetDialogTitle>
        <SheetDialogDescription className="sr-only">
          Detailed view of trace {traceId || 'unknown'} including span hierarchy, attributes, and timing information
        </SheetDialogDescription>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : traceDetail ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Compact Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border dark:border-slate-700 bg-background dark:bg-slate-900">
              <div className="items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className='space-x-2 text-foreground dark:text-black flex items-center min-w-0'>
                    <span className="font-medium uppercase">
                      {traceDetail.Method || 'GET'}
                    </span>
                    <span className="text-sm text-foreground dark:text-gray-200">
                      {traceDetail.Resource || traceDetail.SpanName || 'Unknown Operation'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(traceDetail.TraceId)}
                        className="h-7 w-7 p-0"
                        title="Copy Trace ID"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Share"
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={onClose}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Separator */}
            <div className="border-b border-border dark:border-slate-700">
              <div className="mx-4">
                <Separator />
              </div>
            </div>

            {/* Context Section */}
            <div className="px-4 py-3 border-b border-border dark:border-slate-700 bg-background dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Service:</span>
                  <div className="flex items-center gap-1 mt-1">
                    {getServiceIcon(traceDetail.ServiceName)}
                    <span className="font-medium">{traceDetail.ServiceName || 'Unknown Service'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <div className="font-medium mt-1">{formatDuration(traceDetail.Duration)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="font-medium mt-1">{safeFormatDate(traceDetail.Timestamp)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusIcon(traceDetail.StatusCode)}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="trace" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-3 mb-2 h-8">
                <TabsTrigger value="trace" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Trace
                </TabsTrigger>
                <TabsTrigger value="attributes" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  Attributes
                </TabsTrigger>
                <TabsTrigger value="metrics" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Metrics
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 px-4 pb-4 overflow-hidden">
                <ScrollArea className="h-full">
                  <TabsContent value="trace" className="mt-0">
                    <div className="space-y-1">
                      {buildSpanTree()}
                    </div>
                  </TabsContent>

                  <TabsContent value="attributes" className="mt-0 space-y-3">
                    {traceDetail.SpanAttributes && Object.keys(traceDetail.SpanAttributes).length > 0 && (
                      <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                        <div className="text-sm font-medium mb-3">Span Attributes</div>
                        <div className="space-y-2">
                          {Object.entries(traceDetail.SpanAttributes).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-start gap-4 py-1">
                              <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <span className="text-sm break-all text-right">{value}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(value)}
                                  className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {traceDetail.Tags && Object.keys(traceDetail.Tags).length > 0 && (
                      <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                        <div className="text-sm font-medium mb-3">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(traceDetail.Tags).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="metrics" className="mt-0">
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Metrics integration coming soon</p>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </div>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
