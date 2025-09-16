import { Connection, clusterApiUrl } from '@solana/web3.js'
import type { Cluster, TxDetails, TxSummary, LogLine, AccountDelta } from '../types'

export const DEFAULT_ENDPOINTS: Record<Cluster, string> = {
  'mainnet-beta': import.meta.env.VITE_RPC_MAINNET_URL ?? 'https://api.mainnet-beta.solana.com',
  devnet: import.meta.env.VITE_RPC_DEVNET_URL ?? 'https://api.devnet.solana.com',
  testnet: import.meta.env.VITE_RPC_TESTNET_URL ?? 'https://api.testnet.solana.com',
}

export function makeConnection(cluster: Cluster, customRpc?: string) {
  const endpoint = customRpc && customRpc.trim().length > 0
    ? customRpc.trim()
    : DEFAULT_ENDPOINTS[cluster] ?? clusterApiUrl(cluster)
  return new Connection(endpoint, { commitment: 'confirmed' })
}

export function isBase58Signature(sig: string): boolean {
  // Simple check: base58 charset and reasonable length (<= 88 for 64-byte signatures)
  if (!sig || typeof sig !== 'string') return false
  const re = /^[1-9A-HJ-NP-Za-km-z]+$/
  return re.test(sig) && sig.length >= 32 && sig.length <= 100
}

export async function getTransactionDetails(
  signature: string,
  cluster: Cluster,
  customRpc?: string,
): Promise<TxDetails | null> {
  const conn = makeConnection(cluster, customRpc)
  const tx = await conn.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })
  if (!tx) return null

  const summary = parseSummary(signature, tx)
  const accounts = parseAccounts(tx)
  const logs = parseLogs(tx)

  return {
    summary,
    accounts,
    instructions: [],
    transfers: [],
    logs,
  }
}

function parseSummary(signature: string, tx: any): TxSummary {
  const slot: number = tx.slot
  const blockTime: number | null = tx.blockTime ?? null
  const feeLamports: number = tx.meta?.fee ?? 0
  const status: TxSummary['status'] = tx.meta?.err ? 'fail' : 'success'

  let feePayer: string | null = null
  try {
    // Legacy transactions
    const maybeKeys = tx.transaction?.message?.accountKeys
    if (Array.isArray(maybeKeys) && maybeKeys.length > 0 && maybeKeys[0]?.toBase58) {
      feePayer = maybeKeys[0].toBase58()
    } else if (Array.isArray(maybeKeys) && maybeKeys.length > 0 && typeof maybeKeys[0] === 'string') {
      // Some RPCs return base58 strings already
      feePayer = String(maybeKeys[0])
    } else if (tx.transaction?.message?.getAccountKeys) {
      // Versioned transactions with helper
      const keys = tx.transaction.message.getAccountKeys()
      const staticKeys: any[] = keys?.staticAccountKeys ?? []
      if (staticKeys[0]) {
        feePayer = staticKeys[0].toBase58 ? staticKeys[0].toBase58() : String(staticKeys[0])
      }
    }
  } catch {
    // leave null
  }

  return { signature, slot, blockTime, status, feeLamports, feePayer }
}

function parseLogs(tx: any): LogLine[] {
  const lines: string[] = tx.meta?.logMessages ?? []
  return lines.map((text: string) => ({
    text,
    level: classifyLog(text),
  }))
}

function classifyLog(text: string): LogLine['level'] {
  if (text.includes('program failed') || text.toLowerCase().includes('error')) return 'error'
  if (text.startsWith('Program ') || text.startsWith('Program log:')) return 'program'
  return 'info'
}

function parseAccounts(tx: any): AccountDelta[] {
  const pre: number[] = tx.meta?.preBalances ?? []
  const post: number[] = tx.meta?.postBalances ?? []
  const keys = extractAccountKeysBase58(tx)
  const out: AccountDelta[] = []
  for (let i = 0; i < keys.length; i++) {
    out.push({
      pubkey: keys[i],
      preBalanceLamports: pre[i],
      postBalanceLamports: post[i],
    })
  }
  return out
}

function extractAccountKeysBase58(tx: any): string[] {
  try {
    // Legacy: keys are PublicKey objects
    const k = tx.transaction?.message?.accountKeys
    if (Array.isArray(k) && k.length > 0) {
      if (typeof k[0] === 'string') return k as string[]
      if (k[0]?.toBase58) return k.map((p: any) => p.toBase58())
    }
  } catch {}
  try {
    if (tx.transaction?.message?.getAccountKeys) {
      const acc = tx.transaction.message.getAccountKeys()
      const staticKeys: any[] = acc?.staticAccountKeys ?? []
      const lookups: any[] = acc?.accountKeysFromLookups?.writable ?? []
      const lookups2: any[] = acc?.accountKeysFromLookups?.readonly ?? []
      const all = [...staticKeys, ...lookups, ...lookups2]
      return all.map((p) => (p?.toBase58 ? p.toBase58() : String(p)))
    }
  } catch {}
  // Fallback empty
  return []
}

