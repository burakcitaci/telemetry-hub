import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Facet, FacetSelection } from '../lib/facet';


interface FacetQueryBarProps {
  facets: Facet[];
  selection: FacetSelection;
  onChange: (next: FacetSelection) => void;
}

interface Suggestion {
  key: string;
  value: string;
  count: number;
  label: string;
}

const FacetPill: React.FC<{
  facet: Facet;
  value: string;
  onRemove: () => void;
}> = ({ facet, value, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs">
    <span className="text-muted-foreground">{facet.label}:</span>
    <span className="font-mono">{value}</span>
    <button
      type="button"
      onClick={onRemove}
      className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
      aria-label={`Remove ${facet.label} = ${value}`}
    >
      <X className="h-3 w-3" />
    </button>
  </span>
);

export function FacetQueryBar({ facets, selection, onChange }: FacetQueryBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten facets → suggestions. Counts come straight from the facet builder.
  const allSuggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = [];
    for (const f of facets) {
      for (const v of f.values) {
        out.push({
          key: f.key,
          value: v.value,
          count: v.count,
          label: `${f.label}: ${v.value}`,
        });
      }
    }
    return out;
  }, [facets]);

  // Filter by the typed query (matches either facet label or value).
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Hide values that are already selected
    const selectedSet = new Set(
      Object.entries(selection).flatMap(([k, vs]) => vs.map((v) => `${k}::${v}`)),
    );
    const pool = allSuggestions.filter((s) => !selectedSet.has(`${s.key}::${s.value}`));
    if (!q) return pool.slice(0, 12);
    return pool
      .filter((s) =>
        s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [allSuggestions, query, selection]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => setHighlighted(0), [query, open]);

  const addSelection = (s: Suggestion) => {
    const existing = selection[s.key] ?? [];
    if (existing.includes(s.value)) return;
    onChange({ ...selection, [s.key]: [...existing, s.value] });
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeSelection = (key: string, value: string) => {
    const existing = selection[key] ?? [];
    const next = existing.filter((v) => v !== value);
    const nextSelection = { ...selection };
    if (next.length === 0) delete nextSelection[key];
    else nextSelection[key] = next;
    onChange(nextSelection);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlighted]) addSelection(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && query === '') {
      // Backspace on empty input pops the last chip
      const entries = Object.entries(selection);
      const last = entries[entries.length - 1];
      if (last) removeSelection(last[0], last[1][last[1].length - 1]);
    }
  };

  const activeChips = Object.entries(selection).flatMap(([key, values]) => {
    const facet = facets.find((f) => f.key === key);
    if (!facet) return [];
    return values.map((value) => ({ facet, value }));
  });

  return (
    <div ref={rootRef} className="relative">
      <div
        className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {activeChips.map(({ facet, value }) => (
          <FacetPill
            key={`${facet.key}::${value}`}
            facet={facet}
            value={value}
            onRemove={() => removeSelection(facet.key, value)}
          />
        ))}
        <div className="relative flex flex-1 items-center gap-1.5 min-w-[140px]">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={activeChips.length ? 'Add filter…' : 'Filter by host, service, environment…'}
            className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={`${s.key}::${s.value}`}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => addSelection(s)}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                i === highlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {s.key}
                </span>
                <span className="font-mono">{s.value}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}