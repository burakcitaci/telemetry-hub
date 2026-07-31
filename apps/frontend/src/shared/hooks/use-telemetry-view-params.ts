import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

interface TelemetryViewParamsOptions {
  facetParam: 'severity' | 'status';
  defaultTimeRange?: string;
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function useTelemetryViewParams({
  facetParam,
  defaultTimeRange = '6h',
}: TelemetryViewParamsOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  const serviceFilters = useMemo(
    () => uniqueValues(searchParams.getAll('service')),
    [searchParams],
  );
  const facetFilters = useMemo(
    () => uniqueValues(searchParams.getAll(facetParam)),
    [facetParam, searchParams],
  );
  const timeRange = searchParams.get('range') || defaultTimeRange;
  const searchQuery = searchParams.get('q') || '';

  const setListParam = useCallback((key: string, values: string[]) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(key);
      uniqueValues(values).forEach((value) => next.append(key, value));
      return next;
    });
  }, [setSearchParams]);

  const setServiceFilters = useCallback(
    (values: string[]) => setListParam('service', values),
    [setListParam],
  );
  const setFacetFilters = useCallback(
    (values: string[]) => setListParam(facetParam, values),
    [facetParam, setListParam],
  );
  const setTimeRange = useCallback((value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value === defaultTimeRange) next.delete('range');
      else next.set('range', value);
      return next;
    });
  }, [defaultTimeRange, setSearchParams]);
  const setSearchQuery = useCallback((value: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set('q', value);
      else next.delete('q');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    serviceFilters,
    setServiceFilters,
    facetFilters,
    setFacetFilters,
    timeRange,
    setTimeRange,
    searchQuery,
    setSearchQuery,
  };
}
