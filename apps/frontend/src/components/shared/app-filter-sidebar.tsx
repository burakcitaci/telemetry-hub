import { useId, useState, type ReactNode } from "react";
import { Server, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UnifiedFilterSidebar } from "@/shared/components/unified-filter-sidebar";
import type { EnvironmentSource } from "@/shared/hooks/use-environments";

export interface AppFacetOption {
  value: string;
  label: string;
  count: number;
}

export type FacetOption = AppFacetOption;

export interface AppFilterSidebarProps {
  title?: string;
  environmentSource?: EnvironmentSource;
  services?: string[];
  selectedServices?: string[];
  onServicesSelect?: (services: string[]) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  facetTitle?: string;
  facetOptions?: AppFacetOption[];
  selectedFacets?: string[];
  onFacetsSelect?: (facets: string[]) => void;
  timeRange?: string;
  onTimeRangeSelect?: (range: string) => void;
}

function ServiceSelector({
  services,
  selectedServices: selected,
  onServicesSelect: onChange,
}: Required<
  Pick<
    AppFilterSidebarProps,
    "services" | "selectedServices" | "onServicesSelect"
  >
>) {
  const [expanded, setExpanded] = useState(true);
  const instance = useId();
  const toggle = (service: string, checked: boolean) =>
    onChange(
      checked
        ? [...new Set([...selected, service])]
        : selected.filter((item) => item !== service),
    );
  return (
    <section className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-between px-1 py-1.5"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          Services
        </span>
        {expanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </Button>
      {expanded &&
        (services.length ? (
          services.map((service) => {
            const id = `${instance}-${encodeURIComponent(service)}`;
            return (
              <div key={service} className="flex items-center gap-2 px-2 py-1">
                <Checkbox
                  id={id}
                  checked={selected.includes(service)}
                  onCheckedChange={(checked) =>
                    toggle(service, checked === true)
                  }
                />
                <label
                  htmlFor={id}
                  className="min-w-0 flex-1 cursor-pointer truncate text-xs"
                >
                  {service}
                </label>
              </div>
            );
          })
        ) : (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            No services loaded
          </p>
        ))}
    </section>
  );
}

function FacetSelector({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: AppFacetOption[];
  selected: string[];
  onChange: (facets: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const instance = useId();

  const toggle = (value: string, checked: boolean) =>
    onChange(
      checked
        ? [...new Set([...selected, value])]
        : selected.filter((item) => item !== value),
    );

  return (
    <section className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto w-full justify-between px-1 py-1.5"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          {title}
        </span>
        {expanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </Button>
      {expanded &&
        (options.length ? (
          options.map((option) => {
            const id = `${instance}-${encodeURIComponent(option.value)}`;
            return (
              <div
                key={option.value}
                className="flex items-center gap-2 px-2 py-1"
              >
                <Checkbox
                  id={id}
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) =>
                    toggle(option.value, checked === true)
                  }
                />
                <label
                  htmlFor={id}
                  className="min-w-0 flex-1 cursor-pointer truncate text-xs"
                >
                  {option.label}
                </label>
                <Badge variant="outline" className="px-1 text-[10px]">
                  {option.count}
                </Badge>
              </div>
            );
          })
        ) : (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            No options available
          </p>
        ))}
    </section>
  );
}

export function AppFilterSidebar({
  title = "Filters",
  services = [],
  selectedServices = [],
  onServicesSelect,
  mobileOpen = false,
  onMobileOpenChange,
  open = true,
  onOpenChange,
  children,
  facetTitle,
  facetOptions = [],
  selectedFacets = [],
  onFacetsSelect,
}: AppFilterSidebarProps) {
  const content = (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="w-full min-w-0 space-y-3 p-1">
        <UnifiedFilterSidebar />
        {onServicesSelect && (
          <ServiceSelector
            services={services}
            selectedServices={selectedServices}
            onServicesSelect={onServicesSelect}
          />
        )}
        {onFacetsSelect && facetTitle && (
          <FacetSelector
            title={facetTitle}
            options={facetOptions}
            selected={selectedFacets}
            onChange={onFacetsSelect}
          />
        )}
        {children}
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-border bg-background p-0 text-foreground lg:hidden"
        >
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">
              Feature filters
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 p-4">{content}</div>
        </SheetContent>
      </Sheet>
      <aside
        aria-label={title}
        className={`hidden min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-r border-border bg-background text-foreground lg:flex ${
          open ? "w-64" : "w-12"
        }`}
      >
        {open && content}
        {onOpenChange && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-2 size-7 self-end"
            aria-label={`${open ? "Hide" : "Show"} ${title}`}
            onClick={() => onOpenChange(!open)}
          >
            <ChevronRight
              className={`size-4 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </Button>
        )}
      </aside>
    </>
  );
}
