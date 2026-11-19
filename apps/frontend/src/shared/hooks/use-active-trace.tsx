import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { investigationScope } from '../lib/investigation-link';
import { TraceDetailSheet } from '@/features/traces/components/trace-detail-sheet';

interface ActiveTraceContextValue {
  activeTraceId: string | null;
  openTrace: (traceId: string) => void;
  closeTrace: () => void;
}
const ActiveTraceContext = createContext<ActiveTraceContextValue | null>(null);
const validId = (id: string) => /^[a-f0-9]{32}$/i.test(id) && !/^0{32}$/.test(id);

export function ActiveTraceProvider({ children }: { children: ReactNode }) {
  const opener = useRef<HTMLElement | null>(null);
  const [params, setParams] = useSearchParams();
  const linkedId = params.get('trace') ?? '';
  const [selection, setSelection] = useState<{ traceId: string; search: string; linked?: boolean } | null>(null);

  useEffect(() => {
    const scope = investigationScope(window.location.search);
    setSelection(previous => validId(linkedId) ? { traceId: linkedId, search: scope, linked: true }
      : previous?.linked ? null : previous);
  }, [linkedId]);

  const activeTraceId = selection?.traceId ?? null;
  const closeTrace = () => {
    setSelection(null);
    if (linkedId) setParams(current => {
      const next = new URLSearchParams(current);
      next.delete('trace');
      return next;
    }, { replace: true });
  };
  const openTrace = (traceId: string) => {
    if (!validId(traceId)) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelection({ traceId, search: investigationScope(window.location.search) });
  };
  return (
    <ActiveTraceContext.Provider value={{ activeTraceId, openTrace, closeTrace }}>
      {children}
      {selection && <TraceDetailSheet key={selection.search + ':' + selection.traceId}
        investigationSearch={selection.search} traceId={selection.traceId} isOpen onClose={closeTrace}
        onCloseFocus={() => opener.current?.focus()} />}
    </ActiveTraceContext.Provider>
  );
}

export function useActiveTrace() {
  const context = useContext(ActiveTraceContext);
  if (!context) throw new Error('useActiveTrace requires ActiveTraceProvider');
  return context;
}
