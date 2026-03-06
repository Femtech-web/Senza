import type { AppConfig } from "../config/tokens";

export const STORAGE_KEYS = {
  CONFIG: "senza_config",
  DAPPS: "senza_dapps",
  PENDING: "senza_pending_dapps",
  PENDING_REQUESTS: "senza_pending_requests",
  CHAIN: "senza_chain_id",
  NETWORK: "senza_network_key",
  NETWORKS_ENABLED: "senza_networks_enabled",
  RPC: "senza_rpc_network",
} as const;

export const saveStorage = async (key: string, value: unknown) => {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    if (value === null) {
      await chrome.storage.local.remove([key]);
    } else {
      await chrome.storage.local.set({ [key]: value });
    }
    return;
  }
  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const loadStorage = async <T,>(key: string): Promise<T | null> => {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const result = await chrome.storage.local.get([key]);
    return (result[key] as T | undefined) ?? null;
  }
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

export const configStorageKey = (key: string) => `${STORAGE_KEYS.CONFIG}_${key}`;
export const rpcStorageKey = (key: string) => `${STORAGE_KEYS.RPC}_${key}`;

export const loadNetworkConfig = async (key: string) =>
  loadStorage<AppConfig>(configStorageKey(key));

export const saveNetworkConfig = async (key: string, value: AppConfig) =>
  saveStorage(configStorageKey(key), value);
