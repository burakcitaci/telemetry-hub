export function severityAccent(severity: string) {
  const s = (severity ?? '').toUpperCase();
  if (s.includes('ERROR') || s.includes('FATAL')) return 'bg-destructive';
  if (s.includes('WARN'))  return 'bg-amber-500';
  if (s.includes('INFO'))  return 'bg-blue-500';
  return 'bg-muted-foreground/40';
}
// components/utils/severity.ts (or a new file: trace-status.ts)
export function traceStatusAccent(status: string | undefined) {
  const s = (status ?? "").toUpperCase();
  if (s.includes("ERROR")) return "bg-destructive";
  if (s.includes("OK"))    return "bg-emerald-500";
  // UNSET / unknown / empty → neutral
  return "bg-muted-foreground/40";
}