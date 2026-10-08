import { useCallback, useEffect, useState } from 'react';
import type { ServiceMetadata } from '../types';

const STORAGE_KEY = 'service-catalog-metadata';

type MetadataMap = Record<string, ServiceMetadata>;

function readStore(): MetadataMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MetadataMap) : {};
  } catch {
    return {};
  }
}

export function useServiceMetadata() {
  const [metadata, setMetadata] = useState<MetadataMap>({});

  useEffect(() => {
    setMetadata(readStore());
  }, []);

  const saveForService = useCallback((next: ServiceMetadata) => {
    setMetadata((prev) => {
      const updated = { ...prev, [next.serviceName]: next };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeForService = useCallback((serviceName: string) => {
    setMetadata((prev) => {
      const updated = { ...prev };
      delete updated[serviceName];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { metadata, saveForService, removeForService };
}
