import { Input } from '@/components/ui/input';
import type { useServices } from '../hooks/use-services';
import {
  Activity,
  RefreshCw,
  Search,
  Filter,
  LayoutList,
  Map as MapIcon,
  ChevronDown,
  Info,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataTable } from '@/shared/components/data-table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  columns,
  FacetSection,
} from '@/features/services/components/services-components';

type ServicesViewProps = ReturnType<typeof useServices>;

export function ServicesView({
  services,
  loading,
  generating,
  error,
  loadServices,
  rows,
  generateAndRefresh,
}: ServicesViewProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="flex h-14 items-center border-b px-4 gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Service Catalog</span>
        </div>
        <nav className="flex gap-4 text-sm font-medium">
          <a
            href="#"
            className="text-primary border-b-2 border-primary pb-4 pt-4"
          >
            Explore
          </a>
          <Link
            to="/setup"
            className="text-muted-foreground hover:text-foreground pb-4 pt-4 flex items-center gap-1"
          >
            <Settings className="h-3 w-3" /> Setup & Config
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span>Feb 22, 10:40 am – Feb 22, 11:40 am</span>
          <Button variant="outline" size="sm" className="h-7 text-xs">
            <Info className="mr-1 h-3 w-3" /> Learn More
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r bg-muted/50 overflow-y-auto p-4 hidden md:block">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search facets"
                className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <FacetSection
            title="Service Overview"
            items={[
              { label: 'Discovered', count: 226 },
              { label: 'User-defined', count: 4 },
            ]}
          />
          <FacetSection
            title="Telemetry Type"
            items={[
              { label: 'Distributed Tracing', count: 189 },
              { label: 'Universal Service Mon...', count: 20 },
              { label: 'Infrastructure Mon...', count: 54 },
              { label: 'Network Performa...', count: 47 },
              { label: 'Log Management', count: 106 },
              { label: 'Real User Monitori...', count: 10 },
              { label: 'Continuous Profiler', count: 0 },
              { label: 'No Telemetry Data', count: 5 },
            ]}
          />
          <FacetSection
            title="Type"
            items={[
              { label: 'Web', count: 61 },
              { label: 'DB', count: 22 },
              { label: 'Cache', count: 5 },
              { label: 'Function', count: 10 },
              { label: 'Custom', count: 119 },
              { label: 'Browser', count: 6 },
              { label: 'Mobile', count: 7 },
            ]}
          />
        </aside>

        {/* Right Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Top Action Bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <LayoutList className="h-3 w-3" /> List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-muted-foreground"
              >
                <MapIcon className="h-3 w-3" /> Map
              </Button>
              <div className="relative ml-4 w-96">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for service by name or facets"
                  className="w-full rounded-md border border-input bg-background pl-8 pr-2 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Filter className="h-3 w-3" /> Hide Controls
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                All <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {/* Table Section */}
          <div className="rounded-xl border border-border bg-card text-card-foreground">
            {error && (
              <Alert variant="destructive" className="m-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {loading && services.length === 0 ? (
              <div className="space-y-3 bg-background p-4 text-foreground">
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : rows.length > 0 ? (
              <DataTable
                columns={columns}
                data={rows}
                searchPlaceholder="Search for services"
                enableRowSelection={false}
                enableColumnVisibility={false}
                enablePagination
                pageSize={20}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Activity className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">No traced services found</p>
                  <p className="text-sm text-muted-foreground">
                    Generate an instrumented backend request, then allow the
                    collector time to export it.
                  </p>
                </div>
                <Button
                  onClick={() => void generateAndRefresh()}
                  disabled={generating}
                >
                  {generating ? 'Generating…' : 'Generate telemetry'}
                </Button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadServices()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
