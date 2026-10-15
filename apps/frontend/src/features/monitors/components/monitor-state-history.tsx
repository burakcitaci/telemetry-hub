import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MonitorEvent } from '../model';

const PAGE_SIZE = 10;

function HistoryPagination({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  return <nav aria-label="State history pagination" className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2 text-xs">
    <span className="text-muted-foreground" aria-live="polite">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} events</span>
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="size-7" aria-label="Previous state history page" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft className="size-3.5" /></Button>
      <span className="px-1 text-muted-foreground">{page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
      <Button variant="ghost" size="icon" className="size-7" aria-label="Next state history page" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => onPage(page + 1)}><ChevronRight className="size-3.5" /></Button>
    </div>
  </nav>;
}

export function MonitorStateHistory({ events, renderEvent }: { events: MonitorEvent[]; renderEvent: (event: MonitorEvent) => ReactNode }) {
  const [requestedPage, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(events.length / PAGE_SIZE) - 1);
  const page = Math.min(requestedPage, lastPage);
  useEffect(() => setPage(current => Math.min(current, lastPage)), [lastPage]);
  return <section aria-label="State history" className="border-b border-border">
    <div className="px-5 py-3"><h3 className="text-xs font-semibold">State history
      <span className="ml-2 text-xs font-normal text-muted-foreground">{events.length} event{events.length === 1 ? '' : 's'}</span>
    </h3></div>
    {events.length ? <ul className="divide-y">{events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(renderEvent)}</ul>
      : <p className="px-5 pb-3 text-xs text-muted-foreground">No state changes yet</p>}
    {events.length > PAGE_SIZE && <HistoryPagination page={page} total={events.length} onPage={setPage} />}
  </section>;
}
