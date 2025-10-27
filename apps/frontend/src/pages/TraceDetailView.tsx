import { useEffect, useState, ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTraceById, generateMockTraceDetail } from '../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { FlameGraph } from '@/components/ui/flame-graph';
import { ArrowLeft, Clock, Activity, Server, CheckCircle, XCircle, AlertCircle, Network, Database, Globe, X } from 'lucide-react';

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
      // Fallback to mock data when backend is not available
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

    return { left, width: Math.max(width, 1) };
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'OK':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'ERROR' ? 'destructive' :
                   status === 'OK' ? 'success' : 'secondary';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status || 'UNSET'}
      </Badge>
    );
  };

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes('gateway') || serviceName.includes('api')) return <Globe className="h-3 w-3" />;
    if (serviceName.includes('database') || serviceName.includes('db')) return <Database className="h-3 w-3" />;
    return <Network className="h-3 w-3" />;
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

    // Sort children by start time for proper waterfall layout
    spans.forEach(span => {
      const children = childMap.get(span.SpanId) || [];
      children.sort((a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime());
      childMap.set(span.SpanId, children);
    });

    const renderSpan = (span: Span, depth: number = 0): ReactElement => {
      const position = getSpanPosition(span);
      const children = childMap.get(span.SpanId) || [];

      return (
        <div key={span.SpanId} className="mb-1">
          <div
            className={`flex items-center p-2 hover:bg-muted/50 rounded-md transition-colors group cursor-pointer ${
              selectedSpan?.SpanId === span.SpanId ? 'bg-muted border border-primary/20' : ''
            }`}
            onClick={() => setSelectedSpan(span)}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div style={{ marginLeft: `${depth * 20}px` }} className="flex-shrink-0">
                {depth > 0 && (
                  <div className="w-4 h-px bg-border mb-1" />
                )}
                {children.length > 0 && (
                  <div className="w-px h-4 bg-border ml-2" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getServiceColor(span.ServiceName)} flex-shrink-0`} />
                  <span className="font-medium text-sm truncate">{span.SpanName}</span>
                  {getStatusIcon(span.StatusCode)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{span.ServiceName}</span>
                  <span>•</span>
                  <span>{span.Method || span.SpanAttributes?.['http.method'] || 'N/A'}</span>
                  {span.Resource && (
                    <>
                      <span>•</span>
                      <span>{span.Resource}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="relative h-8 bg-muted rounded-sm mx-4 flex-1 min-w-48">
              <div
                className={`absolute top-1 h-6 rounded-sm transition-all duration-200 ${
                  span.StatusCode === 'ERROR' ? 'bg-red-500' : getServiceColor(span.ServiceName)
                }`}
                style={{
                  left: `${position.left}%`,
                  width: `${Math.max(position.width, 0.5)}%`,
                }}
                title={`${span.SpanName}: ${formatDuration(span.Duration)}`}
              />
            </div>

            <div className="text-sm text-muted-foreground min-w-20 text-right">
              {formatDuration(span.Duration)}
            </div>
          </div>
          {children.map(child => renderSpan(child, depth + 1))}
        </div>
      );
    };

    return rootSpans.map(span => renderSpan(span));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
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
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">No spans found for this trace</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">Trace Details</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-11">{traceId}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{spans.length}</div>
                  <div className="text-sm text-muted-foreground">Total Spans</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {formatDuration(calculateTotalDuration() * 1000000)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Duration</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{new Set(spans.map(s => s.ServiceName)).size}</div>
                  <div className="text-sm text-muted-foreground">Services</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{spans.filter(s => s.StatusCode === 'OK').length}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>

              </div>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Trace Timeline</CardTitle>
              <CardDescription>
                Visual representation of span execution and hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="waterfall" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
                  <TabsTrigger value="flamegraph">Flame Graph</TabsTrigger>
                </TabsList>
                <TabsContent value="waterfall" className="mt-4">
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                      <span>Timeline</span>
                      <span>Duration</span>
                    </div>
                    <div className="space-y-1">
                      {buildSpanTree()}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Legend:</span>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>Error</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Success</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="flamegraph" className="mt-4">
                  <FlameGraph
                    spans={spans}
                    height={400}
                    onSpanClick={(span) => {
                      // Scroll to span in details table
                      const element = document.getElementById(`span-${span.SpanId}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Span Details</CardTitle>
                  <CardDescription>
                    Detailed information about each span in the trace
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Status</TableHead>
                          <TableHead className="min-w-32">Service</TableHead>
                          <TableHead className="min-w-48">Operation</TableHead>
                          <TableHead className="w-20">Method</TableHead>
                          <TableHead className="w-24">Duration</TableHead>
                          <TableHead className="w-32">Start Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {spans.map(span => (
                          <TableRow
                            key={span.SpanId}
                            id={`span-${span.SpanId}`}
                            className={`hover:bg-muted/50 cursor-pointer ${
                              selectedSpan?.SpanId === span.SpanId ? 'bg-muted border-l-4 border-l-primary' : ''
                            }`}
                            onClick={() => setSelectedSpan(span)}
                          >
                            <TableCell>{getStatusBadge(span.StatusCode)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${getServiceColor(span.ServiceName)}`} />
                                <span className="font-medium">{span.ServiceName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{span.SpanName}</div>
                                {span.Resource && (
                                  <div className="text-xs text-muted-foreground">
                                    {span.Resource}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {span.Method || span.SpanAttributes?.['http.method'] || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDuration(span.Duration)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(span.Timestamp).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Span Details Panel */}
            <div className="lg:col-span-1">
              {selectedSpan ? (
                <Card className="sticky top-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Span Details</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedSpan(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getServiceColor(selectedSpan.ServiceName)}`} />
                      <CardDescription className="text-xs">
                        {selectedSpan.SpanId}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Service</div>
                        <div className="font-medium">{selectedSpan.ServiceName}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <div>{getStatusBadge(selectedSpan.StatusCode)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Operation</div>
                        <div className="font-medium">{selectedSpan.SpanName}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Method</div>
                        <div>
                          {selectedSpan.Method || selectedSpan.SpanAttributes?.['http.method'] || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Duration</div>
                        <div className="font-medium">
                          {formatDuration(selectedSpan.Duration)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Start Time</div>
                        <div className="text-xs">
                          {new Date(selectedSpan.Timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {selectedSpan.Resource && (
                      <div>
                        <div className="text-muted-foreground text-sm mb-1">Resource</div>
                        <div className="text-sm bg-muted p-2 rounded">
                          {selectedSpan.Resource}
                        </div>
                      </div>
                    )}

                    {selectedSpan.SpanAttributes && Object.keys(selectedSpan.SpanAttributes).length > 0 && (
                      <div>
                        <div className="text-muted-foreground text-sm mb-2">Attributes</div>
                        <div className="space-y-1">
                          {Object.entries(selectedSpan.SpanAttributes).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-xs bg-muted px-2 py-1 rounded">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Trace ID: {selectedSpan.TraceId.substring(0, 8)}...
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="sticky top-6">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium mb-2">No Span Selected</div>
                    <div className="text-xs text-muted-foreground">
                      Click on a span to view detailed information
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

export default TraceDetailView;

