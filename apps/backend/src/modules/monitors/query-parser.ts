export interface QueryWarning {
  code: 'UNKNOWN_QUERY_KEY';
  key: string;
}

export interface ParsedMonitorQuery {
  filters: Record<string, string>;
  warnings: QueryWarning[];
}

export const MAX_MONITOR_QUERY_LENGTH = 4000;
const TOKEN = /^([A-Za-z_][A-Za-z0-9_.-]{0,127}):("(?:[^"\\]|\\.)*"|[^\s"()]+)(?:\s+|$)/u;

// TODO: Extend the grammar explicitly if OR, negation, wildcards or grouping are approved.
function* queryTokens(query: string): Generator<[string, string]> {
  if (query.length > MAX_MONITOR_QUERY_LENGTH) throw new SyntaxError('Monitor query exceeds 4000 characters.');
  let rest = query.trim();
  while (rest) {
    const match = rest.match(TOKEN);
    if (!match) throw new SyntaxError('Use space-separated key:value filters.');
    const value: string = match[2].startsWith('"') ? JSON.parse(match[2]) : match[2];
    if (!value.length || /[*()]/u.test(value) || /^[!<>=]/u.test(value))
      throw new SyntaxError('Empty values, wildcards, grouping and comparisons are unsupported.');
    yield [match[1], value];
    rest = rest.slice(match[0].length);
  }
}

export function parseMonitorQuery(query: string, supportedKeys: ReadonlySet<string>,
  warn: (warning: QueryWarning) => void = warning => console.warn(warning)): ParsedMonitorQuery {
  const tokens = [...queryTokens(query)];
  const filters = new Map<string, string>();
  const warnings: QueryWarning[] = [];
  for (const [key, value] of tokens) {
    if (!supportedKeys.has(key)) {
      warnings.push({ code: 'UNKNOWN_QUERY_KEY', key });
      continue;
    }
    if (filters.has(key) && filters.get(key) !== value)
      throw new SyntaxError('Conflicting values for the same query key are unsupported.');
    filters.set(key, value);
  }
  warnings.forEach(warn);
  return { filters: Object.fromEntries(filters), warnings };
}
