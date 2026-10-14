import type { ContainerSummary, PodSummary, ResourceUsage } from './model';

export function cpuText(value?: number | null) {
  return value == null ? '—' : `${Math.round(value * 1000)} mCPU`;
}

export function memoryText(value?: number | null) {
  return value == null ? '—' : `${(value / 1024 ** 2).toLocaleString(undefined, { maximumFractionDigits: 1 })} MiB`;
}

export function UsageValues({ usage }: { usage?: ResourceUsage }) {
  return <><span title="CPU usage in millicores">{cpuText(usage?.cpuCores)}</span>
    <span title="Memory working set">{memoryText(usage?.memoryBytes)}</span></>;
}

export function ContainerDetails({ container }: { container: ContainerSummary }) {
  return <article className="infra-container-detail"><header><strong>{container.name}</strong>
    <span>{container.state} · {container.ready ? 'Ready' : 'Not ready'} · {container.restarts} restarts</span></header>
    <p className="infra-image-name">{container.image}</p>
    {container.imageId && <p className="infra-muted infra-image-name">{container.imageId}</p>}
    <dl className="infra-resource-values">
      <div><dt>CPU used</dt><dd>{cpuText(container.usage?.cpuCores)}</dd></div>
      <div><dt>Memory used</dt><dd>{memoryText(container.usage?.memoryBytes)}</dd></div>
      <div><dt>CPU request / limit</dt><dd>{cpuText(container.requests?.cpuCores)} / {cpuText(container.limits?.cpuCores)}</dd></div>
      <div><dt>Memory request / limit</dt><dd>{memoryText(container.requests?.memoryBytes)} / {memoryText(container.limits?.memoryBytes)}</dd></div>
    </dl><p className="infra-muted">{container.usage?.observedAt
      ? `Sample ${new Date(container.usage.observedAt).toLocaleTimeString()} · ${container.usage.window ?? 'unknown window'}`
      : 'Usage not observed yet.'} Missing requests or limits mean they are not configured.</p>
  </article>;
}

export function PodResourceRow({ pod }: { pod: PodSummary }) {
  return <tbody className="infra-expandable"><tr><td colSpan={5}><details>
    <summary className="infra-pod-summary"><span className="infra-resource-link" title={pod.name}>{pod.name}</span>
      <span>{pod.namespace}</span><span>{pod.phase} · {pod.containers.filter(container => container.ready).length}/{pod.containers.length} ready</span>
      <UsageValues usage={pod.usage} /></summary>
    <div className="infra-pod-detail"><p>Node: {pod.nodeName ?? 'Unscheduled'} · IP: {pod.podIp ?? '—'} · QoS: {pod.qosClass ?? '—'} · {pod.restarts} restarts</p>
      {pod.createdAt && <p className="infra-muted">Created {new Date(pod.createdAt).toLocaleString()}</p>}
      {pod.containers.map(container => <ContainerDetails key={container.name} container={container} />)}
    </div></details></td></tr></tbody>;
}

function observedSum(values: Array<number | null | undefined>) {
  return values.length && values.every(value => value != null) ? values.reduce<number>((sum, value) => sum + value!, 0) : null;
}

export function imageUsage(pods: PodSummary[]) {
  const images = new Map<string, Array<{ pod: PodSummary; container: ContainerSummary }>>();
  for (const pod of pods) for (const container of pod.containers) {
    const rows = images.get(container.image) ?? [];
    rows.push({ pod, container }); images.set(container.image, rows);
  }
  return [...images].sort(([a], [b]) => a.localeCompare(b)).map(([image, rows]) => ({ image, rows,
    podCount: new Set(rows.map(row => row.pod.id)).size,
    cpuCores: observedSum(rows.map(row => row.container.usage?.cpuCores)),
    memoryBytes: observedSum(rows.map(row => row.container.usage?.memoryBytes)) }));
}

export function ImageResourceRows({ pods }: { pods: PodSummary[] }) {
  return <tbody>{imageUsage(pods).map(image => <tr key={image.image}><td colSpan={5}><details>
    <summary className="infra-pod-summary"><span className="infra-resource-link" title={image.image}>{image.image}</span>
      <span>{image.podCount} pods</span><span>{image.rows.length} containers</span>
      <span>{cpuText(image.cpuCores)}</span><span>{memoryText(image.memoryBytes)}</span></summary>
    <div className="infra-pod-detail"><p className="infra-muted">Combined usage of containers running this image. An incomplete sample is shown as —.</p>
      {image.rows.map(({ pod, container }) => <div key={`${pod.id}/${container.name}`}>
        <p>{pod.namespace}/{pod.name}</p><ContainerDetails container={container} /></div>)}
    </div></details></td></tr>)}</tbody>;
}
