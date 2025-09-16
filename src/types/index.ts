export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet';

export type TxStatus = 'success' | 'fail' | 'unknown';

export interface TxSummary {
  signature: string;
  slot: number;
  blockTime: number | null; // epoch seconds or null
  status: TxStatus; // based on meta.err
  feeLamports: number; // meta.fee
  feePayer: string | null; // public key or null if unknown
}

export interface InstructionItem {
  index: number;
  programId: string;
  programName?: string;
  type?: string;
  accounts: string[];
  params?: Record<string, unknown>;
  inner?: InstructionItem[];
}

export type TransferKind = 'SOL' | 'SPL';

export interface TransferItem {
  kind: TransferKind;
  amount: string; // formatted string, or raw + decimals in another field if needed
  lamports?: number; // for SOL
  decimals?: number; // for SPL
  mint?: string; // for SPL
  sender?: string; // optional until pairing is implemented
  receiver?: string; // optional until pairing is implemented
}

export interface AccountDelta {
  pubkey: string;
  isSigner?: boolean;
  isWritable?: boolean;
  preBalanceLamports?: number;
  postBalanceLamports?: number;
}

export interface LogLine {
  text: string;
  level: 'info' | 'error' | 'program';
  programId?: string;
}

export interface TxDetails {
  summary: TxSummary;
  accounts: AccountDelta[];
  instructions: InstructionItem[];
  transfers: TransferItem[];
  logs: LogLine[];
}

