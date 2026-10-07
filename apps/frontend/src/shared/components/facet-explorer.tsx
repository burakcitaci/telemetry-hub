import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Facet, FacetSelection } from '../lib/facet';


interface FacetExplorerProps {
  facets: Facet[];
  selection: FacetSelection;
  onSelectionChange: (next: FacetSelection) => void;
  /** Facet keys used to split series on the chart. */
  groupBy: string[];
  onGroupByChange: (next: string[]) => void;
  /** Optional title above the list. */
  title?: string;
}

export function FacetExplorer({
  facets,
  selection,
  onSelectionChange,
  groupBy,
  onGroupByChange,
  title = 'Filters',
}: FacetExplorerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {facets.map((facet) => (
            <FacetSection
              key={facet.key}
              facet={facet}
              selected={selection[facet.key] ?? []}
              onSelectedChange={(next) => {
                const nextSelection = { ...selection };
                if (next.length === 0) delete nextSelection[facet.key];
                else nextSelection[facet.key] = next;
                onSelectionChange(nextSelection);
              }}
              isGroupedBy={groupBy.includes(facet.key)}
              onToggleGroupBy={() => {
                onGroupByChange(
                  groupBy.includes(facet.key)
                    ? groupBy.filter((k) => k !== facet.key)
                    : [...groupBy, facet.key],
                );
              }}
            />
          ))}
          {facets.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No facets available
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

const FacetSection: React.FC<{
  facet: Facet;
  selected: string[];
  onSelectedChange: (next: string[]) => void;
  isGroupedBy: boolean;
  onToggleGroupBy: () => void;
}> = ({ facet, selected, onSelectedChange, isGroupedBy, onToggleGroupBy }) => {
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return facet.values;
    const q = query.toLowerCase();
    return facet.values.filter((v) => v.value.toLowerCase().includes(q));
  }, [facet.values, query]);

  const toggle = (value: string, checked: boolean) => {
    onSelectedChange(
      checked ? [...new Set([...selected, value])] : selected.filter((v) => v !== value),
    );
  };

  return (
    <section>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-auto flex-1 justify-between px-2 py-1.5"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2 text-xs font-medium truncate">
            <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{facet.label}</span>
            {selected.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {selected.length}
              </Badge>
            )}
          </span>
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        </Button>
        <Button
          variant={isGroupedBy ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleGroupBy}
          className="h-7 shrink-0 px-2 text-[10px] uppercase tracking-wide"
          title={isGroupedBy ? 'Grouped by this facet' : 'Group series by this facet'}
        >
          group
        </Button>
      </div>

      {expanded && (
        <div className="ml-2 mt-1 space-y-1">
          {facet.values.length > 6 && (
            <div className="relative px-1">
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter values…"
                className="h-7 pl-8 text-xs"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto pl-1">
            {filtered.length === 0 && (
              <p className="py-1 text-xs text-muted-foreground">No values</p>
            )}
            {filtered.map((v) => {
              const id = `${facet.key}-${v.value}`;
              return (
                <div key={v.value} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={id}
                    checked={selected.includes(v.value)}
                    onCheckedChange={(checked) => toggle(v.value, Boolean(checked))}
                  />
                  <label
                    htmlFor={id}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between text-xs"
                  >
                    <span className="truncate" title={v.value}>{v.value}</span>
                    <Badge variant="outline" className="ml-2 px-1.5 py-0 text-[10px] shrink-0">
                      {v.count}
                    </Badge>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Separator className="mt-2" />
    </section>
  );
};