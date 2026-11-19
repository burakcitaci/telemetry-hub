import { useState } from 'react';
import { getLogs } from '../api';
import type { LogRecord } from '../types';
import { useExplorerResults } from '@/shared/hooks/use-explorer-results';

export function useLogs() {
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  return { ...useExplorerResults('logs', getLogs), selectedLog, setSelectedLog };
}
