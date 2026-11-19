import { useEffect, useRef, useState } from 'react';
import { createEventSource } from '@/shared/api/event-stream';
import type { TelemetryEvent } from '@/shared/types/telemetry';

export function useTelemetryStream(onEvent: (event: TelemetryEvent) => void, scopeKey: string) {
  const callbackRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    setConnected(false);
    const eventSource = createEventSource();

    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (message) => {
      try {
        callbackRef.current(JSON.parse(message.data) as TelemetryEvent);
      } catch {
        // Ignore malformed events and keep the stream available for later updates.
      }
    };
    eventSource.onerror = () => setConnected(false);

    return () => {
      eventSource.close();
    };
  }, [scopeKey]);

  return connected;
}
