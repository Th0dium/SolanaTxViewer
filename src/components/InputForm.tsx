import { useEffect, useMemo, useState } from 'react'
import type { Cluster } from '../types'
import { isBase58Signature } from '../utils/solana'
import { loadCluster, saveCluster, loadRPC, saveRPC, pushHistory, loadHistory } from '../utils/storage'

type Props = {
  initialSignature?: string
  initialCluster?: Cluster
  onSubmit: (args: { signature: string; cluster: Cluster; rpc?: string }) => void
}

const clusters: Cluster[] = ['mainnet-beta', 'devnet', 'testnet']

export function InputForm({ initialSignature = '', initialCluster, onSubmit }: Props) {
  const [signature, setSignature] = useState(initialSignature)
  const [cluster, setCluster] = useState<Cluster>(initialCluster ?? loadCluster() ?? 'mainnet-beta')
  const [rpc, setRpc] = useState<string>(loadRPC() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>(() => loadHistory())

  useEffect(() => {
    saveCluster(cluster)
  }, [cluster])

  useEffect(() => {
    if (rpc) saveRPC(rpc)
  }, [rpc])

  const isValidSig = useMemo(() => isBase58Signature(signature.trim()), [signature])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const sig = signature.trim()
    if (!isBase58Signature(sig)) {
      setError('Invalid signature format (base58 expected).')
      return
    }
    setError(null)
    const next = pushHistory(sig, 10)
    setHistory(next)
    onSubmit({ signature: sig, cluster, rpc: rpc.trim() || undefined })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Paste transaction signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
        <select
          className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          value={cluster}
          onChange={(e) => setCluster(e.target.value as Cluster)}
        >
          {clusters.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!isValidSig}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          View
        </button>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 dark:text-neutral-400">Custom RPC</label>
        <input
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="https://..."
          value={rpc}
          onChange={(e) => setRpc(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {history.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-medium text-gray-500 dark:text-neutral-400">Recent</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {history.slice(0, 10).map((sig) => (
              <button
                type="button"
                key={sig}
                onClick={() => setSignature(sig)}
                className="truncate rounded border border-gray-200 px-2 py-1 text-xs dark:border-neutral-700"
                title={sig}
              >
                {sig.slice(0, 8)}...{sig.slice(-6)}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}

export default InputForm

