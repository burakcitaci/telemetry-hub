import { useCallback, useEffect, useState } from 'react';
import {
  getFilterOptions,
  type FilterOptions,
  type FilterOptionsSource,
} from '@/shared/api/filter-options';
import { resolveTelemetryRange } from '@/shared/lib/telemetry';

const EMPTY_OPTIONS: FilterOptions = {
  services: [],
  environments: [],
  statuses: [],
};

export function useFilterOptions(
  source: FilterOptionsSource,
  range: string,
  scopeKey: string,
) {
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    const refresh = async () => {
      setLoading(true);
      try {
        const { from, to } = resolveTelemetryRange(range);
        const discovered = await getFilterOptions(
          {
            source,
            from: from.toISOString(),
            to: to.toISOString(),
          },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setOptions(discovered);
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setOptions(EMPTY_OPTIONS);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [range, revision, scopeKey, source]);

  return { options, loading, error, retry };
}
