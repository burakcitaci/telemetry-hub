import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  friendlyLabel,
  parseTimeRange,
  TIME_PRESETS,
  type TimeRangeSpec,
} from '@/shared/lib/time-range';

interface TimeRangePickerProps {
  /** Raw expression like "6h" or "since 3pm". Controlled by the parent. */
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

export function TimeRangePicker({ value, onChange, className }: TimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync draft when the outer value changes (e.g. from URL)
  useEffect(() => setDraft(value), [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const spec: TimeRangeSpec | null = useMemo(() => parseTimeRange(value), [value]);
  const buttonLabel = spec ? friendlyLabel(spec) : value || 'Select time range';

  const commitDraft = () => {
    const parsed = parseTimeRange(draft);
    if (!parsed) {
      setError(`Couldn't parse "${draft}"`);
      return;
    }
    setError(null);
    onChange(draft.trim());
    setOpen(false);
  };

  const pickPreset = (preset: string) => {
    setError(null);
    onChange(preset);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5 max-w-[240px]"
        title={buttonLabel}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{buttonLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover p-3 shadow-lg">
          {/* Free-text input */}
          <div className="mb-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDraft();
              }}
              placeholder="e.g. 15m, since 3pm, Jan 1 - Jan 2"
              className="h-8 text-xs font-mono"
            />
            {error ? (
              <p className="mt-1 text-[10px] text-red-600">{error}</p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Examples: <code>6h</code>, <code>since 3pm</code>, <code>today</code>,{' '}
                <code>Jan 1 - Jan 2</code>
              </p>
            )}
          </div>

          {/* Presets */}
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Presets
          </div>
          <div className="max-h-64 overflow-y-auto">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => pickPreset(p.value)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
                  value === p.value
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50'
                }`}
              >
                <span>{p.label}</span>
                <span className="font-mono text-[10px] opacity-60">{p.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}