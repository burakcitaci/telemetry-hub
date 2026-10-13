import { Injectable, Logger } from '@nestjs/common';
import { CoreV1Api, CustomObjectsApi, KubeConfig } from '@kubernetes/client-node';
import type { V1Node } from '@kubernetes/client-node';
import type { NodeUsage } from './infrastructure.model';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private core?: CoreV1Api;
  private custom?: CustomObjectsApi;

  private initialize(): void {
    if (this.core) return;
    const config = new KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) config.loadFromCluster();
    else config.loadFromDefault();
    this.core = config.makeApiClient(CoreV1Api);
    this.custom = config.makeApiClient(CustomObjectsApi);
  }

  async nodes(): Promise<V1Node[]> {
    this.initialize();
    const response = await this.core.listNode({ timeoutSeconds: 5 });
    return response.items.filter(node => node.metadata?.uid && node.metadata?.name);
  }

  async metrics(): Promise<NodeUsage[]> {
    this.initialize();
    for (const version of ['v1', 'v1beta1']) {
      try {
        const response = await this.custom.listClusterCustomObject({
          group: 'metrics.k8s.io', version, plural: 'nodes', timeoutSeconds: 5,
        });
        return (response.items ?? []) as NodeUsage[];
      } catch (error) {
        if (version === 'v1' && (error.code === 404 || error.statusCode === 404)) continue;
        this.logger.warn('Node metrics unavailable; using Kubernetes node conditions.');
        return [];
      }
    }
    return [];
  }
}
