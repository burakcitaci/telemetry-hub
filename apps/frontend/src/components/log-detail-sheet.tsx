import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDialogTitle, SheetDialogDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Zap, Globe, Server, Clock, Copy, ExternalLink, Activity, BarChart3, Code, Share2, X, AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (log && isOpen) {
      setLoading(false);
    }
  }, [log, isOpen]);

  // Define consistent styling for content areas
  const contentBoxClasses = "bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30";

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

  const getSeverityIcon = (severity: string) => {
    if (!severity) {
      return <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2">N/A</Badge>;
    }

    const severityUpper = severity.toUpperCase();
    if (severityUpper === 'ERROR') {
      return <Badge variant="destructive" className="text-xs font-semibold py-0.5 px-2">
        <AlertTriangle className="h-3 w-3 mr-1" />
        ERROR
      </Badge>;
    } else if (severityUpper === 'WARN' || severityUpper === 'WARNING') {
      return <Badge variant="warning" className="text-xs font-semibold py-0.5 px-2">
        <AlertCircle className="h-3 w-3 mr-1" />
        WARN
      </Badge>;
    } else if (severityUpper === 'INFO') {
      return <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
        <Info className="h-3 w-3 mr-1" />
        INFO
      </Badge>;
    } else if (severityUpper === 'DEBUG') {
      return <Badge variant="outline" className="text-xs font-semibold py-0.5 px-2">
        <CheckCircle className="h-3 w-3 mr-1" />
        DEBUG
      </Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2">{severity}</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getLogLevelColor = (severity: string) => {
    const severityUpper = severity?.toUpperCase();
    if (severityUpper === 'ERROR') return 'text-red-600 dark:text-red-400';
    if (severityUpper === 'WARN' || severityUpper === 'WARNING') return 'text-yellow-600 dark:text-yellow-400';
    if (severityUpper === 'INFO') return 'text-blue-600 dark:text-blue-400';
    if (severityUpper === 'DEBUG') return 'text-gray-600 dark:text-gray-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const parseLogBody = (body: string) => {
    // Simple parsing for common log formats
    const parts = body.split(' - ');
    if (parts.length >= 2) {
      return {
        level: parts[0],
        message: parts.slice(1).join(' - ')
      };
    }
    return { level: '', message: body };
  };

  const extractStructuredData = (body: string) => {
    // Try to extract JSON-like data from log body
    const jsonMatch = body.match(/\{.*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 border-t-4 dark:border-t-blue-400 [&>button:first-of-type]:hidden" >
        <SheetDialogTitle className="sr-only">Log Details</SheetDialogTitle>
        <SheetDialogDescription className="sr-only">
          Detailed view of log entry including message, metadata, and context
        </SheetDialogDescription>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : log ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border dark:border-slate-700 bg-background dark:bg-slate-900">
              <div className="items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className='space-x-2 text-foreground dark:text-black flex items-center min-w-0'>
                    <span className="font-medium uppercase">
                      {log.ServiceName || 'Unknown Service'}
                    </span>
                    <span className="text-sm text-foreground dark:text-gray-200">
                      Log Entry
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(log.Timestamp)}
                        className="h-7 w-7 p-0"
                        title="Copy Timestamp"
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
                    {getServiceIcon(log.ServiceName)}
                    <span className="font-medium">{log.ServiceName || 'Unknown Service'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Severity:</span>
                  <div className="mt-1">{getSeverityIcon(log.SeverityText)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="font-medium mt-1">{safeFormatDate(log.Timestamp)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Trace ID:</span>
                  <div className="font-mono text-xs mt-1 break-all">
                    {log.TraceId || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="message" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-3 mb-2 h-8">
                <TabsTrigger value="message" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Message
                </TabsTrigger>
                <TabsTrigger value="details" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="context" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Context
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 px-4 pb-4 overflow-hidden">
                <ScrollArea className="h-full">
                  <TabsContent value="message" className="mt-0">
                    <div className="space-y-2">
                      {/* Log Message */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Log Message</h4>
                        <div className=" p-4">
                          <div className={`text-sm whitespace-pre-wrap break-words`}>
                            {log.Body}
                          </div>
                        </div>
                      </div>

                      {/* Structured Data */}
                      {(() => {
                        const structuredData = extractStructuredData(log.Body);
                        if (structuredData) {
                          return (
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Structured Data</h4>
                              <div className="bg-muted/20 dark:bg-slate-800/20 rounded-lg p-4 border border-border/50 dark:border-slate-700/50">
                                <pre className="text-xs text-foreground dark:text-gray-200 overflow-x-auto">
                                  {JSON.stringify(structuredData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="mt-0">
                    <div className="space-y-2">
                      {/* Basic Information */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Basic Information</h4>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Timestamp:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{safeFormatDate(log.Timestamp)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(log.Timestamp)}
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Service:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{log.ServiceName || 'Unknown Service'}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(log.ServiceName)}
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Severity:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{log.SeverityText || 'Unknown'} ({log.SeverityNumber})</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(log.SeverityText)}
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>

                          {log.TraceId && (
                            <div className="flex items-center justify-between py-1 px-3 ">
                              <span className="text-sm text-muted-foreground">Trace ID:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">{log.TraceId}</span>
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
                          )}

                          {log.SpanId && (
                            <div className="flex items-center justify-between py-1 px-3 ">
                              <span className="text-sm text-muted-foreground">Span ID:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">{log.SpanId}</span>
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
                          )}

                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Trace Flags:</span>
                            <span className="text-sm font-mono">{log.TraceFlags}</span>
                          </div>
                        </div>
                      </div>

                      {/* Resource Attributes */}
                      {log.ResourceAttributes && Object.keys(log.ResourceAttributes).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Resource Attributes</h4>
                          <div className="space-y-2">
                            {Object.entries(log.ResourceAttributes).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between py-1 px-3 ">
                                <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono">{String(value)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(String(value))}
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scope Information */}
                      {(log.ScopeName || log.ScopeVersion) && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Scope Information</h4>
                          <div className="space-y-2">
                            {log.ScopeName && (
                              <div className="flex items-center justify-between py-1 px-3 ">
                                <span className="text-sm text-muted-foreground">Scope Name:</span>
                                <span className="text-sm">{log.ScopeName}</span>
                              </div>
                            )}
                            {log.ScopeVersion && (
                              <div className="flex items-center justify-between py-1 px-3 ">
                                <span className="text-sm text-muted-foreground">Scope Version:</span>
                                <span className="text-sm">{log.ScopeVersion}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Scope Attributes */}
                      {log.ScopeAttributes && Object.keys(log.ScopeAttributes).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Scope Attributes</h4>
                          <div className="space-y-2">
                            {Object.entries(log.ScopeAttributes).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between py-1 px-3 ">
                                <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono">{String(value)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(String(value))}
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log Attributes */}
                      {log.LogAttributes && Object.keys(log.LogAttributes).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Log Attributes</h4>
                          <div className="space-y-2">
                            {Object.entries(log.LogAttributes).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between py-1 px-3 ">
                                <span className="text-sm text-muted-foreground font-mono">{key}:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono">{String(value)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(String(value))}
                                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                                  >
                                    <Copy className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Analysis */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Message Analysis</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Length:</span>
                            <span className="text-sm">{log.Body.length} characters</span>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Lines:</span>
                            <span className="text-sm">{log.Body.split('\n').length} lines</span>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 ">
                            <span className="text-sm text-muted-foreground">Contains JSON:</span>
                            <span className="text-sm">{log.Body.includes('{') && log.Body.includes('}') ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="context" className="mt-0">
                    <div className="space-y-2">
                      {/* Related Information */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Related Information</h4>
                        <div className="space-y-2">
                          {log.TraceId && (
                            <div className="p-3 ">
                              <div className="flex items-center gap-2 mb-2">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Related Trace</span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                This log is associated with a trace. You can view the full trace to understand the request flow.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  // Could navigate to trace detail view
                                  console.log('Navigate to trace:', log.TraceId);
                                }}
                              >
                                View Trace
                              </Button>
                            </div>
                          )}

                          <div className="p-3 ">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Time Context</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Logged at: {safeFormatTime(log.Timestamp)}</div>
                              <div>Timezone: Local</div>
                            </div>
                          </div>

                          <div className="p-3 ">
                            <div className="flex items-center gap-2 mb-2">
                              <Server className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Service Context</span>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Service: {log.ServiceName || 'Unknown'}</div>
                              <div>Environment: Production</div>
                              <div>Region: us-east-1</div>
                            </div>
                          </div>
                        </div>
                      </div>
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
