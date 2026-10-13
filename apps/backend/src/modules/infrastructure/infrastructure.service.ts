import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { KubernetesService } from './kubernetes.service';
import { mapNode, type InfrastructureHost } from './infrastructure.model';

export const INFRASTRUCTURE_CACHE_MS = 2500;

@Injectable()
export class InfrastructureService {
  private cached?: InfrastructureHost[];
  private failure?: ServiceUnavailableException;
  private expiresAt = 0;
  private pending?: Promise<InfrastructureHost[]>;

  constructor(private readonly kubernetes: KubernetesService) {}

  async status(): Promise<InfrastructureHost[]> {
    if (Date.now() < this.expiresAt) {
      if (this.failure) throw this.failure;
      return this.cached;
    }
    if (!this.pending) this.pending = this.refresh().finally(() => { this.pending = undefined; });
    return this.pending;
  }

  private async refresh(): Promise<InfrastructureHost[]> {
    try {
      const [nodes, metrics] = await Promise.all([this.kubernetes.nodes(), this.kubernetes.metrics()]);
      const usage = new Map(metrics.map(item => [item.metadata.name, item]));
      this.cached = nodes.map(node => mapNode(node, usage.get(node.metadata.name)));
      this.failure = undefined;
      return this.cached;
    } catch {
      this.failure = new ServiceUnavailableException('Kubernetes infrastructure status is unavailable.');
      throw this.failure;
    } finally {
      this.expiresAt = Date.now() + INFRASTRUCTURE_CACHE_MS;
    }
  }
}
