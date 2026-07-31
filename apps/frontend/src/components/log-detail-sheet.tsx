import { Copy, FileText, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTelemetryTimestamp } from '@/lib/telemetry';
import type { AttributeMap, LogRecord } from '@/types/telemetry';

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

function AttributeList({ attributes }: { attributes: AttributeMap }) {
  return (
    <div className="divide-y rounded-md border">
      {Object.entries(attributes).map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 px-3 py-2 text-xs">
          <code className="break-all text-muted-foreground">{key}</code>
          <span className="break-all text-right">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function LogDetailSheet({ log, isOpen, onClose }: LogDetailSheetProps) {
  if (!log) return null;

  const attributes = {
    ...(log.ResourceAttributes || {}),
    ...(log.LogAttributes || {}),
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-2xl [&>button:first-of-type]:hidden">
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2 text-sm">
                  Log details <SeverityBadge severity={log.SeverityText} />
                </SheetTitle>
                <SheetDescription className="truncate">
                  {log.ServiceName || 'Unknown service'} · {formatTelemetryTimestamp(log.Timestamp)}
                </SheetDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={onClose}
              aria-label="Close log details"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-4 mt-3 grid h-9 w-auto grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 px-4 pb-4">
            <ScrollArea className="h-full">
              <TabsContent value="overview" className="mt-3 space-y-4">
                <div className="rounded-md border p-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</h3>
                  <pre className="whitespace-pre-wrap break-words font-mono text-sm">{log.Body}</pre>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <span className="text-muted-foreground">Trace ID</span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="min-w-0 break-all">{log.TraceId || 'Not correlated'}</code>
                      {log.TraceId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0"
                          onClick={() => void navigator.clipboard.writeText(log.TraceId)}
                          aria-label="Copy trace ID"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="text-muted-foreground">Span ID</span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="min-w-0 break-all">{log.SpanId || 'Not correlated'}</code>
                      {log.SpanId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0"
                          onClick={() => void navigator.clipboard.writeText(log.SpanId)}
                          aria-label="Copy span ID"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="text-muted-foreground">Service</span>
                    <p className="mt-1 font-medium">{log.ServiceName || 'Unknown service'}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <span className="text-muted-foreground">Severity number</span>
                    <p className="mt-1 font-medium">{log.SeverityNumber ?? 'Not returned by API'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attributes" className="mt-3">
                {Object.keys(attributes).length > 0 ? (
                  <AttributeList attributes={attributes} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This log has no attributes in the current API response.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="raw" className="mt-3">
                <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
