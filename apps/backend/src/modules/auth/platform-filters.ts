export type FilterSelection = string | string[];

export function filterValues(selection?: FilterSelection): string[] {
  return [...new Set((Array.isArray(selection) ? selection : selection ? [selection] : []).filter(value => value && value !== 'all'))];
}

export function singleFilter(selection?: FilterSelection): string | undefined {
  const values = filterValues(selection);
  return values.length === 1 ? values[0] : undefined;
}
