export interface ServiceSummary {
  ServiceName: string;
}

export interface ServiceMetrics {
  request_count: string | number;
  avg_duration: string | number;
  p50_duration: string | number;
  p95_duration: string | number;
  p99_duration: string | number;
  error_count: string | number;
}

export type ServiceMetadata = {
  serviceName: string;
  team: string;
  type: 'Web' | 'DB' | 'Cache' | 'Function' | 'Custom' | 'Browser' | 'Mobile';
  onCall: string;
  contact: string;
  repo: string;
  metadataSource: 'UI' | 'API' | 'Terraform';
};

export const EMPTY_METADATA = (serviceName: string): ServiceMetadata => ({
  serviceName,
  team: '',
  type: 'Web',
  onCall: '',
  contact: '',
  repo: '',
  metadataSource: 'UI',
});
