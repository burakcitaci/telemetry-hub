import { useState, ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Activity,
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

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

const mockSpans: Span[] = [
  {
    TraceId: "trace-mham2j7s-jIiw3Jfz",
    SpanId: "span-root-001",
    ParentSpanId: "",
    SpanName: "details:SystemMeasurements",
    ServiceName: "customer-app-gateway",
    Timestamp: new Date(Date.now() - 1000).toISOString(),
    Duration: 500000000,
    StatusCode: "OK",
    Method: "GET",
    Resource: "/api/measurements",
  },
  {
    TraceId: "trace-mham2j7s-jIiw3Jfz",
    SpanId: "span-child-001",
    ParentSpanId: "span-root-001",
    SpanName: "query:database",
    ServiceName: "user-service",
    Timestamp: new Date(Date.now() - 900).toISOString(),
    Duration: 200000000,
    StatusCode: "OK",
    Method: "SELECT",
  },
  {
    TraceId: "trace-mham2j7s-jIiw3Jfz",
    SpanId: "span-child-002",
    ParentSpanId: "span-root-001",
    SpanName: "process:data",
    ServiceName: "order-service",
    Timestamp: new Date(Date.now() - 600).toISOString(),
    Duration: 150000000,
    StatusCode: "OK",
  },
];

function TraceDetailView() {
  const navigate = useNavigate();
  const [spans] = useState<Span[]>(mockSpans);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set(["span-root-001"]));

  const handleBackClick = () => {
    navigate('/');
  };

  const formatDuration = (nanoseconds: number) => {
    const ms = nanoseconds / 1000000;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const calculateTotalDuration = () => {
    if (spans.length === 0) return 0;
    const timestamps = spans.map((s) => new Date(s.Timestamp).getTime());
    const durations = spans.map((s) => s.Duration / 1000000);
    const minTime = Math.min(...timestamps);
    const maxEndTime = Math.max(...timestamps.map((t, i) => t + durations[i]));
    return maxEndTime - minTime;
  };

  const getSpanPosition = (span: Span) => {
    if (spans.length === 0) return { left: 0, width: 100 };

    const totalDuration = calculateTotalDuration();
    const spanStart = new Date(span.Timestamp).getTime();
    const rootStart = Math.min(
      ...spans.map((s) => new Date(s.Timestamp).getTime())
    );
    const spanDuration = span.Duration / 1000000;

    const left = ((spanStart - rootStart) / totalDuration) * 100;
    const width = (spanDuration / totalDuration) * 100;

    return { left, width: Math.max(width, 0.5) };
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ERROR":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "OK":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <div className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="text-xs">{status || "UNSET"}</span>
      </div>
    );
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

    const renderSpan = (span: Span, depth: number = 0): ReactElement => {
      const position = getSpanPosition(span);
      const children = childMap.get(span.SpanId) || [];
      const isExpanded = expandedSpans.has(span.SpanId);

      return (
        <div key={span.SpanId}>
          <div
            className={`flex items-center justify-between h-8 hover:bg-accent dark:hover:bg-slate-800/80 transition-colors group cursor-pointer border-l-2 ${selectedSpan?.SpanId === span.SpanId
                ? "bg-accent dark:bg-slate-800/80 border-l-blue-500"
                : "border-l-transparent"
              }`}
            onClick={() => setSelectedSpan(span)}
          >
            <div className="w-64 flex-shrink-0 text-left">
              <div
                className="flex items-center gap-1 px-2"
                style={{ paddingLeft: `${depth * 12}px` }}
              >
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
                <div className="flex items-center gap-3 px-1">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${getServiceColor(
                      span.ServiceName
                    )} flex-shrink-0`}
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-medium truncate text-foreground dark:text-gray-100">
                      {span.ServiceName}
                    </span>
                    <span className="text-xs truncate text-muted-foreground dark:text-gray-300">
                      {span.SpanName}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-20 flex-shrink-0 text-xs text-right pr-2 text-muted-foreground dark:text-gray-400">
              {formatDuration(span.Duration)}
            </div>

            <div className="w-12 flex-shrink-0 text-right pr-2">
              {getStatusIcon(span.StatusCode)}
            </div>
          </div>

          {isExpanded && children.map((child) => renderSpan(child, depth + 1))}
        </div>
      );
    };

    return rootSpans.map((span) => renderSpan(span));
  };

  const errorSpans = spans.filter((s) => s.StatusCode === "ERROR").length;
  const services = new Set(spans.map((s) => s.ServiceName)).size;
  const traceId = "trace-mham2j7s-jIiw3Jfz";

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-border dark:border-slate-700 py-4 flex-shrink-0 bg-background dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-100 hover:bg-accent dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
             
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground dark:text-gray-50">
                Trace: {traceId}
              </h1>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-foreground dark:text-gray-100">
                {spans.length}
              </span>
              <span className="text-muted-foreground dark:text-gray-300">spans</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-foreground dark:text-gray-100">
                {formatDuration(calculateTotalDuration() * 1000000)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-foreground dark:text-gray-100">
                {services}
              </span>
              <span className="text-muted-foreground dark:text-gray-300">services</span>
            </div>
            {errorSpans > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-600 dark:text-red-400">
                  {errorSpans}
                </span>
                <span className="text-muted-foreground dark:text-gray-300">errors</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Waterfall View */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background dark:bg-slate-950">
          {/* Column Headers */}
          <div className="border-b border-border dark:border-slate-700 px-4 py-2 bg-muted dark:bg-slate-800 flex-shrink-0">
            <div className="flex justify-between items-center h-6 text-xs font-semibold text-foreground dark:text-gray-200">
              <div className="w-64 flex-shrink-0">Service & Operation</div>
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
          <div className="w-80 border-l border-border dark:border-slate-700 bg-background dark:bg-slate-900 overflow-auto flex-shrink-0">
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase mb-2">
                  Span Information
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-muted-foreground dark:text-gray-400 text-xs">
                        Service
                      </div>
                      <div className="font-medium text-foreground dark:text-gray-100">
                        {selectedSpan.ServiceName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground dark:text-gray-400 text-xs mb-1">
                    Operation
                  </div>
                  <div className="font-medium text-foreground dark:text-gray-100">
                    {selectedSpan.SpanName}
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground dark:text-gray-400 text-xs mb-1">
                    Status
                  </div>
                  {getStatusBadge(selectedSpan.StatusCode)}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-muted-foreground dark:text-gray-400 text-xs mb-1">
                      Duration
                    </div>
                    <div className="font-mono text-xs font-semibold text-foreground dark:text-gray-100">
                      {formatDuration(selectedSpan.Duration)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground dark:text-gray-400 text-xs mb-1">
                      Method
                    </div>
                    <div className="font-mono text-xs text-foreground dark:text-gray-100">
                      {selectedSpan.Method ||
                        selectedSpan.SpanAttributes?.["http.method"] ||
                        "N/A"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-muted-foreground dark:text-gray-400 text-xs mb-1">
                    Start Time
                  </div>
                  <div className="text-xs font-mono text-foreground dark:text-gray-100">
                    {new Date(selectedSpan.Timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {selectedSpan.Resource && (
                <div className="pt-3 border-t border-border dark:border-slate-700">
                  <div className="text-muted-foreground dark:text-gray-400 text-xs mb-2 font-semibold">
                    Resource
                  </div>
                  <div className="text-xs bg-muted dark:bg-slate-800 p-2 rounded border border-border dark:border-slate-600 font-mono break-words text-foreground dark:text-gray-100">
                    {selectedSpan.Resource}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border dark:border-slate-700">
                <div className="text-xs text-muted-foreground dark:text-gray-400 font-mono">
                  ID: {selectedSpan.SpanId.substring(0, 12)}...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TraceDetailView;