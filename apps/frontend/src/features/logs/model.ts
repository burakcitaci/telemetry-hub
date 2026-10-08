export function normalizeSeverity(severity: string): string {
  const normalized = severity.toUpperCase();
  if (normalized === 'WARNING') return 'WARN';
  if (normalized === 'FATAL') return 'ERROR';
  return ['INFO', 'WARN', 'ERROR'].includes(normalized) ? normalized : 'OTHER';
}
