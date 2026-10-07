export type TimeRangeSpec =
  | { kind: 'sliding'; raw: string; durationMs: number }
  | { kind: 'growing'; raw: string; startMs: number }
  | { kind: 'fixed'; raw: string; startMs: number; endMs: number };

export interface ResolvedRange {
  from: Date;
  to: Date;
  label: string;
  isLive: boolean; // true if it re-evaluates on every call (sliding / growing)
}

const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  min: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  mo: 2_592_000_000, // 30d
  month: 2_592_000_000,
  y: 31_536_000_000,
  year: 31_536_000_000,
};

// Normalize common variants → canonical unit key
function normUnit(u: string): string {
  const x = u.toLowerCase();
  if (['s', 'sec', 'secs', 'second', 'seconds'].includes(x)) return 's';
  if (['m', 'min', 'mins', 'minute', 'minutes'].includes(x)) return 'm';
  if (['h', 'hr', 'hrs', 'hour', 'hours'].includes(x)) return 'h';
  if (['d', 'day', 'days'].includes(x)) return 'd';
  if (['w', 'wk', 'wks', 'week', 'weeks'].includes(x)) return 'w';
  if (['mo', 'mos', 'month', 'months'].includes(x)) return 'mo';
  if (['y', 'yr', 'yrs', 'year', 'years'].includes(x)) return 'y';
  return '';
}

export function parseTimeRange(input: string): TimeRangeSpec | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // 1. Sliding: "5m", "2 h", "3 days", "15min"
  const sliding = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (sliding) {
    const n = Number(sliding[1]);
    const u = normUnit(sliding[2]);
    if (u && Number.isFinite(n) && n > 0) {
      return {
        kind: 'sliding',
        raw: input,
        durationMs: n * UNIT_MS[u],
      };
    }
  }

  // 2. Growing: "since <ts>", "from <ts>", "<ts> to now"
  const growingSince = s.match(/^(?:since|from)\s+(.+)$/);
  if (growingSince) {
    const startMs = parseTimestamp(growingSince[1]);
    if (startMs != null) return { kind: 'growing', raw: input, startMs };
  }
  const growingToNow = s.match(/^(.+?)\s+to\s+now$/);
  if (growingToNow) {
    const startMs = parseTimestamp(growingToNow[1]);
    if (startMs != null) return { kind: 'growing', raw: input, startMs };
  }

  // 3. Fixed range: "<a> - <b>" or "<a> to <b>"
  const range = s.match(/^(.+?)\s+(?:-|to)\s+(.+)$/);
  if (range && !range[1].includes(' to ') && !range[1].includes(' - ')) {
    const a = parseTimestamp(range[1]);
    const b = parseTimestamp(range[2]);
    if (a != null && b != null) {
      return { kind: 'fixed', raw: input, startMs: a, endMs: b };
    }
  }

  // 4. Single timestamp → fixed "point" range (1 minute window)
  const single = parseTimestamp(s);
  if (single != null) {
    return { kind: 'fixed', raw: input, startMs: single, endMs: single + 60_000 };
  }

  // 5. Keywords
  if (s === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { kind: 'growing', raw: input, startMs: start.getTime() };
  }

  return null;
}

// Supports: epoch seconds, ISO, "Jun 1", "Jun 1, 2024", "Jun 1 2024 3pm",
// "3pm", "15:00", "2024-01-15", "1/15/2024", and relative like "5h ago"
function parseTimestamp(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // Relative: "5h ago"
  const ago = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)\s+ago$/);
  if (ago) {
    const n = Number(ago[1]);
    const u = normUnit(ago[2]);
    if (u) return Date.now() - n * UNIT_MS[u];
  }

  // Bare relative (e.g. "5h" inside "since 5h") → treat as ago
  const bare = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (bare) {
    const n = Number(bare[1]);
    const u = normUnit(bare[2]);
    if (u) return Date.now() - n * UNIT_MS[u];
  }

  // Epoch seconds (10 digits) or millis (13 digits)
  if (/^\d{10}$/.test(s)) return Number(s) * 1000;
  if (/^\d{13}$/.test(s)) return Number(s);

  // Time-only: "3pm", "15:00"
  const timeOnly = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (timeOnly) {
    const now = new Date();
    let h = Number(timeOnly[1]);
    const m = Number(timeOnly[2] ?? 0);
    const ap = timeOnly[3];
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  // Fall back to Date.parse — handles ISO, RFC, "Jun 1 2024", "2024-01-15", "1/15/2024"
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return parsed;

  return null;
}

export function resolveTimeRange(spec: TimeRangeSpec, now = Date.now()): ResolvedRange {
  if (spec.kind === 'sliding') {
    return {
      from: new Date(now - spec.durationMs),
      to: new Date(now),
      label: spec.raw,
      isLive: true,
    };
  }
  if (spec.kind === 'growing') {
    return {
      from: new Date(spec.startMs),
      to: new Date(now),
      label: spec.raw,
      isLive: true,
    };
  }
  return {
    from: new Date(spec.startMs),
    to: new Date(spec.endMs),
    label: spec.raw,
    isLive: false,
  };
}

// Short friendly label for the button, e.g. "15m" → "Past 15 minutes"
export function friendlyLabel(spec: TimeRangeSpec): string {
  if (spec.kind === 'sliding') {
    const ms = spec.durationMs;
    if (ms < 60_000) return `Past ${Math.round(ms / 1000)} seconds`;
    if (ms < 3_600_000) return `Past ${Math.round(ms / 60_000)} minutes`;
    if (ms < 86_400_000) return `Past ${Math.round(ms / 3_600_000)} hours`;
    if (ms < 604_800_000) return `Past ${Math.round(ms / 86_400_000)} days`;
    return `Past ${Math.round(ms / 604_800_000)} weeks`;
  }
  if (spec.kind === 'growing') {
    return `Since ${new Date(spec.startMs).toLocaleString()}`;
  }
  return `${new Date(spec.startMs).toLocaleString()} → ${new Date(spec.endMs).toLocaleString()}`;
}

export const TIME_PRESETS: { value: string; label: string }[] = [
  { value: '5m', label: 'Last 5 minutes' },
  { value: '15m', label: 'Last 15 minutes' },
  { value: '1h', label: 'Last hour' },
  { value: '4h', label: 'Last 4 hours' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];