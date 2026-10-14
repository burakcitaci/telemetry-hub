import type { MonitorView } from './model';

/** Only editable fields belong in requests; persisted observations are server-owned. */
export function monitorPayload(draft: Partial<MonitorView>) {
  return { name: draft.name, type: draft.type, query: draft.query, comparator: draft.comparator,
    threshold: draft.threshold, warnThreshold: draft.warnThreshold, evaluationWindow: draft.evaluationWindow,
    aggregation: draft.type === 'log' && !draft.logAttribute ? 'count' : draft.aggregation,
    logAttribute: draft.type === 'log' ? draft.logAttribute || undefined : undefined,
    metricType: draft.metricType ?? 'gauge', signalStatus: draft.type === 'metric' ? undefined : draft.signalStatus,
    noDataPolicy: draft.noDataPolicy ?? 'no_data', groupBy: draft.groupBy ?? [],
    teamId: draft.teamId || undefined, service: draft.service || undefined, env: draft.env === 'all' ? undefined : draft.env || undefined,
    isMuted: draft.isMuted ?? false, message: draft.message ?? '', targets: draft.targets ?? [] };
}
