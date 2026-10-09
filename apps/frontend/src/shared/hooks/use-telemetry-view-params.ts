import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DEFAULT_TELEMETRY_RANGE,
  resolveTelemetryRange,
  TELEMETRY_FETCH_LIMIT,
} from '../lib/telemetry';

interface TelemetryViewParamsOptions {
  facetParam?: 'severity' | 'status';
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function useTelemetryViewParams({
  facetParam,
}: TelemetryViewParamsOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const serviceFilters = useMemo(
    () => uniqueValues(searchParams.getAll('service')),
    [searchParams],
  );
  const facetFilters = useMemo(
    () => (facetParam ? uniqueValues(searchParams.getAll(facetParam)) : []),
    [facetParam, searchParams],
  );
  const timeRange =
    searchParams.get('range')?.trim() ||
    searchParams.get('time')?.trim() ||
    DEFAULT_TELEMETRY_RANGE;
  const searchQuery = searchParams.get('q') || '';
  const filters = useMemo(
    () => ({
      service: serviceFilters,
      ...(facetParam ? { [facetParam]: facetFilters } : {}),
    }),
    [serviceFilters, facetParam, facetFilters],
  );

  const setListParam = useCallback(
    (key: string, values: string[]) => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete(key);
        uniqueValues(values).forEach((value) => next.append(key, value));
        return next;
      });
    },
    [setSearchParams],
  );

  const setServiceFilters = useCallback(
    (values: string[]) => setListParam('service', values),
    [setListParam],
  );
  const setFacetFilters = useCallback(
    (values: string[]) => {
      if (facetParam) setListParam(facetParam, values);
    },
    [facetParam, setListParam],
  );
  const setTimeRange = useCallback(
    (value: string) => {
      value = value.trim() || DEFAULT_TELEMETRY_RANGE;
      resolveTelemetryRange(value);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('time');
        if (value === DEFAULT_TELEMETRY_RANGE) next.delete('range');
        else next.set('range', value);
        return next;
      });
    },
    [setSearchParams],
  );
  const setSearchQuery = useCallback(
    (value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) next.set('q', value);
          else next.delete('q');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Endpoint-neutral adapter; resolve live windows immediately before fetching.
  const getApiParams = useCallback(
    (limit = TELEMETRY_FETCH_LIMIT, offset = 0, now = Date.now()) => {
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        !Number.isInteger(offset) ||
        offset < 0
      )
        throw new RangeError('Invalid pagination');
      const { from, to } = resolveTelemetryRange(timeRange, now);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        limit,
        offset,
        ...filters,
        ...(searchQuery ? { q: searchQuery } : {}),
      };
    },
    [timeRange, filters, searchQuery],
  );

  const getApiSearchParams = useCallback(
    (limit = TELEMETRY_FETCH_LIMIT, offset = 0) => {
      const params = new URLSearchParams();
      Object.entries(getApiParams(limit, offset)).forEach(([key, value]) => {
        if (Array.isArray(value))
          value.forEach((item) => params.append(key, item));
        else params.set(key, String(value));
      });
      return params;
    },
    [getApiParams],
  );

  return {
    range: timeRange,
    time: timeRange,
    filters,
    getApiParams,
    getApiSearchParams,
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
