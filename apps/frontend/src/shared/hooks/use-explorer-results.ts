import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import type { ExplorerQuery } from '../types/telemetry';
import { getErrorMessage } from '../lib/errors';
import { platformFilterKey } from '../lib/platform-filters';
import { resolveTelemetryRange } from '../lib/telemetry';
import { useTelemetryStream } from './use-telemetry-stream';
import { useTelemetryViewParams } from './use-telemetry-view-params';

const PAGE_SIZE = 20;
const MAX_OFFSET = 1_000_000;

export function useExplorerResults<T>(
  source: 'logs' | 'traces',
  fetchRows: (query: ExplorerQuery, signal: AbortSignal) => Promise<T[]>,
) {
  const { t } = useTranslation();
  const { search } = useLocation();
  const { timeRange, setTimeRange, searchQuery, setSearchQuery, env, serviceFilters, facetFilters } =
    useTelemetryViewParams({ facetParam: source === 'logs' ? 'severity' : 'status' });
  const filters = JSON.stringify({ env, q: searchQuery.trim(), services: serviceFilters, statuses: facetFilters });
  const scopeKey = platformFilterKey(search);
  const key = JSON.stringify([scopeKey, timeRange, filters]);
  const [page, setPage] = useState({ key: '', offset: 0, anchor: 0 });
  const [revision, setRevision] = useState(0);
  const [request, setRequest] = useState<{ key: string; rows: T[]; loading: boolean; error: string | null }>();
  const [paused, setPaused] = useState(false);
  const latestAnchor = useRef(0);
  const inFlight = useRef(false);
  const offset = page.key === key ? page.offset : 0;
  const anchor = page.key === key ? page.anchor : 0;
  const requestKey = JSON.stringify([key, offset]);
  const errorText = t('explorer.loadFailed');

  useEffect(() => {
    const controller = new AbortController();
    inFlight.current = true;
    setRequest(previous => ({
      key: requestKey, rows: previous?.key === requestKey ? previous.rows : [], loading: true, error: null,
    }));
    const timer = window.setTimeout(async () => {
      try {
        latestAnchor.current = anchor || Date.now();
        const range = resolveTelemetryRange(timeRange, latestAnchor.current);
        const rows = await fetchRows({
          ...JSON.parse(filters), from: range.from.toISOString(), to: range.to.toISOString(),
          limit: PAGE_SIZE + 1, offset,
        }, controller.signal);
        if (!controller.signal.aborted) setRequest({ key: requestKey, rows, loading: false, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setRequest(previous => ({
          key: requestKey, rows: previous?.rows ?? [], loading: false,
          error: getErrorMessage(error, errorText),
        }));
      } finally {
        if (!controller.signal.aborted) inFlight.current = false;
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      inFlight.current = false;
    };
  }, [anchor, errorText, fetchRows, filters, offset, requestKey, revision, timeRange]);

  function refresh() {
    if (!offset) setPage({ key, offset: 0, anchor: 0 });
    setRevision(value => value + 1);
  }

  const connected = useTelemetryStream(event => {
    if (event.type !== 'update') return;
    const changed = source === 'logs' ? event.logsChanged : event.tracesChanged;
    if (changed && !paused && !offset && !inFlight.current
      && resolveTelemetryRange(timeRange).isLive) refresh();
  }, scopeKey);

  const current = request?.key === requestKey ? request : undefined;
  return {
    timeRange, setTimeRange, searchQuery, setSearchQuery, connected, paused,
    setPaused(value: boolean) { setPaused(value); if (!value) refresh(); },
    refresh, rows: current?.rows.slice(0, PAGE_SIZE) ?? [],
    loading: current?.loading ?? true, error: current?.error ?? null,
    pageNumber: offset / PAGE_SIZE + 1,
    hasPrevious: offset > 0,
    hasMore: (current?.rows.length ?? 0) > PAGE_SIZE && offset < MAX_OFFSET,
    movePage(delta: number) {
      setPage({ key, offset: offset + delta * PAGE_SIZE, anchor: latestAnchor.current });
    },
  };
}
