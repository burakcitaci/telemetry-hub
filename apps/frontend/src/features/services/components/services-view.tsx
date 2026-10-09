import { FeatureRefreshButton } from '@/shared/components/feature-actions';
import {
  FeaturePage,
  FeatureHeader,
  FeatureBody,
  FeatureContent,
  FeaturePanel,
  FeatureSidebar,
  FeatureSearch,
  FeatureLoading,
  FeatureEmptyState,
} from '@/shared/components/feature-layout';

import type { useServices } from '../hooks/use-services';
import {
  Activity,
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
    <FeaturePage>
      {/* Top Navigation Bar */}
      <FeatureHeader
        title="Services"
        icon={Activity}
        description={<>{services.length} discovered services</>}
        actions={
          <>
            <nav className="flex items-center gap-3 text-xs font-medium">
              <a
                href="#"
                className="text-primary border-b-2 border-primary py-1"
              >
                Explore
              </a>
              <Link
                to="/setup"
                className="text-muted-foreground hover:text-foreground py-1 flex items-center gap-1"
              >
                <Settings className="h-3 w-3" /> Setup & Config
              </Link>
            </nav>
            <span className="text-xs text-muted-foreground">
              Feb 22, 10:40 am – Feb 22, 11:40 am
            </span>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Info className="mr-1 h-3 w-3" /> Learn More
            </Button>
            <FeatureRefreshButton
              loading={loading}
              onRefresh={() => void loadServices()}
              label="Refresh services"
            />
          </>
        }
      />

      {/* Main Content Area */}
      <FeatureBody>
        {/* Left Sidebar */}
        <FeatureSidebar title="Filters">
          <div className="mb-6">
            <FeatureSearch type="text" placeholder="Search facets" />
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
        </FeatureSidebar>

        {/* Right Main Content */}
        <FeatureContent>
          {/* Top Action Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
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
              <FeatureSearch
                type="text"
                placeholder="Search for service by name or facets"
              />
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
          <FeaturePanel className="p-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {loading && services.length === 0 ? (
              <FeatureLoading />
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
              <FeatureEmptyState>
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
              </FeatureEmptyState>
            )}
          </FeaturePanel>

          {/* Refresh button */}
        </FeatureContent>
      </FeatureBody>
    </FeaturePage>
  );
}
