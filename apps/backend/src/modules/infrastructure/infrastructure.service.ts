import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { KubernetesService } from './kubernetes.service';
import { mapNamespace, mapNode, mapPod, mapService, mapWorkload, type InfrastructureSnapshot } from './infrastructure.model';

export const INFRASTRUCTURE_CACHE_MS = 2500;

@Injectable()
export class InfrastructureService {
  private readonly logger = new Logger(InfrastructureService.name);
  private cached?: InfrastructureSnapshot;
  private failure?: ServiceUnavailableException;
  private expiresAt = 0;
  private pending?: Promise<InfrastructureSnapshot>;

  constructor(private readonly kubernetes: KubernetesService) {}

  async status(): Promise<InfrastructureSnapshot> {
    if (Date.now() < this.expiresAt) {
      if (this.failure) throw this.failure;
      return this.cached;
    }
    if (!this.pending) this.pending = this.refresh().finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async refresh(): Promise<InfrastructureSnapshot> {
    try {
      const [nodes, metrics, namespaces, pods, services, workloads] = await Promise.all([
        this.kubernetes.nodes(), this.kubernetes.metrics(), this.kubernetes.namespaces(),
        this.kubernetes.pods(), this.kubernetes.services(), this.kubernetes.workloads(),
      ]);
      const usage = new Map(metrics.map(item => [item.metadata.name, item]));
      this.cached = { collectedAt: new Date().toISOString(), metricsAvailable: metrics.length > 0,
        nodes: nodes.map(node => mapNode(node, usage.get(node.metadata.name))),
        namespaces: namespaces.map(mapNamespace), pods: pods.map(mapPod), services: services.map(mapService),
        workloads: [...workloads.deployments.map(item => mapWorkload(item, 'Deployment')),
          ...workloads.statefulSets.map(item => mapWorkload(item, 'StatefulSet')),
          ...workloads.daemonSets.map(item => mapWorkload(item, 'DaemonSet'))] };
      this.failure = undefined;
      return this.cached;
    } catch (cause) {
      this.logger.error('Kubernetes infrastructure refresh failed',
        cause instanceof Error ? cause.stack : String(cause));
      this.failure = new ServiceUnavailableException(
        'Kubernetes infrastructure status is unavailable.', { cause });
      throw this.failure;
    } finally {
      this.expiresAt = Date.now() + INFRASTRUCTURE_CACHE_MS;
    }
  }
}
