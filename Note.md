# Transaction Visualizer – Development Notes

Goal: a lightweight web tool to paste a Solana transaction signature and quickly inspect details (slot/time, fee payer, instructions, transfers, logs) with a focus on speed and readability.

## Scope & Non‑Goals
- In scope: Frontend only, call Solana RPC to read/parse a transaction and render it.
- Out of scope (MVP): on‑chain programs, backend services, databases.

## Tech Stack
- Build/Framework: Vite + React + TypeScript
- UI: TailwindCSS (pure; avoid additional UI libs initially)
- Solana: `@solana/web3.js`
- Time/format: `dayjs`
- Data fetching/cache: React Query (chosen)
- Deployment: Vercel (preview deploys, public URL)

## Current Repo Status
- Nested structure detected: `SolanaTxViewer/SolanaTxViewer/*` (Vite was scaffolded inside a folder with the same name).
- Action item: flatten to a single‑level project.
  - Move everything from the inner `SolanaTxViewer/` up to the repo root, keeping the correct `package.json` + `package-lock.json` together.
  - Remove any extra lockfile at root and run `npm install` at the new root.

## Target Directory Structure
```
SolanaTxViewer/
  ├─ src/
  │  ├─ components/        # InputForm, SummaryCard, InstructionList, TransferList, LogViewer
  │  ├─ utils/             # RPC calls, parse/format helpers
  │  ├─ pages/ or main.tsx # entry
  │  └─ types/             # shared TS types
  ├─ public/
  ├─ index.html
  ├─ package.json
  ├─ Note.md               # this file
  └─ README.md
```

## Environment & Config
- Clusters: `mainnet-beta` (default), `devnet` (optional), `testnet` (optional).
- Persist last used cluster to `localStorage` (default to `mainnet-beta` on first load).
- Default RPC endpoints:
  - Mainnet: `https://api.mainnet-beta.solana.com`
  - Devnet: `https://api.devnet.solana.com`
  - Testnet: `https://api.testnet.solana.com`
- Allow a custom RPC input (e.g., Helius/QuickNode) and persist to `localStorage`.
- Local persistence keys (suggested): `tv.cluster`, `tv.rpc`, `tv.history`
- Optional env vars:
  - `VITE_RPC_MAINNET_URL`, `VITE_RPC_DEVNET_URL`, `VITE_RPC_TESTNET_URL`

## Architecture & Flow
- Input: signature (base58), cluster selection, optional custom RPC.
- Validate: check base58 and reasonable length, reject invalid chars.
- Fetch: `connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })`.
- Normalize: produce a result object with summary, accounts, instructions, transfers, logs.
- Render: SummaryCard + Tabs (Instructions / Transfers / Logs / Accounts).
- Share: sync URL `?tx=...&cluster=...` for shareable links.
- Cache: React Query keyed by `[cluster, signature]`.

## Data Model (TypeScript – suggestion)
```ts
export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet';

export type TxStatus = 'success' | 'fail' | 'unknown';

export interface TxSummary {
  signature: string;
  slot: number;
  blockTime: number | null; // epoch seconds or null
  status: TxStatus;         // based on meta.err
  feeLamports: number;      // meta.fee
  feePayer: string;         // public key
}

export interface InstructionItem {
  index: number;
  programId: string;
  programName?: string;     // mapped from well-known program IDs
  type?: string;            // if decoded (SPL Token, System)
  accounts: string[];
  params?: Record<string, unknown>;
  inner?: InstructionItem[]; // inner instructions
}

export type TransferKind = 'SOL' | 'SPL';

export interface TransferItem {
  kind: TransferKind;
  amount: string;           // formatted string, or raw + decimals
  decimals?: number;        // for SPL
  mint?: string;            // for SPL
  sender: string;
  receiver: string;
}

export interface AccountDelta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
  preBalanceLamports?: number;
  postBalanceLamports?: number;
}

export interface LogLine {
  text: string;
  level: 'info' | 'error' | 'program';
  programId?: string;
}
```

## Parsing Strategy (MVP)
- Summary:
  - `slot`, `blockTime` → format via `dayjs`; handle null.
  - `status` from `meta.err` (null → success).
  - `feeLamports` from `meta.fee`; `feePayer` from message/loaded addresses.
- Instructions:
  - List each instruction: `programId`, accounts, and attempt to identify common programs (System, SPL Token, Memo, Stake, Vote).
  - Inner instructions: optional expand/collapse in UI.
- Transfers:
  - SOL: use `preBalances` vs `postBalances` delta (minus fee) or detect `SystemProgram.transfer`.
  - SPL: use `preTokenBalances` vs `postTokenBalances` (group by `owner + mint`).
- Logs:
  - Render `meta.logMessages` line by line; highlight errors (e.g., `program failed to complete`).
- Program ID mapping (examples):
  - System Program: `11111111111111111111111111111111`
  - SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
  - Memo: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

## Errors & Edge Cases
- Invalid signature → fail fast before RPC call.
- `getTransaction` returns `null` → suggest checking cluster or age of tx.
- Versioned tx (v0) works with `maxSupportedTransactionVersion: 0`, but account labels may be incomplete without resolving address tables (can add later).
- `blockTime` may be null → display `N/A`.
- RPC rate limiting → suggest custom RPC.

## UI/UX
- Layout: input on top, results below; SummaryCard highlights slot/time/status/fee/fee payer.
- Tabs: Instructions / Transfers / Logs / Accounts.
- Badges: color by program; highlight fee payer/sender/receiver.
- Loading skeletons; error toasts; copy‑to‑clipboard for addresses/signature.
- Dark mode (optional, Tailwind).

## Testing & Sample Data
- Keep a list of sample signatures (mainnet/devnet) to quickly test.
- Unit tests for parse utils (if adding Jest/Vitest):
  - `parseSummary`, `parseTransfers` (balance deltas), log classification.

## Performance
- Debounce input; cancel in‑flight requests when signature changes.
- React Query: short `staleTime` (e.g., 30–60s) and sensible retries.

## MVP Checklist
- [ ] InputForm: signature input, cluster selector, optional custom RPC.
- [ ] Validate base58 signature with user feedback.
- [ ] Call `getTransaction` with loading/error states.
- [ ] SummaryCard: slot, time, status, fee, fee payer.
- [ ] InstructionList: programId → friendly name, accounts.
- [ ] TransferList: SOL + SPL via balance deltas.
- [ ] LogViewer: render logs, highlight errors.
- [ ] Shareable link `?tx=...&cluster=...`.
- [ ] Recent history in `localStorage` (10 items).

## Backlog
- [ ] Deeper SPL‑Token decoding (instruction types & params).
- [ ] Import Anchor IDL to decode events/logs.
- [ ] Resolve Address Lookup Tables for v0 tx to label accounts fully.
- [ ] Export JSON/CSV from Transfers/Instructions views.
- [ ] PWA: cache a local history view.
- [ ] i18n EN/VI toggle.

## Decisions
- Default cluster: `mainnet-beta` and remember last used.
- Custom RPC input: enabled and persisted locally.
- State/fetch: React Query.
- UI library: pure Tailwind (no extra component lib initially).
- History size: 10 recent signatures.

## Implementation Plan (proposed)
1) Flatten the project, install base deps (Tailwind, React Query, dayjs).
2) Create `getTransactionDetails` util + parse helpers (summary/transfers/logs).
3) Scaffold UI: InputForm, SummaryCard, Tabs and empty views.
4) Wire real data and handle errors/edge cases.
5) Add shareable link, recent history, polish UI, and deploy to Vercel.

---
Keep this file updated as decisions are made or plans change so the team stays aligned.
