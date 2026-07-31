import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Copy, RefreshCw, X } from 'lucide-react';
import { getTraceById } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDialogDescription,
  SheetDialogTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/lib/errors';
import { formatDuration, formatTelemetryTimestamp, getTelemetryTimestampMs } from '@/lib/telemetry';
import type { TraceSpan } from '@/types/telemetry';

interface TraceDetailSheetProps {
  traceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === 'ERROR') return <Badge variant="destructive">Error</Badge>;
  if (normalized === 'OK') return <Badge variant="success">OK</Badge>;
  return <Badge variant="secondary">{status || 'Unset'}</Badge>;
}

export function TraceDetailSheet({ traceId, isOpen, onClose }: TraceDetailSheetProps) {
  const [spans, setSpans] = useState<TraceSpan[]>([]);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrace = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setSpans([]);
    setSelectedSpanId(null);
    setExpandedSpans(new Set());

    try {
      const traceSpans = await getTraceById(id);
      setSpans(traceSpans);

      if (traceSpans.length === 0) {
        setError('No spans were returned for this trace. It may have expired from ClickHouse.');
        return;
      }

      const spanIds = new Set(traceSpans.map((span) => span.SpanId));
      const roots = traceSpans.filter(
        (span) => !span.ParentSpanId || !spanIds.has(span.ParentSpanId),
      );
      setExpandedSpans(new Set(roots.map((span) => span.SpanId)));
      setSelectedSpanId((roots[0] || traceSpans[0]).SpanId);
    } catch (loadError) {
      setError(getErrorMessage(
        loadError,
        'Unable to load this trace. Verify the backend connection and try again.',
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (traceId && isOpen) void loadTrace(traceId);
  }, [isOpen, loadTrace, traceId]);

  const selectedSpan = spans.find((span) => span.SpanId === selectedSpanId) || null;

  const traceSummary = useMemo(() => {
    if (spans.length === 0) return null;

    const windows = spans.map((span) => {
      const start = getTelemetryTimestampMs(span.Timestamp);
      return { start, end: start + span.Duration / 1_000_000 };
    }).filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end));
    const traceDuration = windows.length === 0
      ? 0
      : (Math.max(...windows.map(({ end }) => end))
        - Math.min(...windows.map(({ start }) => start))) * 1_000_000;
    const statuses = spans.map((span) => span.StatusCode.toUpperCase());

    return {
      services: new Set(spans.map((span) => span.ServiceName)).size,
      duration: traceDuration,
      status: statuses.includes('ERROR')
        ? 'ERROR'
        : statuses.includes('OK')
          ? 'OK'
          : 'UNSET',
      timestamp: spans[0].Timestamp,
    };
  }, [spans]);

  const spanTree = useMemo(() => {
    const spanIds = new Set(spans.map((span) => span.SpanId));
    const children = new Map<string, TraceSpan[]>();

    spans.forEach((span) => {
      if (span.ParentSpanId && spanIds.has(span.ParentSpanId)) {
        const current = children.get(span.ParentSpanId) || [];
        current.push(span);
        children.set(span.ParentSpanId, current);
      }
    });

    children.forEach((items) => items.sort(
      (left, right) => getTelemetryTimestampMs(left.Timestamp) - getTelemetryTimestampMs(right.Timestamp),
    ));

    return {
      children,
      roots: spans.filter((span) => !span.ParentSpanId || !spanIds.has(span.ParentSpanId)),
    };
  }, [spans]);

  const renderSpan = (span: TraceSpan, depth = 0): ReactNode => {
    const children = spanTree.children.get(span.SpanId) || [];
    const expanded = expandedSpans.has(span.SpanId);

    return (
      <div key={span.SpanId}>
        <div
          className={`flex items-center gap-2 rounded px-2 py-1.5 ${
            selectedSpanId === span.SpanId ? 'bg-accent' : 'hover:bg-muted/60'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {children.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0"
              onClick={() => setExpandedSpans((current) => {
                const next = new Set(current);
                if (next.has(span.SpanId)) next.delete(span.SpanId);
                else next.add(span.SpanId);
                return next;
              })}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${span.SpanName}`}
            >
              {expanded
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          ) : <span className="w-6 shrink-0" />}

          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setSelectedSpanId(span.SpanId)}
          >
            <span className="block truncate text-sm font-medium">{span.SpanName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {span.ServiceName} · {formatTelemetryTimestamp(span.Timestamp)}
            </span>
          </button>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDuration(span.Duration)}
          </span>
          <StatusBadge status={span.StatusCode} />
        </div>
        {expanded && children.map((child) => renderSpan(child, depth + 1))}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-3xl [&>button:first-of-type]:hidden">
        <SheetDialogTitle className="sr-only">Trace details</SheetDialogTitle>
        <SheetDialogDescription className="sr-only">
          Span hierarchy and attributes for trace {traceId || 'unknown'}.
        </SheetDialogDescription>

        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Trace details</h2>
            <code className="block truncate text-xs text-muted-foreground">{traceId}</code>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => { if (traceId) void navigator.clipboard.writeText(traceId); }}
              aria-label="Copy trace ID"
              title="Copy trace ID"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
              aria-label="Close trace details"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading trace…
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="max-w-md text-sm text-destructive">{error}</p>
            {traceId && (
              <Button variant="outline" size="sm" onClick={() => void loadTrace(traceId)}>
                Try again
              </Button>
            )}
          </div>
        ) : traceSummary ? (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-border px-4 py-3 text-xs sm:grid-cols-4">
              <div><span className="text-muted-foreground">Spans</span><p className="font-medium">{spans.length}</p></div>
              <div><span className="text-muted-foreground">Services</span><p className="font-medium">{traceSummary.services}</p></div>
              <div><span className="text-muted-foreground">Trace window</span><p className="font-medium">{formatDuration(traceSummary.duration)}</p></div>
              <div><span className="text-muted-foreground">Status</span><div className="mt-1"><StatusBadge status={traceSummary.status} /></div></div>
            </div>

            <Tabs defaultValue="trace" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mx-4 mt-3 grid h-9 w-auto grid-cols-2">
                <TabsTrigger value="trace">Span hierarchy</TabsTrigger>
                <TabsTrigger value="attributes">Selected span</TabsTrigger>
              </TabsList>
              <div className="min-h-0 flex-1 px-4 pb-4">
                <ScrollArea className="h-full">
                  <TabsContent value="trace" className="mt-2 space-y-0.5">
                    {spanTree.roots.map((span) => renderSpan(span))}
                  </TabsContent>
                  <TabsContent value="attributes" className="mt-2">
                    {selectedSpan ? (
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3 rounded-md border p-3 text-xs">
                          <div><span className="text-muted-foreground">Operation</span><p className="break-all font-medium">{selectedSpan.SpanName}</p></div>
                          <div><span className="text-muted-foreground">Service</span><p className="break-all font-medium">{selectedSpan.ServiceName}</p></div>
                          <div><span className="text-muted-foreground">Span ID</span><p className="break-all font-mono">{selectedSpan.SpanId}</p></div>
                          <div><span className="text-muted-foreground">Parent span ID</span><p className="break-all font-mono">{selectedSpan.ParentSpanId || 'Root'}</p></div>
                        </div>
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attributes</h3>
                          {Object.keys({
                            ...(selectedSpan.ResourceAttributes || {}),
                            ...(selectedSpan.SpanAttributes || {}),
                          }).length > 0 ? (
                            <div className="divide-y rounded-md border">
                              {Object.entries({
                                ...(selectedSpan.ResourceAttributes || {}),
                                ...(selectedSpan.SpanAttributes || {}),
                              }).map(([key, value]) => (
                                <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 px-3 py-2 text-xs">
                                  <code className="break-all text-muted-foreground">{key}</code>
                                  <span className="break-all text-right">{value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">This span has no attributes in the API response.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select a span to inspect it.</p>
                    )}
                  </TabsContent>
                </ScrollArea>
              </div>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
