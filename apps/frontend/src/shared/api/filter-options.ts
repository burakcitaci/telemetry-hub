import { api, unwrap } from '@/shared/api/client';

export type FilterOptionsSource =
  | 'all'
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'services'
  | 'monitors';

export interface FilterOptions {
  services: string[];
  environments: string[];
  statuses: string[];
}

interface FilterOptionsQuery {
  source: FilterOptionsSource;
  from: string;
  to: string;
}

export async function getFilterOptions(
  query: FilterOptionsQuery,
  signal?: AbortSignal,
): Promise<FilterOptions> {
  const response = await api.get<FilterOptions>('/filters', {
    params: query,
    signal,
  });

  return unwrap(response.data);
}
