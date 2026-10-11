import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Facet, FacetSelection } from "../lib/facet";

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

export function FacetQueryBar({
  facets,
  selection,
  onChange,
}: FacetQueryBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

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
      Object.entries(selection).flatMap(([k, vs]) =>
        vs.map((v) => `${k}::${v}`),
      ),
    );
    const pool = allSuggestions.filter(
      (s) => !selectedSet.has(`${s.key}::${s.value}`),
    );
    if (!q) return pool.slice(0, 12);
    return pool
      .filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.value.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [allSuggestions, query, selection]);

  // The portalled list is outside rootRef, but still belongs to this control.
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      const target = e.target as Node | null;
      if (
        target &&
        !rootRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [open]);

  // Fixed positioning escapes clipping and follows nested scroll containers.
  useLayoutEffect(() => {
    if (!open || suggestions.length === 0) return;
    const update = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4;
      const below = Math.max(0, window.innerHeight - rect.bottom - gap - 8);
      const above = Math.max(0, rect.top - gap - 8);
      const desired = Math.min(288, suggestions.length * 36);
      const flip = below < desired && above > below;
      const maxHeight = Math.min(desired, flip ? above : below);
      const width = Math.min(rect.width, Math.max(0, window.innerWidth - 16));
      setPosition({
        top: flip ? rect.top - gap - maxHeight : rect.bottom + gap,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, suggestions.length]);

  useEffect(() => setHighlighted(0), [query, open]);

  const addSelection = (s: Suggestion) => {
    const existing = selection[s.key] ?? [];
    if (existing.includes(s.value)) return;
    onChange({ ...selection, [s.key]: [...existing, s.value] });
    setQuery("");
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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) =>
        open ? Math.max(0, Math.min(h + 1, suggestions.length - 1)) : 0,
      );
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && suggestions[highlighted])
        addSelection(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && query === "") {
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
    <div ref={rootRef} className="relative w-full min-w-0 max-w-full">
      <div
        className="flex min-h-9 w-full min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-1 focus-within:ring-ring"
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
        <div className="relative flex min-w-0 flex-1 items-center gap-1.5">
          <Input
            ref={inputRef}
            role="combobox"
            aria-label="Add telemetry filter"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={open && suggestions.length > 0 ? listId : undefined}
            aria-activedescendant={
              open && suggestions[highlighted]
                ? `${listId}-${highlighted}`
                : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={
              activeChips.length
                ? "Add filter…"
                : "Filter by host, service, environment…"
            }
            className="h-7 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {open &&
        suggestions.length > 0 &&
        position &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listId}
            role="listbox"
            aria-label="Telemetry filter suggestions"
            style={position}
            className="fixed z-[50] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg"
          >
            {suggestions.map((s, i) => (
              <button
                key={`${s.key}::${s.value}`}
                type="button"
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlighted}
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => addSelection(s)}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                  i === highlighted
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {s.key}
                  </span>
                  <span className="min-w-0 font-mono [overflow-wrap:anywhere]">
                    {s.value}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {s.count}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
