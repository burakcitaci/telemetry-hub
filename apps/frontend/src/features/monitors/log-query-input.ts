import { parseSimpleLogCondition } from './simple-log-condition';
import { readLogBuilder } from './log-builder';

export function displayLogQuery(query: string, attribute?: string) {
  if (query === '*' && attribute) return attribute;
  return query.replace(/@([A-Za-z_][A-Za-z0-9_.-]*):(>=|<=|>|<|=|!=)(-?[\d.eE+-]+)/g, '$1 $2 $3');
}

export function resolveLogQuery(input: string, aggregation: string, existingAttribute?: string) {
  const condition = parseSimpleLogCondition(input);
  if (condition) {
    const operator = { above: '>', below: '<', above_or_equal: '>=', below_or_equal: '<=' }[condition.comparator];
    return { query: `@${condition.attribute}:${operator}${condition.threshold}`, attribute: aggregation === 'count' ? undefined : condition.attribute };
  }
  if (/^@?[A-Za-z_][A-Za-z0-9_.-]*\s*(?:>=|<=|>|<)/.test(input.trim()))
    return { query: '', attribute: undefined, error: 'Enter a valid numeric filter, for example ForecastCount > 5.' };
  if (aggregation === 'count') return { query: input.trim(), attribute: undefined };
  if (/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(input.trim())) return { query: '*', attribute: input.trim() };
  const parsed = readLogBuilder(input);
  const numeric = [...new Set(parsed.filters.filter(filter => !['equals', 'exists'].includes(filter.operator)).map(filter => filter.parameter))];
  const attribute = numeric.length === 1 ? numeric[0] : existingAttribute;
  return attribute ? { query: input.trim(), attribute } : { query: '', attribute: undefined,
    error: 'For numeric aggregation, enter a parameter query such as ForecastCount > 5.' };
}
