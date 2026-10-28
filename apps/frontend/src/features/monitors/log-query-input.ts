import { parseSimpleLogCondition } from './simple-log-condition';
import { buildLogQuery, readHumanLogExpression, readLogBuilder } from './log-builder';

export function displayLogQuery(query: string, attribute?: string) {
  if (query === '*' && attribute) return attribute;
  const parsed = readLogBuilder(query);
  if (!parsed.advanced && parsed.filters.length) return parsed.filters.map(filter => filter.operator === 'equals'
    ? `${filter.parameter} = ${JSON.stringify(filter.value)}`
    : filter.operator === 'exists' ? `${filter.parameter} EXISTS`
    : `${filter.parameter} ${filter.operator} ${filter.value}`).join(' AND ');
  return query;
}

export function resolveLogQuery(input: string, aggregation: string, existingAttribute?: string) {
  const compound = readHumanLogExpression(input);
  if (compound) return resolveBuilder(buildLogQuery(compound).query, aggregation, existingAttribute);
  const condition = parseSimpleLogCondition(input);
  if (condition) {
    const operator = { above: '>', below: '<', above_or_equal: '>=', below_or_equal: '<=' }[condition.comparator];
    return { query: `@${condition.attribute}:${operator}${condition.threshold}`, attribute: aggregation === 'count' ? undefined : condition.attribute };
  }
  if (/^@?[A-Za-z_][A-Za-z0-9_.-]*\s*(?:>=|<=|>|<|=|==|!=)/.test(input.trim()))
    return { query: '', attribute: undefined, error: 'Use valid AND filters, for example input_tokens > 10 AND Sku = "DSK-STD-01".' };
  if (aggregation === 'count') return { query: input.trim(), attribute: undefined };
  if (/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(input.trim())) return { query: '*', attribute: input.trim() };
  return resolveBuilder(input.trim(), aggregation, existingAttribute);
}

function resolveBuilder(query: string, aggregation: string, existingAttribute?: string) {
  const parsed = readLogBuilder(query);
  const numeric = [...new Set(parsed.filters.filter(filter => !['equals', 'exists'].includes(filter.operator)).map(filter => filter.parameter))];
  const attribute = numeric.length === 1 ? numeric[0] : existingAttribute;
  if (aggregation === 'count') return { query, attribute: undefined };
  return attribute ? { query, attribute } : { query: '', attribute: undefined,
    error: 'For numeric aggregation, enter a parameter query such as ForecastCount > 5.' };
}
