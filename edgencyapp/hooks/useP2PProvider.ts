import { useState, useCallback } from 'react';
import { startQVACProvider, stopQVACProvider } from '@qvac/sdk';

export type ProviderStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

export function useP2PProvider() {
  const [status, setStatus] = useState<ProviderStatus>('idle');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (status === 'running' || status === 'starting') return;
    setStatus('starting');
    setError(null);
    try {
      const res = await startQVACProvider();
      if (res.success) {
        setPublicKey(res.publicKey ?? null);
        setStatus('running');
      } else {
        throw new Error(res.error ?? 'Provider failed to start');
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStatus('error');
    }
  }, [status]);

  const stop = useCallback(async () => {
    if (status !== 'running') return;
    setStatus('stopping');
    try {
      await stopQVACProvider();
    } catch {}
    setPublicKey(null);
    setStatus('idle');
  }, [status]);

  return {
    status,
    publicKey,
    error,
    start,
    stop,
    isProviding: status === 'running',
  };
}
