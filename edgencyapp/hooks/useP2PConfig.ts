import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type P2PMode = 'local' | 'consumer' | 'provider';

const KEY_MODE = '@edgency/p2p_mode';
const KEY_PEER = '@edgency/p2p_peer_key';

export interface P2PConfig {
  mode: P2PMode;
  providerPublicKey: string | null;
  isLoaded: boolean;
}

export function useP2PConfig() {
  const [config, setConfig] = useState<P2PConfig>({
    mode: 'local',
    providerPublicKey: null,
    isLoaded: false,
  });

  useEffect(() => {
    AsyncStorage.multiGet([KEY_MODE, KEY_PEER])
      .then(([[, mode], [, key]]) => {
        setConfig({
          mode: (mode as P2PMode) ?? 'local',
          providerPublicKey: key ?? null,
          isLoaded: true,
        });
      })
      .catch(() => setConfig(c => ({ ...c, isLoaded: true })));
  }, []);

  const setMode = useCallback(async (mode: P2PMode) => {
    await AsyncStorage.setItem(KEY_MODE, mode);
    setConfig(c => ({ ...c, mode }));
  }, []);

  const setProviderKey = useCallback(async (key: string | null) => {
    if (key) {
      await AsyncStorage.setItem(KEY_PEER, key);
    } else {
      await AsyncStorage.removeItem(KEY_PEER);
    }
    setConfig(c => ({ ...c, providerPublicKey: key }));
  }, []);

  return { config, setMode, setProviderKey };
}
