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
import { ArrowLeft, Clock, Activity, Server, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
}

function TraceDetailView() {
  const { traceId } = useParams<{ traceId: string }>();
  const navigate = useNavigate();
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    const renderSpan = (span: Span, depth: number = 0): ReactElement => {
      const position = getSpanPosition(span);
      const children = childMap.get(span.SpanId) || [];

      return (
        <div key={span.SpanId} className="mb-1">
          <div className="flex items-center p-3 hover:bg-muted/50 rounded-md transition-colors group">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div style={{ marginLeft: `${depth * 16}px` }} className="flex-shrink-0">
                {depth > 0 && <div className="w-4 h-px bg-muted-foreground/30" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{span.SpanName}</div>
                <div className="text-xs text-muted-foreground">
                  {span.ServiceName}
                </div>
              </div>
            </div>

            <div className="relative h-6 bg-muted rounded-sm mx-4 flex-1 min-w-32">
              <div
                className={`absolute top-0 h-full rounded-sm transition-all duration-200 ${
                  span.StatusCode === 'ERROR' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{
                  left: `${position.left}%`,
                  width: `${position.width}%`,
                }}
                title={`${span.SpanName}: ${formatDuration(span.Duration)}`}
              />
            </div>

            <div className="text-sm text-muted-foreground font-mono min-w-20 text-right">
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeft
                  className="h-5 w-5 cursor-pointer hover:text-primary"
                  onClick={() => navigate(-1)}
                />
                Trace Details
              </CardTitle>
              <CardDescription className="font-mono">{traceId}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                  <div className="text-2xl font-bold font-mono">
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
              <CardTitle>Trace Visualization</CardTitle>
              <CardDescription>
                Visual representation of span execution and hierarchy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="flamegraph" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="flamegraph">Flame Graph</TabsTrigger>
                  <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
                </TabsList>
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
                <TabsContent value="waterfall" className="mt-4">
                  <div className="space-y-1">
                    {buildSpanTree()}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

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
                      <TableHead>Span Name</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spans.map(span => (
                      <TableRow key={span.SpanId} id={`span-${span.SpanId}`}>
                        <TableCell className="font-medium">{span.SpanName}</TableCell>
                        <TableCell>{span.ServiceName}</TableCell>
                        <TableCell className="font-mono">
                          {formatDuration(span.Duration)}
                        </TableCell>
                        <TableCell>{getStatusBadge(span.StatusCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}

export default TraceDetailView;

