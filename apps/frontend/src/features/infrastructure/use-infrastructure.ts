import { useEffect, useState } from "react";
import { fetchInfrastructure } from "./api";
import type { InfrastructureHost } from "./model";

export const INFRASTRUCTURE_POLL_MS = 3_000;

export function useInfrastructure(enabled: boolean) {
  const [hosts, setHosts] = useState<InfrastructureHost[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    return startPolling({
      hosts: setHosts,
      updatedAt: setUpdatedAt,
      error: setError,
      loading: setLoading,
    });
  }, [enabled]);
  return { hosts, updatedAt, error, loading };
}

interface PollUpdates {
  hosts: (hosts: InfrastructureHost[]) => void;
  updatedAt: (time: number) => void;
  error: (error: string | null) => void;
  loading: (loading: boolean) => void;
}

export function startPolling(updates: PollUpdates) {
  let stopped = false;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout>;
  const poll = async () => {
    if (stopped || controller || document.hidden) return;
    controller = new AbortController();
    await refresh(updates, controller.signal);
    controller = null;
    if (!stopped) timer = setTimeout(() => void poll(), INFRASTRUCTURE_POLL_MS);
  };
  const resume = () => {
    clearTimeout(timer);
    void poll();
  };
  document.addEventListener("visibilitychange", resume);
  void poll();
  return () => {
    stopped = true;
    clearTimeout(timer);
    controller?.abort();
    document.removeEventListener("visibilitychange", resume);
  };
}

async function refresh(updates: PollUpdates, signal: AbortSignal) {
  try {
    const hosts = await fetchInfrastructure(signal);
    if (signal.aborted) return;
    updates.hosts(hosts);
    updates.updatedAt(Date.now());
    updates.error(null);
  } catch {
    if (!signal.aborted)
      updates.error("Infrastructure unavailable. Retrying automatically.");
  } finally {
    if (!signal.aborted) updates.loading(false);
  }
}
