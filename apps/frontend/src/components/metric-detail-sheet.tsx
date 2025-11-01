import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDialogTitle, SheetDialogDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Zap, Globe, Server, Clock, Copy, ExternalLink, Activity, BarChart3, Code, Share2, X, AlertTriangle, Info, AlertCircle, CheckCircle, TrendingUp, Settings, Tag } from 'lucide-react';
import { format, formatDistance } from 'date-fns';

interface Metric {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  interval: number;
  originProduct: string;
  subproduct: string;
  productDetail: string;
  ingestedCustomMetrics: number;
  indexedCustomMetrics: number;
  hosts: number;
  tagValues: number;
  tags: Record<string, string[]>;
  historicalMetrics: boolean;
}

interface MetricDetailSheetProps {
  metric: Metric | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MetricDetailSheet({ metric, isOpen, onClose }: MetricDetailSheetProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (metric && isOpen) {
      setLoading(false);
    }
  }, [metric, isOpen]);

  const safeFormatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getProductIcon = (product: string) => {
    if (!product) {
      return <Server className="h-4 w-4 text-gray-500" />;
    }

    const prod = product.toLowerCase();
    if (prod.includes('logs')) {
      return <Database className="h-4 w-4 text-blue-600" />;
    }
    if (prod.includes('apm') || prod.includes('trace')) {
      return <TrendingUp className="h-4 w-4 text-purple-500" />;
    }
    if (prod.includes('infra')) {
      return <Server className="h-4 w-4 text-green-500" />;
    }
    if (prod.includes('custom')) {
      return <Settings className="h-4 w-4 text-orange-500" />;
    }
    return <BarChart3 className="h-4 w-4 text-gray-500" />;
  };

  const getTypeBadge = (type: string) => {
    const variant = type?.toLowerCase() === 'count' ? 'default' :
                   type?.toLowerCase() === 'gauge' ? 'secondary' :
                   type?.toLowerCase() === 'histogram' ? 'outline' : 'secondary';
    return (
      <Badge variant={variant} className="text-xs">
        {type || 'Unknown'}
      </Badge>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 border-t-4 dark:border-t-blue-400 [&>button:first-of-type]:hidden" >
        <SheetDialogTitle className="sr-only">Metric Details</SheetDialogTitle>
        <SheetDialogDescription className="sr-only">
          Detailed view of metric including configuration, tags, and usage information
        </SheetDialogDescription>
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : metric ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border dark:border-slate-700 bg-background dark:bg-slate-900">
              <div className="items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className='space-x-2 text-foreground dark:text-black flex items-center min-w-0'>
                    <span className="font-medium uppercase">
                      {metric.name}
                    </span>
                    <span className="text-sm text-foreground dark:text-gray-200">
                      Metric
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(metric.name)}
                        className="h-7 w-7 p-0"
                        title="Copy Metric Name"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Open in Metrics Explorer"
                      >
                        <ExternalLink className="h-3 w-3" />
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
                  <span className="text-muted-foreground">Origin Product:</span>
                  <div className="flex items-center gap-1 mt-1">
                    {getProductIcon(metric.originProduct)}
                    <span className="font-medium">{metric.originProduct || 'Unknown'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <div className="mt-1">{getTypeBadge(metric.type)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <div className="font-medium mt-1">{formatDistance(new Date(metric.createdAt), new Date(), { addSuffix: true })}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <div className="font-medium mt-1">{formatDistance(new Date(metric.updatedAt), new Date(), { addSuffix: true })}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3 mx-4 mt-3 mb-2 h-8">
                <TabsTrigger value="overview" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="configuration" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="tags" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  Tags
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 px-4 pb-4 overflow-hidden">
                <ScrollArea className="h-full">
                  <TabsContent value="overview" className="mt-0">
                    <div className="space-y-2">
                      {/* Metric Statistics */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Metric Statistics</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <Database className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-medium text-muted-foreground">Ingested</span>
                            </div>
                            <div className="text-lg font-semibold text-foreground dark:text-gray-200">{metric.ingestedCustomMetrics}</div>
                          </div>
                          <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <BarChart3 className="h-4 w-4 text-green-600" />
                              <span className="text-xs font-medium text-muted-foreground">Indexed</span>
                            </div>
                            <div className="text-lg font-semibold text-foreground dark:text-gray-200">{metric.indexedCustomMetrics}</div>
                          </div>
                          <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <Server className="h-4 w-4 text-purple-600" />
                              <span className="text-xs font-medium text-muted-foreground">Hosts</span>
                            </div>
                            <div className="text-lg font-semibold text-foreground dark:text-gray-200">{metric.hosts}</div>
                          </div>
                          <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                            <div className="flex items-center gap-2 mb-1">
                              <Tag className="h-4 w-4 text-orange-600" />
                              <span className="text-xs font-medium text-muted-foreground">Tag Values</span>
                            </div>
                            <div className="text-lg font-semibold text-foreground dark:text-gray-200">{metric.tagValues}</div>
                          </div>
                        </div>
                      </div>

                      {/* Usage Information */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Usage Information</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between py-1 px-3 bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30">
                            <span className="text-sm text-muted-foreground">Subproduct:</span>
                            <span className="text-sm font-medium">{metric.subproduct}</span>
                          </div>
                          <div className="flex items-center justify-between py-1 px-3 bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30">
                            <span className="text-sm text-muted-foreground">Product Detail:</span>
                            <span className="text-sm font-medium">{metric.productDetail}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="configuration" className="mt-0">
                    <div className="space-y-2">
                      {/* Basic Configuration */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Basic Configuration</h4>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between py-1 px-3 bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30">
                            <span className="text-sm text-muted-foreground">Metric Type:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">{metric.type}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(metric.type)}
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30">
                            <span className="text-sm text-muted-foreground">Interval:</span>
                            <span className="text-sm font-mono">{metric.interval}s</span>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30">
                            <span className="text-sm text-muted-foreground">Origin Product:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{metric.originProduct}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(metric.originProduct)}
                                className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-1 px-3 bg-muted/10 dark:bg-slate-50/30 rounded-lg border border-border/30 dark:border-slate-600/30">
                            <span className="text-sm text-muted-foreground">Subproduct:</span>
                            <span className="text-sm">{metric.subproduct}</span>
                          </div>
                        </div>
                      </div>

                      {/* Historical Metrics */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Historical Metrics</h4>
                        <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium mb-1">Historical Data Ingestion</div>
                              <div className="text-xs text-muted-foreground">
                                {metric.historicalMetrics ? 'Enabled' : 'Not enabled'} for this metric. Use historical metrics to ingest data points older than 1 hour.
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={metric.historicalMetrics ? "default" : "secondary"} className="text-xs">
                                {metric.historicalMetrics ? 'ON' : 'OFF'}
                              </Badge>
                              <Button variant="outline" size="sm" className="text-xs">
                                {metric.historicalMetrics ? 'Configure' : 'Enable'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Actions</h4>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs">
                            <Settings className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open in Metrics Explorer
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="tags" className="mt-0">
                    <div className="space-y-2">
                      {/* Tags Overview */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Tags Overview</h4>
                        <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                          <div className="text-xs text-muted-foreground mb-2">
                            Showing {Object.keys(metric.tags).length} tag key{Object.keys(metric.tags).length !== 1 ? 's' : ''}
                          </div>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            Manage Tags
                          </Button>
                        </div>
                      </div>

                      {/* Tag Details */}
                      {Object.keys(metric.tags).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Tag Details</h4>
                          <div className="space-y-2">
                            {Object.entries(metric.tags).map(([tagKey, tagValues]) => (
                              <div key={tagKey} className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium font-mono">{tagKey}</span>
                                  <span className="text-xs text-muted-foreground">{tagValues.length} value{tagValues.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {tagValues.slice(0, 5).map((value, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tagKey}:{value}
                                    </Badge>
                                  ))}
                                  {tagValues.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{tagValues.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Usage in Dashboards */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-foreground dark:text-gray-200">Usage in Dashboards</h4>
                        <div className="bg-muted/10 dark:bg-slate-50/30 rounded-lg p-3 border border-border/30 dark:border-slate-600/30">
                          <div className="text-xs text-muted-foreground">
                            This metric is applied on these dashboards, notebooks, monitors, and SLOs.
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            No dashboards found using this metric.
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
