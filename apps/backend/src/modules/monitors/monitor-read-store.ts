import type { FilterSelection } from '../auth/platform-filters';

/** Minimal read contract for monitor filtering; persistence stays behind PlatformStore. */
export interface MonitorReadStore {
  serviceOwnership(org: string, team: FilterSelection): { assigned: string[]; owned: string[] };
  monitors(org: string): Record<string, any>[];
}
