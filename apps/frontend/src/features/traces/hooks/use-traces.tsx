import { getTraces } from '../api';
import { useExplorerResults } from '@/shared/hooks/use-explorer-results';

export function useTraces() {
  return useExplorerResults('traces', getTraces);
}
