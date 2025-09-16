import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import './App.css'
import InputForm from './components/InputForm'
import SummaryCard from './components/SummaryCard'
import type { Cluster, TxDetails } from './types'
import { getTransactionDetails, isBase58Signature } from './utils/solana'

function App() {
  const url = new URL(window.location.href)
  const qSig = url.searchParams.get('tx') ?? ''
  const qCluster = (url.searchParams.get('cluster') as Cluster | null) ?? undefined

  const [signature, setSignature] = useState<string>(qSig)
  const [cluster, setCluster] = useState<Cluster>(qCluster ?? 'mainnet-beta')
  const [rpc, setRpc] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Keep URL in sync
    const u = new URL(window.location.href)
    if (signature) u.searchParams.set('tx', signature)
    else u.searchParams.delete('tx')
    if (cluster) u.searchParams.set('cluster', cluster)
    else u.searchParams.delete('cluster')
    window.history.replaceState(null, '', u.toString())
  }, [signature, cluster])

  const enabled = useMemo(() => isBase58Signature(signature), [signature])

  const query = useQuery<TxDetails | null>({
    queryKey: ['tx', cluster, signature, rpc ?? ''],
    queryFn: () => getTransactionDetails(signature, cluster, rpc),
    enabled,
    staleTime: 60_000,
    retry: 1,
  })

  const onSubmit = ({ signature: sig, cluster: c, rpc: r }: { signature: string; cluster: Cluster; rpc?: string }) => {
    setSignature(sig)
    setCluster(c)
    setRpc(r)
  }

  return (
    <div className="min-h-full p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-xl font-semibold">Solana Transaction Visualizer</h1>
          <p className="text-sm text-gray-600 dark:text-neutral-400">Paste a signature, pick a cluster, and inspect.</p>
        </header>

        <InputForm initialSignature={qSig} initialCluster={qCluster} onSubmit={onSubmit} />

        {query.isLoading && (
          <div className="text-sm text-gray-600 dark:text-neutral-400">Loading...</div>
        )}

        {query.isError && (
          <div className="text-sm text-red-600">Failed to fetch transaction. Check signature/cluster/RPC.</div>
        )}

        {query.data && (
          <SummaryCard summary={query.data.summary} />
        )}

        {!enabled && signature && (
          <div className="text-xs text-red-600">Invalid signature format.</div>
        )}
      </div>
    </div>
  )
}

export default App
