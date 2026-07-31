import { useEffect, useRef, useState } from 'react';
import { createEventSource } from '@/api';
import type { TelemetryEvent } from '@/types/telemetry';

export function useTelemetryStream(onEvent: (event: TelemetryEvent) => void) {
  const callbackRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
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
  }, []);

  return connected;
}
