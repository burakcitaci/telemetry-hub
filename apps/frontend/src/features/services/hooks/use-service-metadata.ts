import { useCallback, useEffect, useState } from 'react';
import type { ServiceMetadata } from '../types';
import { api, unwrap } from '@/shared/api/client';
import { useAuth } from '@/features/auth/auth-context';

type MetadataMap = Record<string, ServiceMetadata>;

export function useServiceMetadata() {
  const { session } = useAuth();
  const tenant = session?.tenantSlug;
  const [state, setState] = useState<{ tenant?: string; metadata: MetadataMap; error?: string }>({ metadata: {} });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (signal?: AbortSignal) => {
    if (!tenant) { setLoading(false); return; }
    setLoading(true);
    try {
      const response = await api.get('/service-metadata', { signal });
      const rows = unwrap<ServiceMetadata[]>(response.data);
      if (!signal?.aborted) setState({ tenant, metadata: Object.fromEntries(rows.map(row => [row.serviceName, row])) });
    } catch {
      if (!signal?.aborted) setState({ tenant, metadata: {}, error: 'Could not load service metadata.' });
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [tenant]);

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);

  const saveForService = useCallback(async (next: ServiceMetadata) => {
    const response = await api.put('/service-metadata', next);
    const saved = unwrap<ServiceMetadata>(response.data);
    setState(prev => ({ tenant, metadata: { ...(prev.tenant === tenant ? prev.metadata : {}), [saved.serviceName]: saved } }));
  }, [tenant]);

  const removeForService = useCallback(async (serviceName: string) => {
    await api.delete('/service-metadata', { data: { serviceName } });
    await reload();
  }, [reload]);

  return { metadata: state.tenant === tenant ? state.metadata : {}, loading,
    error: state.tenant === tenant ? state.error : undefined, reload, saveForService, removeForService };
}
