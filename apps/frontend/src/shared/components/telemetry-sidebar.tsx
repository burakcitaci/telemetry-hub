import { useId, useState } from "react";
import { EnvironmentFilter } from "./environment-filter";
import type { EnvironmentSource } from "../hooks/use-environments";
import { FeatureSidebar } from "@/shared/components/feature-layout";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Info,
  Server,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  tone?: "success" | "warning" | "error" | "info" | "neutral";
}

interface TelemetrySidebarProps {
  environmentSource?: EnvironmentSource;
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
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const timeRanges = [
  { value: "5m", label: "Last 5 minutes" },
  { value: "15m", label: "Last 15 minutes" },
  { value: "1h", label: "Last hour" },
  { value: "6h", label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
];

function FacetIcon({ tone }: { tone: FacetOption["tone"] }) {
  if (tone === "success")
    return <CheckCircle className="h-3 w-3 text-success" />;
  if (tone === "warning")
    return <AlertTriangle className="h-3 w-3 text-warning" />;
  if (tone === "error")
    return <AlertTriangle className="h-3 w-3 text-destructive" />;
  if (tone === "info") return <Info className="h-3 w-3 text-primary" />;
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
  environmentSource,
}: TelemetrySidebarProps & { idPrefix: string }) {
  const instanceId = useId();
  idPrefix = `${idPrefix}-${instanceId}`;
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
      <div className={idPrefix === "desktop" ? "space-y-2" : "space-y-2 px-2"}>
        {environmentSource && <EnvironmentFilter source={environmentSource} />}
        <section>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFacetsExpanded((value) => !value)}
            className="h-auto w-full justify-between px-0 py-1.5"
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
            <div className="space-y-1 px-1">
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
            className="h-auto w-full justify-between px-0 py-1.5"
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
            <div className="ml-5 mt-1 space-y-1 px-1">
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
  title = "Filters",
  environmentSource,
  mobileOpen,
  onMobileOpenChange,
}: TelemetrySidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // Controlled when the parent passes `collapsed`; otherwise fall back to local state.
  const isCollapsed = collapsed ?? internalCollapsed;
  const setCollapsed = (value: boolean) => {
    if (onCollapsedChange) onCollapsedChange(value);
    else setInternalCollapsed(value);
  };

  const filterProps = {
    environmentSource,
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
      {/* Desktop sidebar — matches the metrics page visual style */}
      <FeatureSidebar
        mobileOpen={mobileOpen}
        onMobileOpenChange={onMobileOpenChange}
        title={title}
        open={!isCollapsed}
        onOpenChange={(open) => setCollapsed(!open)}
      >
        <FilterPanel {...filterProps} idPrefix="desktop" />
      </FeatureSidebar>
    </>
  );
}
