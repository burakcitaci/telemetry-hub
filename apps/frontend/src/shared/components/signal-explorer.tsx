import { useState, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AppFilterSidebar } from './app-filter-sidebar';
import { DataTable } from './data-table';
import { TelemetryActions } from './feature-actions';
import { FeatureHeader } from './feature-header';
import { FeatureBody, FeatureContent, FeatureLoading, FeaturePage, FeaturePanel } from './feature-layout';
import { QueryError } from './view-skeleton';
import type { useExplorerResults } from '../hooks/use-explorer-results';

interface ExplorerProps<T> {
  source: 'logs' | 'traces';
  columns: ColumnDef<T>[];
  results: ReturnType<typeof useExplorerResults<T>>;
  onOpen: (row: T) => void;
  children?: ReactNode;
}

function ExplorerPagination<T>({ results }: Pick<ExplorerProps<T>, 'results'>) {
  const { t } = useTranslation();
  if (!results.hasPrevious && !results.hasMore) return null;
  return (
    <nav aria-label={t('explorer.pagination')} className="flex items-center justify-end gap-3 py-4">
      <Button size="sm" variant="outline" disabled={!results.hasPrevious || results.loading}
        onClick={() => results.movePage(-1)}>{t('explorer.previous')}</Button>
      <span className="text-xs" aria-live="polite">{t('explorer.page', { number: results.pageNumber })}</span>
      <Button size="sm" variant="outline" disabled={!results.hasMore || results.loading}
        onClick={() => results.movePage(1)}>{t('explorer.next')}</Button>
    </nav>
  );
}

export function SignalExplorer<T>({ source, columns, results, onOpen, children }: ExplorerProps<T>) {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isLogs = source === 'logs';
  const emptyMessage = results.loading
    ? null
    : t(results.error ? 'explorer.unavailable' : 'explorer.noMatches');
  return (
    <FeaturePage>
      <FeatureHeader title={t(isLogs ? 'nav.logs' : 'nav.traces')}
        timeRange={results.timeRange} onTimeRangeChange={results.setTimeRange}
        onFiltersOpen={() => setFiltersOpen(true)}
        actions={<TelemetryActions connected={results.connected} paused={results.paused}
          onPausedChange={results.setPaused} loading={results.loading} onRefresh={results.refresh}
          label={t(isLogs ? 'explorer.refreshLogs' : 'explorer.refreshTraces')} />}
      />
      <FeatureBody>
        <AppFilterSidebar mobileOpen={filtersOpen} onMobileOpenChange={setFiltersOpen}
          environmentSource={source} timeRange={results.timeRange} onTimeRangeSelect={results.setTimeRange} />
        <FeatureContent>
          {results.error && <QueryError title={t('explorer.loadFailed')} message={results.error}
            retryLabel={t('explorer.retry')} retryingLabel={t('explorer.retrying')}
            onRetry={results.refresh} isRetrying={results.loading} className="mb-3" />}
          <FeaturePanel>
            <DataTable columns={columns} data={results.rows} density="telemetry" serverOrdered
              searchPlaceholder={t(isLogs ? 'explorer.searchLogs' : 'explorer.searchTraces')}
              searchValue={results.searchQuery} onSearchChange={results.setSearchQuery}
              enablePagination={false} onRowClick={onOpen} emptyMessage={emptyMessage} />
            {results.loading && results.rows.length === 0 && <FeatureLoading />}
            <ExplorerPagination results={results} />
          </FeaturePanel>
        </FeatureContent>
      </FeatureBody>
      {children}
    </FeaturePage>
  );
}
