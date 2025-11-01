import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, FileText, Code, Database, Share2, X } from 'lucide-react';
import { format } from 'date-fns';

interface Log {
  Timestamp: string;
  TimestampTime: string;
  TraceId: string;
  SpanId: string;
  TraceFlags: number;
  SeverityText: string;
  SeverityNumber: number;
  ServiceName: string;
  Body: string;
  ResourceSchemaUrl?: string;
  ResourceAttributes?: Record<string, any>;
  ScopeSchemaUrl?: string;
  ScopeName?: string;
  ScopeVersion?: string;
  ScopeAttributes?: Record<string, any>;
  LogAttributes?: Record<string, any>;
}

interface LogDetailSheetProps {
  log: Log | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LogDetailSheet({ log, isOpen, onClose }: LogDetailSheetProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!log) return null;

  const getSeverityBadge = (severity: string) => {
    const variant = severity?.toUpperCase() === 'ERROR' || severity?.toUpperCase() === 'FATAL' ? 'destructive' :
                   severity?.toUpperCase() === 'WARN' ? 'warning' :
                   severity?.toUpperCase() === 'INFO' ? 'info' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs">
        {severity || 'INFO'}
      </Badge>
    );
  };

  const getSeverityBorderColor = (severity: string) => {
    const upperSeverity = severity?.toUpperCase();
    if (upperSeverity === 'ERROR' || upperSeverity === 'FATAL') {
      return 'dark:border-t-red-500';
    } else if (upperSeverity === 'WARN') {
      return 'dark:border-t-yellow-500';
    } else if (upperSeverity === 'INFO') {
      return 'dark:border-t-blue-500';
    } else {
      return 'dark:border-t-gray-500';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className={`w-full sm:max-w-2xl flex flex-col p-0 border-t-4 ${getSeverityBorderColor(log.SeverityText)} [&>button:first-of-type]:hidden`}>
        <SheetHeader className="flex-shrink-0 px-4 py-2.5 border-b border-border dark:border-slate-700 bg-background dark:bg-slate-900">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <div>
                <SheetTitle className="flex items-center gap-2">
                  Log Details
                  {getSeverityBadge(log.SeverityText)}
                </SheetTitle>
                <SheetDescription>
                  Detailed information about this log entry
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(log.TraceId || log.SpanId || '')}
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
                onClick={onClose}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 border-b border-border dark:border-slate-700 bg-background dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Service:</span>
              <div className="font-medium mt-1">{log.ServiceName}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Timestamp:</span>
              <div className="font-medium mt-1">{format(new Date(log.Timestamp), 'MMM dd HH:mm:ss')}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Severity:</span>
              <div className="mt-1">{getSeverityBadge(log.SeverityText)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Level:</span>
              <div className="font-medium mt-1">{log.SeverityNumber}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mx-4 mt-3 mb-2 h-8">
              <TabsTrigger value="overview" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="attributes" className="text-xs">
                <Code className="h-3 w-3 mr-1" />
                Attributes
              </TabsTrigger>
              <TabsTrigger value="raw" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Raw Data
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 px-4 pb-4 overflow-hidden">
              <ScrollArea className="h-full">
                <TabsContent value="overview" className="mt-0 space-y-3">
                  {log.TraceId && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trace ID</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{log.TraceId.substring(0, 8)}...</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(log.TraceId)}
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {log.SpanId && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Span ID</span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">{log.SpanId.substring(0, 8)}...</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(log.SpanId)}
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                    <div className="text-sm text-muted-foreground mb-2">Message</div>
                    <div className="text-sm whitespace-pre-wrap font-mono bg-background dark:bg-slate-900 p-2 rounded border">
                      {log.Body}
                    </div>
                  </div>

                  {(log.ScopeName || log.ScopeVersion) && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                      <div className="text-sm font-medium mb-2">Scope Information</div>
                      <div className="space-y-2">
                        {log.ScopeName && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Name:</span>
                            <span className="text-sm">{log.ScopeName}</span>
                          </div>
                        )}
                        {log.ScopeVersion && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Version:</span>
                            <span className="text-sm">{log.ScopeVersion}</span>
                          </div>
                        )}
                        {log.ScopeSchemaUrl && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Schema:</span>
                            <span className="text-sm break-all">{log.ScopeSchemaUrl}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attributes" className="mt-0 space-y-3">
                  {log.ResourceAttributes && Object.keys(log.ResourceAttributes).length > 0 && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                      <div className="text-sm font-medium mb-3">Resource Attributes</div>
                      <div className="space-y-2">
                        {Object.entries(log.ResourceAttributes).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-start gap-4 py-1">
                            <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm break-all text-right">{formatValue(value)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(formatValue(value))}
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

                  {log.ScopeAttributes && Object.keys(log.ScopeAttributes).length > 0 && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                      <div className="text-sm font-medium mb-3">Scope Attributes</div>
                      <div className="space-y-2">
                        {Object.entries(log.ScopeAttributes).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-start gap-4 py-1">
                            <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm break-all text-right">{formatValue(value)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(formatValue(value))}
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

                  {log.LogAttributes && Object.keys(log.LogAttributes).length > 0 && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                      <div className="text-sm font-medium mb-3">Log Attributes</div>
                      <div className="space-y-2">
                        {Object.entries(log.LogAttributes).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-start gap-4 py-1">
                            <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className="text-sm break-all text-right">{formatValue(value)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(formatValue(value))}
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

                  {(!log.ResourceAttributes || Object.keys(log.ResourceAttributes).length === 0) &&
                   (!log.ScopeAttributes || Object.keys(log.ScopeAttributes).length === 0) &&
                   (!log.LogAttributes || Object.keys(log.LogAttributes).length === 0) && (
                    <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30 text-center">
                      <p className="text-muted-foreground text-sm">No attributes available for this log entry</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="raw" className="mt-0">
                  <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">Raw Log Data</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                        className="text-xs"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy JSON
                      </Button>
                    </div>
                    <div className="bg-background dark:bg-slate-900 p-3 rounded border font-mono text-xs overflow-auto max-h-96">
                      <pre>{JSON.stringify(log, null, 2)}</pre>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
