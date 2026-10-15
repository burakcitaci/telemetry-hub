export function severityAccent(severity: string) {
  const s = (severity ?? '').toUpperCase();
  if (s.includes('ERROR') || s.includes('FATAL')) return 'bg-destructive';
  if (s.includes('WARN'))  return 'bg-amber-500';
  if (s.includes('INFO'))  return 'bg-blue-500';
  return 'bg-muted-foreground/40';
}