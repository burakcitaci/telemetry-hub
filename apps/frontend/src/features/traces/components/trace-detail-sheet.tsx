import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Braces, ChevronDown, ChevronRight, Network, RefreshCw, X } from 'lucide-react';
import { getTraceById } from '@/features/traces/api';
import type { TraceSpan } from '@/features/traces/types';
import { AttributeSection, CopyButton, DetailField, JsonPanel } from '@/shared/components/telemetry-detail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getErrorMessage } from '@/shared/lib/errors';
import { cn } from '@/lib/utils';
import { formatDuration, formatTelemetryTimestamp, getTelemetryTimestampMs } from '@/shared/lib/telemetry';

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
      const roots = traceSpans.filter((span) => !span.ParentSpanId || !spanIds.has(span.ParentSpanId));
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
    const start = windows.length === 0 ? 0 : Math.min(...windows.map((window) => window.start));
    const end = windows.length === 0 ? 0 : Math.max(...windows.map((window) => window.end));
    const statuses = spans.map((span) => span.StatusCode.toUpperCase());

    return {
      services: new Set(spans.map((span) => span.ServiceName)).size,
      duration: Math.max(0, end - start) * 1_000_000,
      durationMs: Math.max(0, end - start),
      start,
      status: statuses.includes('ERROR') ? 'ERROR' : statuses.includes('OK') ? 'OK' : 'UNSET',
      timestamp: spans.reduce((earliest, span) => (
        getTelemetryTimestampMs(span.Timestamp) < getTelemetryTimestampMs(earliest.Timestamp) ? span : earliest
      )).Timestamp,
    };
  }, [spans]);

  const spanTree = useMemo(() => {
    const spanIds = new Set(spans.map((span) => span.SpanId));
    const children = new Map<string, TraceSpan[]>();
    const byStart = (left: TraceSpan, right: TraceSpan) => (
      getTelemetryTimestampMs(left.Timestamp) - getTelemetryTimestampMs(right.Timestamp)
    );

    spans.forEach((span) => {
      if (span.ParentSpanId && spanIds.has(span.ParentSpanId)) {
        const current = children.get(span.ParentSpanId) || [];
        current.push(span);
        children.set(span.ParentSpanId, current);
      }
    });

    children.forEach((items) => items.sort(byStart));

    return {
      children,
      roots: spans
        .filter((span) => !span.ParentSpanId || !spanIds.has(span.ParentSpanId))
        .sort(byStart),
    };
  }, [spans]);

  const renderSpan = (span: TraceSpan, depth = 0): ReactNode => {
    const children = spanTree.children.get(span.SpanId) || [];
    const expanded = expandedSpans.has(span.SpanId);
    const selected = selectedSpanId === span.SpanId;
    const offset = traceSummary && traceSummary.durationMs > 0
      ? ((getTelemetryTimestampMs(span.Timestamp) - traceSummary.start) / traceSummary.durationMs) * 100
      : 0;
    const width = traceSummary && traceSummary.durationMs > 0
      ? Math.max(1.5, (span.Duration / 1_000_000 / traceSummary.durationMs) * 100)
      : 100;

    return (
      <div key={span.SpanId}>
        <div
          className={cn(
            'group flex min-h-11 items-center border-b border-border/60 pr-3 transition-colors',
            selected ? 'bg-accent' : 'hover:bg-muted/50',
          )}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {children.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="mr-1 h-6 w-6 shrink-0 p-0"
              onClick={() => setExpandedSpans((current) => {
                const next = new Set(current);
                if (next.has(span.SpanId)) next.delete(span.SpanId);
                else next.add(span.SpanId);
                return next;
              })}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${span.SpanName}`}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          ) : <span className="mr-1 w-6 shrink-0" />}

          <button
            type="button"
            className="grid min-w-0 flex-1 grid-cols-[minmax(110px,0.9fr)_minmax(90px,1.1fr)_64px] items-center gap-3 py-1.5 text-left"
            onClick={() => setSelectedSpanId(span.SpanId)}
          >
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{span.SpanName}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{span.ServiceName}</span>
            </span>
            <span className="relative h-4 overflow-hidden rounded-sm bg-muted">
              <span
                className={cn('absolute inset-y-0 rounded-sm', span.StatusCode.toUpperCase() === 'ERROR' ? 'bg-destructive/75' : 'bg-primary/70')}
                style={{ left: `${Math.min(100, Math.max(0, offset))}%`, width: `${Math.min(100, width)}%` }}
              />
            </span>
            <span className="text-right text-xs tabular-nums text-muted-foreground">{formatDuration(span.Duration)}</span>
          </button>
        </div>
        {expanded && children.map((child) => renderSpan(child, depth + 1))}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-[min(96vw,1080px)] flex-col p-0 sm:max-w-[1080px] [&>button:first-of-type]:hidden">
        <SheetTitle className="sr-only">Trace details</SheetTitle>
        <SheetDescription className="sr-only">
          Span hierarchy and attributes for trace {traceId || 'unknown'}.
        </SheetDescription>

        <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
              <Network className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Trace details</h2>
              <div className="mt-0.5 flex min-w-0 items-center gap-1">
                <code className="truncate text-xs text-muted-foreground">{traceId}</code>
                {traceId && <CopyButton value={traceId} label="Copy trace ID" />}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={onClose} aria-label="Close trace details">
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading trace…
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="max-w-md text-sm text-destructive">{error}</p>
            {traceId && <Button variant="outline" size="sm" onClick={() => void loadTrace(traceId)}>Try again</Button>}
          </div>
        ) : traceSummary ? (
          <>
            <div className="grid grid-cols-2 border-b border-border bg-background px-5 py-3 text-xs sm:grid-cols-4">
              <div className="border-r border-border pr-4"><span className="text-muted-foreground">Started</span><p className="mt-0.5 truncate font-medium">{formatTelemetryTimestamp(traceSummary.timestamp)}</p></div>
              <div className="border-r border-border px-4"><span className="text-muted-foreground">Duration</span><p className="mt-0.5 font-medium tabular-nums">{formatDuration(traceSummary.duration)}</p></div>
              <div className="border-r border-border px-4"><span className="text-muted-foreground">Structure</span><p className="mt-0.5 font-medium">{spans.length} spans · {traceSummary.services} services</p></div>
              <div className="pl-4"><span className="text-muted-foreground">Status</span><div className="mt-0.5"><StatusBadge status={traceSummary.status} /></div></div>
            </div>

            <Tabs defaultValue="trace" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="h-11 w-full justify-start rounded-none border-b bg-transparent px-5 py-0">
                <TabsTrigger value="trace" className="h-11 gap-2 rounded-none border-b-2 border-transparent px-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Network className="h-3.5 w-3.5" /> Trace
                </TabsTrigger>
                <TabsTrigger value="raw" className="h-11 gap-2 rounded-none border-b-2 border-transparent px-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
                  <Braces className="h-3.5 w-3.5" /> Raw spans
                </TabsTrigger>
              </TabsList>

              <TabsContent value="trace" className="m-0 min-h-0 flex-1">
                <div className="grid h-full min-h-0 grid-rows-[minmax(220px,0.8fr)_minmax(260px,1.2fr)] sm:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] sm:grid-rows-1">
                  <section className="flex min-h-0 min-w-0 flex-col border-b border-border sm:border-b-0 sm:border-r">
                    <div className="grid h-9 grid-cols-[minmax(136px,0.9fr)_minmax(90px,1.1fr)_64px] items-center gap-3 border-b bg-muted/30 px-3 pl-10 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Span</span><span>Timeline</span><span className="text-right">Duration</span>
                    </div>
                    <ScrollArea className="min-h-0 flex-1">
                      {spanTree.roots.map((span) => renderSpan(span))}
                    </ScrollArea>
                  </section>

                  <aside className="min-h-0 min-w-0 bg-muted/10">
                    <ScrollArea className="h-full">
                      {selectedSpan ? (
                        <div className="space-y-5 p-4">
                          <div>
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <h3 className="break-all text-sm font-semibold">{selectedSpan.SpanName}</h3>
                              <StatusBadge status={selectedSpan.StatusCode} />
                            </div>
                            <p className="text-xs text-muted-foreground">{selectedSpan.ServiceName}</p>
                          </div>

                          <dl className="rounded-md border bg-background px-3">
                            <DetailField label="Started">{formatTelemetryTimestamp(selectedSpan.Timestamp)}</DetailField>
                            <DetailField label="Duration">{formatDuration(selectedSpan.Duration)}</DetailField>
                            <DetailField label="Span kind">{selectedSpan.SpanKind || 'Not returned'}</DetailField>
                            <DetailField label="Span ID" mono copyValue={selectedSpan.SpanId}>{selectedSpan.SpanId}</DetailField>
                            <DetailField label="Parent span ID" mono copyValue={selectedSpan.ParentSpanId}>{selectedSpan.ParentSpanId || 'Root span'}</DetailField>
                            {selectedSpan.StatusMessage && <DetailField label="Status message">{selectedSpan.StatusMessage}</DetailField>}
                          </dl>

                          <AttributeSection title="Span attributes" attributes={selectedSpan.SpanAttributes} />
                          <AttributeSection title="Resource attributes" attributes={selectedSpan.ResourceAttributes} />
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">Select a span to inspect it.</div>
                      )}
                    </ScrollArea>
                  </aside>
                </div>
              </TabsContent>

              <TabsContent value="raw" className="m-0 min-h-0 flex-1 overflow-auto p-5">
                <JsonPanel value={spans} label="raw trace JSON" />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
