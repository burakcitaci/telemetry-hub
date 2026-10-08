import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Info,
  PanelLeft,
  Server,
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
  /** Optional — controlled collapse from the parent (e.g. header button). */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Optional — uppercase label shown next to the collapse icon. Defaults to "Filters". */
  title?: string;
}

const timeRanges = [
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
];

function FacetIcon({ tone }: { tone: FacetOption['tone'] }) {
  if (tone === 'success')
    return <CheckCircle className="h-3 w-3 text-success" />;
  if (tone === 'warning')
    return <AlertTriangle className="h-3 w-3 text-warning" />;
  if (tone === 'error')
    return <AlertTriangle className="h-3 w-3 text-destructive" />;
  if (tone === 'info') return <Info className="h-3 w-3 text-primary" />;
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
    onChange(
      checked
        ? [...new Set([...currentValues, value])]
        : currentValues.filter((item) => item !== value),
    );
  };

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-2 p-2">
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
            {facetsExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
          {facetsExpanded && (
            <div className="ml-5 mt-1 space-y-1">
              {facetOptions.map((option) => {
                const id = `${idPrefix}-facet-${encodeURIComponent(option.value)}`;
                return (
                  <div
                    key={option.value}
                    className="flex items-center gap-2 py-1"
                  >
                    <Checkbox
                      id={id}
                      checked={selectedFacets.includes(option.value)}
                      onCheckedChange={(checked) =>
                        toggleValue(
                          selectedFacets,
                          option.value,
                          checked,
                          onFacetsSelect,
                        )
                      }
                    />
                    <label
                      htmlFor={id}
                      className="flex flex-1 cursor-pointer items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <FacetIcon tone={option.tone} />
                        {option.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px]"
                      >
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
            {servicesExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
          {servicesExpanded && (
            <div className="ml-5 mt-1 space-y-1">
              {services.length === 0 && (
                <p className="py-1 text-xs text-muted-foreground">
                  No services loaded
                </p>
              )}
              {services.map((service) => {
                const id = `${idPrefix}-service-${encodeURIComponent(service)}`;
                return (
                  <div key={service} className="flex items-center gap-2 py-1">
                    <Checkbox
                      id={id}
                      checked={selectedServices.includes(service)}
                      onCheckedChange={(checked) =>
                        toggleValue(
                          selectedServices,
                          service,
                          checked,
                          onServicesSelect,
                        )
                      }
                    />
                    <label
                      htmlFor={id}
                      className="min-w-0 flex-1 cursor-pointer text-xs"
                    >
                      <span className="block truncate" title={service}>
                        {service}
                      </span>
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
  collapsed,
  onCollapsedChange,
  title = 'Filters',
}: TelemetrySidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Controlled when the parent passes `collapsed`; otherwise fall back to local state.
  const isCollapsed = collapsed ?? internalCollapsed;
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) onCollapsedChange(value);
    else setInternalCollapsed(value);
  };

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
      {/* Mobile sheet (unchanged) */}
      <Sheet>
        <SheetTrigger asChild>
          <span />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-0 p-0"
        >
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <SheetTitle className="text-sm">Filters</SheetTitle>
            <SheetDescription className="sr-only">
              Filter telemetry by time range, {facetTitle.toLowerCase()}, and
              service.
            </SheetDescription>
          </SheetHeader>
          <FilterPanel {...filterProps} idPrefix="mobile" />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — matches the metrics page visual style */}
      <aside
        className={`hidden md:flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/30 transition-all duration-200 ${
          isCollapsed ? 'w-11' : 'w-64 sm:w-72'
        }`}
      >
        {isCollapsed ? (
          /* Collapsed rail */
          <div className="flex flex-col items-center py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="h-8 w-8"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Header — matches metrics page: uppercase muted title on left,
                PanelLeft collapse icon on right, hairline divider below */}
            <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="h-7 w-7"
              >
                <PanelLeft className="h-3.5 w-3.5" />
              </Button>
            </div>

            <FilterPanel {...filterProps} idPrefix="desktop" />
          </>
        )}
      </aside>
    </>
  );
}
