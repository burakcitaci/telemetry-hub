import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/shared/components/page-layout";
import { TelemetryWidget } from "@/shared/components/telemetry-widget";

type LayoutProps = ComponentProps<"div">;

export function FeaturePage({ className, ...props }: LayoutProps) {
  return (
    <PageLayout className={cn("flex min-w-0 flex-col", className)} {...props} />
  );
}

export function FeatureBody({ className, ...props }: LayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 gap-3",
        className,
      )}
      {...props}
    />
  );
}

export function FeatureContent({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      data-slot="feature-content"
      className={cn(
        "box-border min-h-0 min-w-0 flex-1 max-w-full space-y-4 overflow-x-hidden overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}

export function FeaturePanel({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <TelemetryWidget
      className={cn(
        "@container box-border w-full max-w-full min-w-0 overflow-x-hidden overflow-y-visible",
        className,
      )}
      {...props}
    />
  );
}

export function FeaturePanelHeader({
  className,
  ...props
}: ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn(
        "flex min-w-0 flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3 [&>*]:min-w-0",
        className,
      )}
      {...props}
    />
  );
}

/* FeatureSidebar was consolidated into AppFilterSidebar. */
/* export function FeatureSidebar({
  title,
  children,
  open = true,
  onOpenChange,
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches && mobileOpen) onMobileOpenChange?.(false);
    };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [mobileOpen, onMobileOpenChange]);
  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          onCloseAutoFocus={(event) => {
            if (window.matchMedia("(min-width: 1024px)").matches) return;
            const trigger = document.querySelector<HTMLButtonElement>(
              "[data-feature-filter-toggle]",
            );
            if (trigger) {
              event.preventDefault();
              trigger.focus();
            }
          }}
          className="flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-border dark:border-[#242936] bg-background p-0 lg:hidden"
        >
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription className="sr-only">
              Filter and configure this feature.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {mobileOpen && children}
          </div>
        </SheetContent>
      </Sheet>
      <aside
        aria-label={title}
        className={cn(
          "hidden min-h-0 px-2 shrink-0 flex-col bg-card lg:flex w-64"
        )}
      >
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </aside>
    </>
  );
} */

export function FeatureLoading() {
  return (
    <div role="status" aria-label="Loading data" className="space-y-3 p-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function FeatureEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function FeatureSearch({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        aria-label={props["aria-label"] ?? props.placeholder ?? "Search"}
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  );
}
