import { Braces, FileText, X } from 'lucide-react';
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
import type { LogRecord } from '@/features/logs/types';
import { AttributeSection, CopyButton, DetailField, JsonPanel } from '@/shared/components/telemetry-detail';
import { formatTelemetryTimestamp } from '@/shared/lib/telemetry';

interface LogDetailSheetProps {
  log: LogRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  const normalized = severity.toUpperCase();
  if (normalized === 'ERROR' || normalized === 'FATAL') {
    return <Badge variant="destructive">{normalized}</Badge>;
  }
  if (normalized === 'WARN' || normalized === 'WARNING') return <Badge variant="warning">WARN</Badge>;
  if (normalized === 'INFO') return <Badge variant="info">INFO</Badge>;
  return <Badge variant="secondary">{normalized || 'UNSET'}</Badge>;
}

export function LogDetailSheet({ log, isOpen, onClose }: LogDetailSheetProps) {
  if (!log) return null;

  const serviceName = log.ServiceName || 'Unknown service';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-[min(96vw,1080px)] flex-col p-0 sm:max-w-[1080px] [&>button:first-of-type]:hidden">
        <SheetTitle className="sr-only">Log details</SheetTitle>
        <SheetDescription className="sr-only">
          Message, correlation identifiers, and attributes for a log from {serviceName}.
        </SheetDescription>

        <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Log details</h2>
              <div className="mt-0.5 flex min-w-0 items-center gap-1">
                <code className="truncate text-xs text-muted-foreground">
                  {log.TraceId || log.SpanId || 'Uncorrelated log record'}
                </code>
                {(log.TraceId || log.SpanId) && (
                  <CopyButton value={log.TraceId || log.SpanId} label="Copy correlation ID" />
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={onClose} aria-label="Close log details">
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>

        <div className="grid grid-cols-2 border-b border-border bg-background px-5 py-3 text-xs sm:grid-cols-4">
          <div className="border-r border-border pr-4">
            <span className="text-muted-foreground">Started</span>
            <p className="mt-0.5 truncate font-medium">{formatTelemetryTimestamp(log.Timestamp)}</p>
          </div>
          <div className="border-r border-border px-4">
            <span className="text-muted-foreground">Service</span>
            <p className="mt-0.5 truncate font-medium">{serviceName}</p>
          </div>
          <div className="border-r border-border px-4">
            <span className="text-muted-foreground">Scope</span>
            <p className="mt-0.5 truncate font-medium">{log.ScopeName || 'Not returned'}</p>
          </div>
          <div className="pl-4">
            <span className="text-muted-foreground">Severity</span>
            <div className="mt-0.5"><SeverityBadge severity={log.SeverityText} /></div>
          </div>
        </div>

        <Tabs defaultValue="log" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="h-11 w-full justify-start rounded-none border-b bg-transparent px-5 py-0">
            <TabsTrigger value="log" className="h-11 gap-2 rounded-none border-b-2 border-transparent px-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <FileText className="h-3.5 w-3.5" /> Log
            </TabsTrigger>
            <TabsTrigger value="raw" className="h-11 gap-2 rounded-none border-b-2 border-transparent px-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Braces className="h-3.5 w-3.5" /> Raw log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log" className="m-0 min-h-0 flex-1">
            <div className="grid h-full min-h-0 grid-rows-[minmax(260px,1.2fr)_minmax(220px,0.8fr)] sm:grid-cols-[minmax(300px,0.75fr)_minmax(0,1.25fr)] sm:grid-rows-1">
              <aside className="min-h-0 min-w-0 border-b border-border sm:border-b-0 sm:border-r">
                <ScrollArea className="h-full">
                  <div className="space-y-5 p-4">
                    <div>
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <h3 className="break-all text-sm font-semibold">{serviceName}</h3>
                        <SeverityBadge severity={log.SeverityText} />
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTelemetryTimestamp(log.Timestamp)}</p>
                    </div>

                    <dl className="rounded-md border bg-background px-3">
                      <DetailField label="Started">{formatTelemetryTimestamp(log.Timestamp)}</DetailField>
                      <DetailField label="Severity number">{log.SeverityNumber ?? 'Not returned'}</DetailField>
                      <DetailField label="Trace ID" mono copyValue={log.TraceId}>{log.TraceId || 'Not correlated'}</DetailField>
                      <DetailField label="Span ID" mono copyValue={log.SpanId}>{log.SpanId || 'Not correlated'}</DetailField>
                      <DetailField label="Instrumentation scope">{log.ScopeName || 'Not returned'}</DetailField>
                      {log.ScopeVersion && <DetailField label="Scope version">{log.ScopeVersion}</DetailField>}
                    </dl>

                    <AttributeSection title="Log attributes" attributes={log.LogAttributes} />
                    <AttributeSection title="Resource attributes" attributes={log.ResourceAttributes} />
                    <AttributeSection title="Scope attributes" attributes={log.ScopeAttributes} />
                  </div>
                </ScrollArea>
              </aside>

              <section className="flex min-h-0 min-w-0 flex-col bg-muted/10">
                <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/30 px-4">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Message</span>
                  <CopyButton value={log.Body} label="Copy message" />
                </div>
                <ScrollArea className="min-h-0 flex-1">
                  <pre className="whitespace-pre-wrap break-words p-5 font-mono text-sm leading-6">{log.Body}</pre>
                </ScrollArea>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="m-0 min-h-0 flex-1 overflow-auto p-5">
            <JsonPanel value={log} label="raw log JSON" />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
