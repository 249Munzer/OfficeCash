import { useEffect, useCallback, useState } from 'react';
import type { SyncStatus } from '../lib/electron-storage';

export function useP2PSync(onSync: () => void) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Broadcast P2P state update to all other open tabs on the same device
  const broadcastP2PChange = useCallback(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('officecash_p2p_channel');
        channel.postMessage({ type: 'P2P_STATE_UPDATED', timestamp: Date.now() });
        channel.close();
      } catch {
        // BroadcastChannel unavailable or restricted
      }
    }
  }, []);

  const refreshSyncStatus = useCallback(async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.syncGetState) {
      try {
        setSyncStatus(await window.electronAPI.syncGetState());
      } catch {
        // ignore
      }
    }
  }, []);

  // Electron: real LAN sync via the main process (WebSocket + UDP discovery)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const unsubscribeSync = window.electronAPI.onP2PSync(() => {
      onSync();
    });
    const unsubscribeStatus = window.electronAPI.onSyncStatus((status) => {
      setSyncStatus(status);
    });
    refreshSyncStatus();

    return () => {
      unsubscribeSync();
      unsubscribeStatus();
    };
  }, [onSync, refreshSyncStatus]);

  // Browser: BroadcastChannel for same-device tabs
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    if (window.electronAPI) return;

    const channel = new BroadcastChannel('officecash_p2p_channel');
    channel.onmessage = async (event: MessageEvent) => {
      if (event.data?.type === 'P2P_STATE_UPDATED') {
        // Trigger sync callback
        onSync();
      }
    };

    return () => {
      channel.close();
    };
  }, [onSync]);

  return {
    broadcastP2PChange,
    syncStatus,
    refreshSyncStatus,
  };
}
