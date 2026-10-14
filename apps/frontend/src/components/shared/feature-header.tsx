import type { ComponentProps, ReactNode } from "react";
import { TimeRangePicker } from "@/app/components/timer-range.picker";
import { cn } from "@/lib/utils";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

type TimeRangeProps = ComponentProps<typeof TimeRangePicker>;

export interface FeatureHeaderProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  timeRange?: TimeRangeProps["value"];
  onTimeRangeChange?: TimeRangeProps["onChange"];
  className?: string;
  onFiltersOpen?: () => void;
}

export function FeatureHeader({
  title,
  description,
  children,
  actions,
  timeRange,
  onTimeRangeChange,
  className,
  onFiltersOpen,
}: FeatureHeaderProps) {
  return (
    <header
      className={cn(
        "relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border dark:border-[#242936] pb-3 text-foreground",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        {description && (
          <div className="mt-1 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {children && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
      <div className="ml-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-2">
        {actions}
        {timeRange && onTimeRangeChange && (
          <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} />
        )}
        {onFiltersOpen && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 lg:hidden"
            aria-label="Open filters"
            data-feature-filter-toggle
            aria-haspopup="dialog"
            onClick={onFiltersOpen}
          >
            <Filter className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </header>
  );
}
