import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { platformFilterSearch } from "../lib/platform-filters";
import { TraceDetailSheet } from "@/components/shared/trace-detail-sheet";

interface ActiveTraceContextValue {
  activeTraceId: string | null;
  openTrace: (traceId: string) => void;
  closeTrace: () => void;
}
const ActiveTraceContext = createContext<ActiveTraceContextValue | null>(null);

export function ActiveTraceProvider({ children }: { children: ReactNode }) {
  const opener = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{
    traceId: string;
    search: string;
  } | null>(null);
  const activeTraceId = selection?.traceId ?? null;
  const closeTrace = () => setSelection(null);
  const openTrace = (traceId: string) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (/^[a-f0-9]{32}$/i.test(traceId) && !/^0{32}$/.test(traceId))
      setSelection({ traceId, search: platformFilterSearch(window.location.search) });
  };
  return (
    <ActiveTraceContext.Provider
      value={{ activeTraceId, openTrace, closeTrace }}
    >
      {children}
      {activeTraceId && (
        <TraceDetailSheet
          key={`${selection?.search}:${activeTraceId}`}
          investigationSearch={selection?.search}
          traceId={activeTraceId}
          isOpen
          onClose={closeTrace}
          onCloseFocus={() => opener.current?.focus()}
        />
      )}
    </ActiveTraceContext.Provider>
  );
}
export function useActiveTrace() {
  const context = useContext(ActiveTraceContext);
  if (!context) throw new Error("useActiveTrace requires ActiveTraceProvider");
  return context;
}
