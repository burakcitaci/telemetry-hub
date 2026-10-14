import type { Comparator } from './model';

export function parseSimpleLogCondition(expression: string) {
  const match = expression.trim().match(/^@?([A-Za-z_][A-Za-z0-9_.-]{0,127})\s*(>=|<=|>|<)\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/);
  if (!match || !Number.isFinite(Number(match[3]))) return null;
  const comparators: Record<string, Comparator> = { '>': 'above', '>=': 'above_or_equal', '<': 'below', '<=': 'below_or_equal' };
  return { attribute: match[1], comparator: comparators[match[2]], threshold: Number(match[3]) };
}

export function simpleLogCondition(attribute: string, comparator: string, threshold: number) {
  const symbols: Record<string, string> = { above: '>', above_or_equal: '>=', below: '<', below_or_equal: '<=' };
  return attribute ? `${attribute} ${symbols[comparator] ?? '>'} ${threshold}` : '';
}
