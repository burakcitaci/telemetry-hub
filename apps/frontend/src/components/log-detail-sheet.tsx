import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';

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
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Log Details
            {getSeverityBadge(log.SeverityText)}
          </SheetTitle>
          <SheetDescription>
            Detailed information about this log entry
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="text-sm">{new Date(log.Timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service</label>
                    <p className="text-sm">{log.ServiceName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Severity</label>
                    <div className="mt-1">{getSeverityBadge(log.SeverityText)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Severity Number</label>
                    <p className="text-sm">{log.SeverityNumber}</p>
                  </div>
                </div>

                {log.TraceId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Trace ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1">{log.TraceId}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(log.TraceId)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {log.SpanId && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Span ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1">{log.SpanId}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(log.SpanId)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message</label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{log.Body}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(log.ScopeName || log.ScopeVersion) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scope Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {log.ScopeName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Scope Name</label>
                      <p className="text-sm">{log.ScopeName}</p>
                    </div>
                  )}
                  {log.ScopeVersion && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Scope Version</label>
                      <p className="text-sm">{log.ScopeVersion}</p>
                    </div>
                  )}
                  {log.ScopeSchemaUrl && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Scope Schema URL</label>
                      <p className="text-sm break-all">{log.ScopeSchemaUrl}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="attributes" className="space-y-4">
            {log.ResourceAttributes && Object.keys(log.ResourceAttributes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resource Attributes</CardTitle>
                  <CardDescription>Attributes associated with the resource that generated this log</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {Object.entries(log.ResourceAttributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-4 p-2 border rounded">
                          <span className="text-sm font-medium text-muted-foreground">{key}</span>
                          <span className="text-sm text-right break-all">{formatValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {log.ScopeAttributes && Object.keys(log.ScopeAttributes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scope Attributes</CardTitle>
                  <CardDescription>Attributes associated with the scope of this log</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {Object.entries(log.ScopeAttributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-4 p-2 border rounded">
                          <span className="text-sm font-medium text-muted-foreground">{key}</span>
                          <span className="text-sm text-right break-all">{formatValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {log.LogAttributes && Object.keys(log.LogAttributes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Log Attributes</CardTitle>
                  <CardDescription>Additional attributes for this specific log entry</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {Object.entries(log.LogAttributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start gap-4 p-2 border rounded">
                          <span className="text-sm font-medium text-muted-foreground">{key}</span>
                          <span className="text-sm text-right break-all">{formatValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {(!log.ResourceAttributes || Object.keys(log.ResourceAttributes).length === 0) &&
             (!log.ScopeAttributes || Object.keys(log.ScopeAttributes).length === 0) &&
             (!log.LogAttributes || Object.keys(log.LogAttributes).length === 0) && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No attributes available for this log entry</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="raw" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw Log Data</CardTitle>
                <CardDescription>Complete log entry in JSON format</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </ScrollArea>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                  className="mt-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy JSON
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
