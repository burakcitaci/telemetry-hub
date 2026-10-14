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
      const [nodes, metrics, namespaces, pods, services, workloads, podMetrics] = await Promise.all([
        this.kubernetes.nodes(), this.kubernetes.metrics(), this.kubernetes.namespaces(),
        this.kubernetes.pods(), this.kubernetes.services(), this.kubernetes.workloads(),
        this.kubernetes.podMetrics(),
      ]);
      const usage = new Map(metrics.map(item => [item.metadata.name, item]));
      const podUsage = new Map(podMetrics.map(item => [`${item.metadata.namespace}/${item.metadata.name}`, item]));
      const mappedNodes = nodes.map(node => mapNode(node, usage.get(node.metadata.name)));
      const mappedPods = pods.map(pod => mapPod(pod, podUsage.get(`${pod.metadata?.namespace}/${pod.metadata?.name}`)));
      this.cached = { collectedAt: new Date().toISOString(),
        metricsAvailable: mappedNodes.some(node => node.metrics.cpu !== null && node.metrics.ram !== null), nodes: mappedNodes,
        namespaces: namespaces.map(mapNamespace),
        pods: mappedPods,
        services: services.map(mapService),
        workloads: [...workloads.deployments.map(item => mapWorkload(item, 'Deployment', pods, mappedPods)),
          ...workloads.statefulSets.map(item => mapWorkload(item, 'StatefulSet', pods, mappedPods)),
          ...workloads.daemonSets.map(item => mapWorkload(item, 'DaemonSet', pods, mappedPods))] };
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
