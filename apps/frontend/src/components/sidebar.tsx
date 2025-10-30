import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Database, Zap, Globe, Server, AlertTriangle, CheckCircle, Clock, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  services: string[];
  selectedService: string;
  onServiceSelect: (service: string) => void;
  statusCounts: { ok: number; error: number; total: number };
  selectedStatus: string;
  onStatusSelect: (status: string) => void;
  timeRange: string;
  onTimeRangeSelect: (timeRange: string) => void;
}

export function Sidebar({
  services,
  selectedService,
  onServiceSelect,
  statusCounts,
  selectedStatus,
  onStatusSelect,
  timeRange,
  onTimeRangeSelect
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [timeRangeExpanded, setTimeRangeExpanded] = useState(true);
  const [statusExpanded, setStatusExpanded] = useState(true);
  const [servicesExpanded, setServicesExpanded] = useState(true);

  const getServiceIcon = (serviceName: string) => {
    if (serviceName.includes('mongodb') || serviceName.includes('mongo')) {
      return <Database className="h-4 w-4 text-green-600" />;
    }
    if (serviceName.includes('redis') || serviceName.includes('cache')) {
      return <Zap className="h-4 w-4 text-red-500" />;
    }
    if (serviceName.includes('api') || serviceName.includes('gtw')) {
      return <Globe className="h-4 w-4 text-blue-500" />;
    }
    if (serviceName.includes('ingestion') || serviceName.includes('engine')) {
      return <Server className="h-4 w-4 text-purple-500" />;
    }
    return <Server className="h-4 w-4 text-gray-500" />;
  };

  const getServiceColor = (serviceName: string) => {
    if (serviceName.includes('mongodb') || serviceName.includes('mongo')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    }
    if (serviceName.includes('redis') || serviceName.includes('cache')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
    if (serviceName.includes('api') || serviceName.includes('gtw')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
    if (serviceName.includes('ingestion') || serviceName.includes('engine')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const timeRanges = [
    { value: '5m', label: 'Last 5 minutes' },
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
  ];

  return (
    <div className={`bg-card dark:bg-slate-900 border-r border-border dark:border-slate-700 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-2 border-b border-border dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-base font-semibold text-foreground dark:text-gray-100">Filters</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 p-0 hover:bg-accent dark:hover:bg-slate-800"
          >
            <TrendingUp className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {/* Time Range - Collapsible */}
          {!isCollapsed && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimeRangeExpanded(!timeRangeExpanded)}
                className="w-full justify-between px-2 py-1.5 h-auto hover:bg-accent dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground dark:text-gray-200">Time Range</span>
                </div>
                {timeRangeExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              {timeRangeExpanded && (
                <div className="space-y-0.5 ml-5 mt-1">
                  {timeRanges.map((range) => (
                    <Button
                      key={range.value}
                      variant={timeRange === range.value ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onTimeRangeSelect(range.value)}
                      className={`w-full justify-start text-xs py-1 h-auto ${
                        timeRange === range.value
                          ? 'bg-accent dark:bg-slate-800 text-accent-foreground dark:text-gray-100'
                          : 'hover:bg-accent dark:hover:bg-slate-800'
                      }`}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isCollapsed && timeRangeExpanded && <Separator className="dark:border-slate-700 my-2" />}

          {/* Status - Collapsible */}
          {!isCollapsed && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusExpanded(!statusExpanded)}
                className="w-full justify-between px-2 py-1.5 h-auto hover:bg-accent dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground dark:text-gray-200">Status</span>
                </div>
                {statusExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              {statusExpanded && (
                <div className="space-y-0.5 ml-5 mt-1">
                  <Button
                    variant={selectedStatus === 'all' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onStatusSelect('all')}
                    className={`w-full justify-between py-1 h-auto ${
                      selectedStatus === 'all'
                        ? 'bg-accent dark:bg-slate-800 text-accent-foreground dark:text-gray-100'
                        : 'hover:bg-accent dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs">All Status</span>
                    <Badge variant="outline" className="text-xs py-0">
                      {statusCounts.total}
                    </Badge>
                  </Button>

                  <Button
                    variant={selectedStatus === 'OK' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onStatusSelect('OK')}
                    className={`w-full justify-between py-1 h-auto ${
                      selectedStatus === 'OK'
                        ? 'bg-accent dark:bg-slate-800 text-accent-foreground dark:text-gray-100'
                        : 'hover:bg-accent dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">Success</span>
                    </div>
                    <Badge variant="outline" className="text-xs py-0">
                      {statusCounts.ok}
                    </Badge>
                  </Button>

                  <Button
                    variant={selectedStatus === 'ERROR' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onStatusSelect('ERROR')}
                    className={`w-full justify-between py-1 h-auto ${
                      selectedStatus === 'ERROR'
                        ? 'bg-accent dark:bg-slate-800 text-accent-foreground dark:text-gray-100'
                        : 'hover:bg-accent dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-600">Errors</span>
                    </div>
                    <Badge variant="outline" className="text-xs py-0">
                      {statusCounts.error}
                    </Badge>
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isCollapsed && statusExpanded && <Separator className="dark:border-slate-700 my-2" />}

          {/* Services - Collapsible */}
          {!isCollapsed && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setServicesExpanded(!servicesExpanded)}
                className="w-full justify-between px-2 py-1.5 h-auto hover:bg-accent dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <Server className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground dark:text-gray-200">Services</span>
                </div>
                {servicesExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              {servicesExpanded && (
                <div className="space-y-0.5 ml-5 mt-1">
                  <Button
                    variant={selectedService === 'all' ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onServiceSelect('all')}
                    className={`w-full justify-start py-1 h-auto ${
                      selectedService === 'all'
                        ? 'bg-accent dark:bg-slate-800 text-accent-foreground dark:text-gray-100'
                        : 'hover:bg-accent dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs">All Services</span>
                  </Button>
                  {services.map((service) => (
                    <Button
                      key={service}
                      variant={selectedService === service ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => onServiceSelect(service)}
                      className={`w-full justify-start py-1 h-auto ${
                        selectedService === service
                          ? 'bg-accent dark:bg-slate-800 text-accent-foreground dark:text-gray-100'
                          : 'hover:bg-accent dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getServiceIcon(service)}
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium py-0 ${getServiceColor(service)}`}
                        >
                          {service}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}