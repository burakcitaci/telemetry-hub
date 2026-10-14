import { Injectable, Logger } from '@nestjs/common';
import { AppsV1Api, CoreV1Api, CustomObjectsApi, KubeConfig } from '@kubernetes/client-node';
import type { V1DaemonSet, V1Deployment, V1Namespace, V1Node, V1Pod, V1Service, V1StatefulSet } from '@kubernetes/client-node';
import type { NodeUsage } from './infrastructure.model';

export interface KubernetesWorkloads { deployments: V1Deployment[]; statefulSets: V1StatefulSet[]; daemonSets: V1DaemonSet[]; }

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private core?: CoreV1Api;
  private custom?: CustomObjectsApi;
  private apps?: AppsV1Api;

  private initialize(): void {
    if (this.core) return;
    const config = new KubeConfig();
    if (process.env.KUBERNETES_SERVICE_HOST) config.loadFromCluster();
    else config.loadFromDefault();
    this.core = config.makeApiClient(CoreV1Api);
    this.custom = config.makeApiClient(CustomObjectsApi);
    this.apps = config.makeApiClient(AppsV1Api);
  }

  async nodes(): Promise<V1Node[]> {
    this.initialize();
    const response = await this.core.listNode({ timeoutSeconds: 5 });
    return response.items.filter(node => node.metadata?.uid && node.metadata?.name);
  }

  async namespaces(): Promise<V1Namespace[]> {
    this.initialize();
    return (await this.core.listNamespace({ timeoutSeconds: 5 })).items;
  }

  async pods(): Promise<V1Pod[]> {
    this.initialize();
    return (await this.core.listPodForAllNamespaces({ timeoutSeconds: 5 })).items;
  }

  async services(): Promise<V1Service[]> {
    this.initialize();
    return (await this.core.listServiceForAllNamespaces({ timeoutSeconds: 5 })).items;
  }

  async workloads(): Promise<KubernetesWorkloads> {
    this.initialize();
    const [deployments, statefulSets, daemonSets] = await Promise.all([
      this.apps.listDeploymentForAllNamespaces({ timeoutSeconds: 5 }),
      this.apps.listStatefulSetForAllNamespaces({ timeoutSeconds: 5 }),
      this.apps.listDaemonSetForAllNamespaces({ timeoutSeconds: 5 }),
    ]);
    return { deployments: deployments.items, statefulSets: statefulSets.items, daemonSets: daemonSets.items };
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
