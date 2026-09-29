import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, registerBackendStatusListener } from '../services/api';

interface BackendStatusContextType {
  isOnline: boolean;
  isChecking: boolean;
  latencyMs: number | null;
  lastChecked: Date | null;
  checkHealth: () => Promise<boolean>;
}

const BackendStatusContext = createContext<BackendStatusContextType>({
  isOnline: true,
  isChecking: false,
  latencyMs: null,
  lastChecked: null,
  checkHealth: async () => true,
});

export const BackendStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const res = await api.checkHealth();
      setIsOnline(res.online);
      if (res.latencyMs !== undefined) {
        setLatencyMs(res.latencyMs);
      }
      setLastChecked(new Date());
      return res.online;
    } catch {
      setIsOnline(false);
      setLastChecked(new Date());
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Listen to API interceptor events for instantaneous online/offline transitions
  useEffect(() => {
    const unregister = registerBackendStatusListener((online) => {
      setIsOnline(online);
      setLastChecked(new Date());
    });
    return unregister;
  }, []);

  // Initial check & periodic heartbeat polling
  useEffect(() => {
    checkHealth();

    // Check more frequently when offline (3s) to detect server reboot quickly; otherwise 8s
    const pollIntervalMs = isOnline ? 8000 : 3000;
    const interval = setInterval(() => {
      checkHealth();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [checkHealth, isOnline]);

  // Re-check when tab regains focus
  useEffect(() => {
    const onFocus = () => checkHealth();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [checkHealth]);

  return (
    <BackendStatusContext.Provider
      value={{
        isOnline,
        isChecking,
        latencyMs,
        lastChecked,
        checkHealth,
      }}
    >
      {children}
    </BackendStatusContext.Provider>
  );
};

export const useBackendStatus = () => useContext(BackendStatusContext);
