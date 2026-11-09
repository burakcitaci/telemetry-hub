import { useCallback, useEffect, useRef, useState } from 'react';
import { api, unwrap } from '@/shared/api/client';
import { errorMessage } from './presentation';

export function useAdminList<T>(endpoint: string) {
  const request = useRef(0);
  const [rows, setRows] = useState<T[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const { data } = await api.get(endpoint);
      if (request.current !== id) return;
      setRows(unwrap<T[]>(data));
      setError('');
    } catch (failure) {
      if (request.current === id) setError(errorMessage(failure, 'Request failed.'));
    } finally {
      if (request.current === id) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void reload();
    return () => {
      request.current += 1;
    };
  }, [reload]);

  return { rows, loading, error, reload };
}

export function useAdminAction(fallback: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function execute(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await action();
      setSaved(true);
    } catch (failure) {
      setError(errorMessage(failure, fallback));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, saved, execute, clearError: () => setError('') };
}
