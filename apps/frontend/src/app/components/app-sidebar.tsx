import { Activity, FileText, Gauge, Server } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ModeToggle } from '@/app/components/mode-toggle';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { path: '/', label: 'Services', description: 'Service health', icon: Server },
  { path: '/metrics', label: 'Metrics', description: 'Collected metrics', icon: Gauge },
  { path: '/traces', label: 'Traces', description: 'Distributed requests', icon: Activity },
  { path: '/logs', label: 'Logs', description: 'Application events', icon: FileText },
];

export function AppSidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Telemetry Hub" className="h-9 px-1.5 text-xs">
              <Link to="/" onClick={closeMobileSidebar} aria-label="Telemetry Hub traces">
                <span className="flex aspect-square size-7 items-center justify-center rounded-md bg-purple-600 text-white">
                  <Activity className="size-3.5" />
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-xs font-semibold">Telemetry Hub</span>
                  <span className="truncate text-[10px] text-muted-foreground">Observability</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="p-1.5">
          <SidebarGroupLabel className="h-7 px-1.5 text-[10px] uppercase tracking-wide">Explore</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild size="sm" isActive={active} tooltip={item.label}>
                      <Link
                        to={item.path}
                        onClick={closeMobileSidebar}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="group-data-[collapsible=icon]:hidden">
            <ModeToggle />
          </div>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function MobileAppSidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-dvh w-12 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden">
      <Link
        to="/"
        className="flex h-12 items-center justify-center border-b border-sidebar-border"
        aria-label="Telemetry Hub traces"
        title="Telemetry Hub"
      >
        <span className="flex size-8 items-center justify-center rounded-md bg-purple-600 text-white">
          <Activity className="size-4" aria-hidden="true" />
        </span>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1 py-2" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex size-9 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                active && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              <Icon className="size-4" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
