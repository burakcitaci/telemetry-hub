import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
  timeRange?: string;
  onTimeRangeSelect?: (range: string) => void;
}

export function AppFilterSidebar({
  title = "Filters",
  mobileOpen = false,
  onMobileOpenChange,
  open = true,
  onOpenChange,
  children,
}: AppFilterSidebarProps) {
  const content = (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="w-full min-w-0 space-y-3 p-1">
        <UnifiedFilterSidebar />
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
