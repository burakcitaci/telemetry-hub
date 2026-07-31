import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Info,
  Server,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  tone?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

interface TelemetrySidebarProps {
  services: string[];
  selectedServices: string[];
  onServicesSelect: (services: string[]) => void;
  facetTitle: string;
  facetOptions: FacetOption[];
  selectedFacets: string[];
  onFacetsSelect: (facets: string[]) => void;
  timeRange: string;
  onTimeRangeSelect: (timeRange: string) => void;
}

const timeRanges = [
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
];

function FacetIcon({ tone }: { tone: FacetOption['tone'] }) {
  if (tone === 'success') return <CheckCircle className="h-3 w-3 text-green-600" />;
  if (tone === 'warning') return <AlertTriangle className="h-3 w-3 text-amber-600" />;
  if (tone === 'error') return <AlertTriangle className="h-3 w-3 text-red-600" />;
  if (tone === 'info') return <Info className="h-3 w-3 text-blue-600" />;
  return <Circle className="h-3 w-3 text-muted-foreground" />;
}

function FilterPanel({
  services,
  selectedServices,
  onServicesSelect,
  facetTitle,
  facetOptions,
  selectedFacets,
  onFacetsSelect,
  timeRange,
  onTimeRangeSelect,
  idPrefix,
}: TelemetrySidebarProps & { idPrefix: string }) {
  const [timeRangeExpanded, setTimeRangeExpanded] = useState(true);
  const [facetsExpanded, setFacetsExpanded] = useState(true);
  const [servicesExpanded, setServicesExpanded] = useState(true);

  const toggleValue = (
    currentValues: string[],
    value: string,
    checked: boolean,
    onChange: (values: string[]) => void,
  ) => {
    onChange(checked
      ? [...new Set([...currentValues, value])]
      : currentValues.filter((item) => item !== value));
  };

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-2 p-2">
        <section>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTimeRangeExpanded((value) => !value)}
            className="h-auto w-full justify-between px-2 py-1.5"
            aria-expanded={timeRangeExpanded}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Time range
            </span>
            {timeRangeExpanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
          {timeRangeExpanded && (
            <div className="ml-5 mt-1 space-y-0.5">
              {timeRanges.map((range) => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onTimeRangeSelect(range.value)}
                  className="h-auto w-full justify-start py-1 text-xs"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          )}
        </section>

        <Separator />

        <section>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFacetsExpanded((value) => !value)}
            className="h-auto w-full justify-between px-2 py-1.5"
            aria-expanded={facetsExpanded}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              {facetTitle}
            </span>
            {facetsExpanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
          {facetsExpanded && (
            <div className="ml-5 mt-1 space-y-1">
              {facetOptions.map((option) => {
                const id = `${idPrefix}-facet-${encodeURIComponent(option.value)}`;
                return (
                  <div key={option.value} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={id}
                      checked={selectedFacets.includes(option.value)}
                      onCheckedChange={(checked) => toggleValue(
                        selectedFacets,
                        option.value,
                        checked,
                        onFacetsSelect,
                      )}
                    />
                    <label htmlFor={id} className="flex flex-1 cursor-pointer items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <FacetIcon tone={option.tone} />
                        {option.label}
                      </span>
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        {option.count}
                      </Badge>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <Separator />

        <section>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setServicesExpanded((value) => !value)}
            className="h-auto w-full justify-between px-2 py-1.5"
            aria-expanded={servicesExpanded}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <Server className="h-3.5 w-3.5 text-muted-foreground" />
              Services
            </span>
            {servicesExpanded
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
          {servicesExpanded && (
            <div className="ml-5 mt-1 space-y-1">
              {services.length === 0 && (
                <p className="py-1 text-xs text-muted-foreground">No services loaded</p>
              )}
              {services.map((service) => {
                const id = `${idPrefix}-service-${encodeURIComponent(service)}`;
                return (
                  <div key={service} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={id}
                      checked={selectedServices.includes(service)}
                      onCheckedChange={(checked) => toggleValue(
                        selectedServices,
                        service,
                        checked,
                        onServicesSelect,
                      )}
                    />
                    <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-xs">
                      <span className="block truncate" title={service}>{service}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}

export function TelemetrySidebar({
  services,
  selectedServices,
  onServicesSelect,
  facetTitle,
  facetOptions,
  selectedFacets,
  onFacetsSelect,
  timeRange,
  onTimeRangeSelect,
}: TelemetrySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const filterProps = {
    services,
    selectedServices,
    onServicesSelect,
    facetTitle,
    facetOptions,
    selectedFacets,
    onFacetsSelect,
    timeRange,
    onTimeRangeSelect,
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="fixed bottom-4 right-4 z-40 gap-1.5 shadow-lg md:hidden"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {(selectedServices.length + selectedFacets.length) > 0 && (
              <Badge className="ml-0.5 h-5 min-w-5 justify-center px-1 text-[10px]">
                {selectedServices.length + selectedFacets.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <SheetTitle className="text-sm">Filters</SheetTitle>
            <SheetDescription className="sr-only">
              Filter telemetry by time range, {facetTitle.toLowerCase()}, and service.
            </SheetDescription>
          </SheetHeader>
          <FilterPanel {...filterProps} idPrefix="mobile" />
        </SheetContent>
      </Sheet>

      <aside
        className={`hidden h-full min-h-0 shrink-0 flex-col border-r border-border bg-card transition-all duration-200 md:flex ${
          isCollapsed ? 'w-14' : 'w-64'
        }`}
      >
        <div className="border-b border-border p-2">
          <div className="flex items-center justify-between">
            {!isCollapsed && <h2 className="text-sm font-semibold">Filters</h2>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed((value) => !value)}
              className="h-7 w-7 p-0"
              aria-label={isCollapsed ? 'Expand filters' : 'Collapse filters'}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {!isCollapsed && <FilterPanel {...filterProps} idPrefix="desktop" />}
      </aside>
    </>
  );
}
