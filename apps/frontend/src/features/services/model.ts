import type { ServiceSummary } from '@/features/services/types';
import type { ServiceMetadata } from './types';

export type ServiceRow = ServiceSummary & {
  Type: string;
  Team: string;
  OnCall: string;
  Contact: string;
  Repo: string;
  Telemetry: string;
  MetadataSource: string;
};

export const mapServiceToRow = (
  service: ServiceSummary,
  metadata: Record<string, ServiceMetadata>,
): ServiceRow => {
  const saved = metadata[service.ServiceName];
  const hash = service.ServiceName.length;
  const types = ['Web', 'DB', 'Cache', 'Function', 'Custom'];
  const teams = [
    'transactions',
    'data-science',
    'communication',
    'dba',
    'orders',
    'shopist',
  ];

  return {
    ...service,
    Type: saved?.type ?? types[hash % types.length],
    Team: saved?.team || teams[hash % teams.length],
    OnCall: saved?.onCall || (hash % 2 === 0 ? 'Yes' : 'No'),
    Contact: saved?.contact || '@slack-channel',
    Repo: saved?.repo || 'github.com/org/repo',
    Telemetry: 'APM',
    MetadataSource: saved?.metadataSource ?? 'UI',
  };
};
