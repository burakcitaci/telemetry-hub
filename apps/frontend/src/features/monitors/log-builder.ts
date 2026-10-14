export interface LogFilter { parameter: string; operator: 'equals' | 'exists' | '>' | '>=' | '<' | '<=' | '=' | '!='; value: string; }
export interface LogBuilderState { filters: LogFilter[]; message: string; advanced: boolean; }
export const calculationLabels: Record<string, string> = { count: 'Count matching logs', max: 'Maximum', min: 'Minimum', avg: 'Average', sum: 'Total', p95: '95th percentile' };
const keyPattern = /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/;

export function buildLogQuery(state: LogBuilderState): { query: string; error?: string } {
  if (state.filters.length > 10) return { query: '', error: 'Use at most 10 filters.' };
  const clauses: string[] = [];
  for (const filter of state.filters) {
    const key = filter.parameter.trim();
    if (!keyPattern.test(key)) return { query: '', error: 'Enter a parameter name, for example ForecastCount or order.total.' };
    if (filter.operator === 'exists') { clauses.push(`@${key}:*`); continue; }
    if (!filter.value.trim()) return { query: '', error: `Enter a value for ${key}.` };
    if (filter.operator === 'equals') clauses.push(`@${key}:${JSON.stringify(filter.value)}`);
    else {
      const value = Number(filter.value);
      if (!Number.isFinite(value)) return { query: '', error: `Enter a number for ${key}.` };
      clauses.push(`@${key}:${filter.operator}${value}`);
    }
  }
  const query = clauses.length ? clauses.join(' AND ') : state.message.trim() || '*';
  return query.length > 4000 ? { query: '', error: 'These filters are too long. Shorten their values.' } : { query };
}

export function readLogBuilder(query: string): LogBuilderState {
  const state: LogBuilderState = { filters: [], message: '', advanced: false };
  let rest = query.trim();
  if (!rest || rest === '*') return state;
  if (!rest.startsWith('@')) return /^(avg|sum|min|max|p95|count)\s*\(/i.test(rest) ? { ...state, advanced: true } : { ...state, message: rest };
  while (rest) {
    const match = rest.match(/^@([A-Za-z_][A-Za-z0-9_.-]{0,127}):(?:(>=|<=|>|<|=|!=)(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)|"((?:[^"\\]|\\.)*)"|([^\s]+))(?=\s|$)/);
    if (!match) return { ...state, advanced: true };
    if (match[5] && /^[><=!]/.test(match[5])) return { ...state, advanced: true };
    try { state.filters.push({ parameter: match[1], operator: match[2] as LogFilter['operator'] || (match[5] === '*' ? 'exists' : 'equals'),
      value: match[3] ?? (match[4] !== undefined ? JSON.parse(`"${match[4]}"`) : match[5] === '*' ? '' : match[5]) }); }
    catch { return { ...state, advanced: true }; }
    rest = rest.slice(match[0].length).trim();
    if (rest && !rest.startsWith('AND ')) return { ...state, advanced: true };
    if (rest) { rest = rest.slice(4).trim(); if (!rest) return { ...state, advanced: true }; }
  }
  return state;
}

export function logRuleSummary(attribute: string, calculation: string) {
  return attribute.trim() ? `${calculationLabels[calculation] ?? calculation} of ${attribute.trim()}` : 'Number of matching log records';
}
