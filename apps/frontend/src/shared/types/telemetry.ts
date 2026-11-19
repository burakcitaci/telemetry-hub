export type AttributeMap = Record<string, string>;

export interface TelemetryUpdateEvent {
  type: 'update';
  timestamp?: string;
  tracesChanged: boolean;
  logsChanged: boolean;
}

export interface TelemetryConnectedEvent {
  type: 'connected';
  message?: string;
}

export type TelemetryEvent = TelemetryConnectedEvent | TelemetryUpdateEvent;

export interface ApiEnvelope<T> {
  data: T;
  timestamp?: string;
  path?: string;
  method?: string;
}

export interface ExplorerQuery {
  env: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
  q?: string;
  services: string[];
  statuses: string[];
}
