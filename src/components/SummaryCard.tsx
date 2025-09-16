import dayjs from 'dayjs'
import type { TxSummary } from '../types'

type Props = {
  summary: TxSummary
}

export function SummaryCard({ summary }: Props) {
  const dt = summary.blockTime ? dayjs.unix(summary.blockTime).format('YYYY-MM-DD HH:mm:ss') : 'N/A'
  const statusColor = summary.status === 'success' ? 'bg-green-500' : summary.status === 'fail' ? 'bg-red-500' : 'bg-gray-400'

  return (
    <div className="rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-gray-500 dark:text-neutral-400">Signature</div>
        <span className={`inline-block h-2 w-2 rounded-full ${statusColor}`} title={summary.status} />
      </div>
      <div className="break-all font-mono text-xs text-gray-800 dark:text-neutral-200">{summary.signature}</div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="Slot" value={String(summary.slot)} />
        <Info label="Block Time" value={dt} />
        <Info label="Fee (lamports)" value={String(summary.feeLamports)} />
        <Info label="Fee Payer" value={summary.feePayer ? short(summary.feePayer) : 'Unknown'} title={summary.feePayer ?? undefined} />
      </div>
    </div>
  )
}

function Info({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-neutral-400">{label}</div>
      <div className="truncate text-sm" title={title ?? value}>{value}</div>
    </div>
  )
}

function short(x: string) {
  return `${x.slice(0, 4)}...${x.slice(-4)}`
}

export default SummaryCard

