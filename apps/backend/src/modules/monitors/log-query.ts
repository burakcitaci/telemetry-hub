import { BadRequestException } from '@nestjs/common';
import type { MonitorDto } from '../auth/dto/monitor.dto';

const KEY = '[A-Za-z_][A-Za-z0-9_.-]{0,127}';
export const numericLogValue = "toFloat64OrNull(q.LogAttributes[{logAttribute:String}])";

/** Accept the simple measure shorthand, not arbitrary executable expressions. */
export function normalizeLogRule(rule: MonitorDto): MonitorDto {
  if (rule.type !== 'log') return rule;
  const expression = rule.query.trim().match(new RegExp(`^(avg|sum|min|max|p95)\\(\\s*@?(${KEY})\\s*\\)$`));
  if (!expression) return rule;
  if (rule.logAttribute && rule.logAttribute !== expression[2])
    throw new BadRequestException('Query measure and numeric attribute disagree.');
  return { ...rule, query: '*', aggregation: expression[1], logAttribute: expression[2] };
}

export function validateLogQuery(query: string): void {
  if (/^(avg|sum|min|max|p95|count)\s*\(/i.test(query.trim()))
    throw new BadRequestException('Use max(attribute) or choose a numeric attribute and aggregation separately.');
  logSearch(query, {});
}

/** Supported subset: @attribute:value, numeric comparisons and AND; literals are parameters. */
export function logSearch(query: string, params: Record<string, unknown>): string {
  const text = query.trim();
  if (text === '*') return '1';
  if (!text.startsWith('@')) {
    params.search = text;
    return 'positionCaseInsensitiveUTF8(q.Body, {search:String}) > 0';
  }
  const clauses: string[] = [];
  let rest = text;
  while (rest) {
    const token = rest.match(new RegExp(`^@(${KEY}):(?:(>=|<=|>|<|=|!=)(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)|"((?:[^"\\\\]|\\\\.)*)"|([^\\s]+))(?=\\s|$)`));
    if (!token) throw new BadRequestException('Use @attribute:value or @attribute:>5; combine filters with AND.');
    const index = clauses.length;
    params[`logKey${index}`] = token[1];
    const field = `q.LogAttributes[{logKey${index}:String}]`;
    if (token[2]) {
      const value = Number(token[3]);
      if (!Number.isFinite(value)) throw new BadRequestException('Numeric attribute filter must be finite.');
      params[`logValue${index}`] = value;
      const numeric = `toFloat64OrNull(${field})`;
      clauses.push(`(isFinite(${numeric}) AND ${numeric} ${token[2] === '=' ? '=' : token[2]} {logValue${index}:Float64})`);
    } else {
      if (token[5] && /^[><=!]/.test(token[5])) throw new BadRequestException('Attribute comparisons require a finite number.');
      let value: string;
      try { value = token[4] !== undefined ? JSON.parse(`"${token[4]}"`) : token[5]; }
      catch { throw new BadRequestException('Quoted attribute values must use valid JSON escaping.'); }
      params[`logValue${index}`] = value;
      clauses.push(value === '*' ? `mapContains(q.LogAttributes, {logKey${index}:String})`
        : `(mapContains(q.LogAttributes, {logKey${index}:String}) AND ${field} = {logValue${index}:String})`);
    }
    rest = rest.slice(token[0].length).trim();
    if (rest && !rest.startsWith('AND ')) throw new BadRequestException('Separate attribute filters with AND.');
    if (rest) { rest = rest.slice(4).trim(); if (!rest) throw new BadRequestException('Missing filter after AND.'); }
    if (clauses.length > 10) throw new BadRequestException('Use at most ten attribute filters.');
  }
  return clauses.join(' AND ');
}
