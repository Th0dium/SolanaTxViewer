import type { Cluster } from '../types';

const KEYS = {
  cluster: 'tv.cluster',
  rpc: 'tv.rpc',
  history: 'tv.history',
} as const;

export function saveCluster(cluster: Cluster) {
  try {
    localStorage.setItem(KEYS.cluster, cluster);
  } catch {}
}

export function loadCluster(): Cluster | null {
  try {
    const v = localStorage.getItem(KEYS.cluster);
    if (v === 'mainnet-beta' || v === 'devnet' || v === 'testnet') return v;
  } catch {}
  return null;
}

export function saveRPC(url: string) {
  try {
    localStorage.setItem(KEYS.rpc, url);
  } catch {}
}

export function loadRPC(): string | null {
  try {
    return localStorage.getItem(KEYS.rpc);
  } catch {}
  return null;
}

export function pushHistory(signature: string, max = 10): string[] {
  const list = loadHistory();
  const next = [signature, ...list.filter((s) => s !== signature)].slice(0, max);
  try {
    localStorage.setItem(KEYS.history, JSON.stringify(next));
  } catch {}
  return next;
}

export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.history);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list.filter((x) => typeof x === 'string');
  } catch {}
  return [];
}

export { KEYS };

