import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTelemetryQuery } from "./use-telemetry-query";
import { TraceDetailSheet } from "@/components/shared/trace-detail-sheet";

interface ActiveTraceContextValue {
  activeTraceId: string | null;
  openTrace: (traceId: string) => void;
  closeTrace: () => void;
}
const ActiveTraceContext = createContext<ActiveTraceContextValue | null>(null);

export function ActiveTraceProvider({ children }: { children: ReactNode }) {
  const { env } = useTelemetryQuery();
  const opener = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{
    traceId: string;
    env: string;
  } | null>(null);
  const activeTraceId = selection?.env === env ? selection.traceId : null;
  useEffect(() => {
    if (selection && selection.env !== env) setSelection(null);
  }, [env, selection]);
  const closeTrace = () => setSelection(null);
  const openTrace = (traceId: string) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (/^[a-f0-9]{32}$/i.test(traceId) && !/^0{32}$/.test(traceId))
      setSelection({ traceId, env });
  };
  return (
    <ActiveTraceContext.Provider
      value={{ activeTraceId, openTrace, closeTrace }}
    >
      {children}
      {activeTraceId && (
        <TraceDetailSheet
          key={`${env}:${activeTraceId}`}
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
