# Solana Transaction Visualizer

A lightweight web tool to paste a Solana transaction signature and quickly inspect details: slot/time, fee payer, instructions, SOL/SPL token transfers, and logs. Built for developers and newcomers who want a fast, readable view without opening a full explorer.

## Features
- Paste a transaction signature and fetch details from the chosen cluster
- Summary: slot, block time, status, fee, fee payer
- Instructions: program, accounts, (basic) decoded info where possible
- Transfers: SOL and SPL token deltas from pre/post balances
- Logs: render log messages with error highlighting
- Cluster selection: mainnet-beta (default), devnet, testnet
- Custom RPC input (persisted locally)
- Recent history: last 10 signatures in localStorage
- Shareable link: `?tx=...&cluster=...`

## Tech Stack
- Vite + React + TypeScript
- TailwindCSS (no extra UI library by default)
- `@solana/web3.js` for RPC access
- `@tanstack/react-query` for fetching and caching
- `dayjs` for time formatting

## Decisions
- Default cluster is `mainnet-beta` and the app remembers the last used cluster
- Custom RPC input is enabled and persisted to localStorage
- React Query is used for data fetching/cache
- Pure Tailwind for UI
- Recent history size is 10 items

## Getting Started

Prerequisites:
- Node.js 18+ and npm 9+

Install dependencies (from the project root where `package.json` lives):

```
npm install
```

Start the dev server:

```
npm run dev
```

Build for production:

```
npm run build
```

Preview the production build locally:

```
npm run preview
```

## Configuration

Environment variables (optional, override the defaults):
- `VITE_RPC_MAINNET_URL`
- `VITE_RPC_DEVNET_URL`
- `VITE_RPC_TESTNET_URL`

Create a `.env` file in the project root if needed, for example:

```
VITE_RPC_MAINNET_URL=https://api.mainnet-beta.solana.com
VITE_RPC_DEVNET_URL=https://api.devnet.solana.com
VITE_RPC_TESTNET_URL=https://api.testnet.solana.com
```

Local persistence keys (suggested):
- `tv.cluster` (last selected cluster)
- `tv.rpc` (custom RPC URL)
- `tv.history` (array of recent signatures, size 10)

## Usage
1) Paste a valid base58 transaction signature into the input
2) Select a cluster (or provide a custom RPC)
3) View summary, instructions, transfers, and logs in the result panel
4) Share the current view by copying the URL with query params

Edge cases handled:
- Invalid signatures are rejected before RPC is called
- `getTransaction` returning `null` shows guidance to check cluster/age
- `blockTime` may be `null` and is shown as `N/A`
- Versioned tx (v0) are supported with `maxSupportedTransactionVersion: 0`

## Project Structure

```
src/
  components/        # InputForm, SummaryCard, InstructionList, TransferList, LogViewer
  utils/             # RPC calls, normalization, format helpers
  types/             # shared TypeScript types
  main.tsx           # app entry
public/
index.html
```

See `Note.md` for detailed architecture, parsing strategy, and roadmap.

## Scripts
- `dev` — start Vite dev server
- `build` — build production bundle
- `preview` — preview production build
- `lint` — run ESLint (config in `eslint.config.js`)

## Deployment

Vercel is recommended for zero-config deployment:
- Connect the repository
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Alternatively, deploy the `dist/` folder on any static host.

## Roadmap (High-Level)
- Improve SPL-Token instruction decoding and params
- Optional: import Anchor IDL to enhance log/event decoding
- Resolve address lookup tables for v0 transactions to label accounts fully
- Export JSON/CSV from Transfers/Instructions views
- Optional PWA for offline access to local history

## Contributing
Small PRs and suggestions are welcome. Please keep scope focused and follow the existing code style. For bigger changes, open an issue or discussion first.

## Acknowledgments
- Solana Web3.js for RPC and transaction structures
- The Solana developer community for docs and examples
