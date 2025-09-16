# Transaction Visualizer – Ghi chú phát triển (Note)

Mục tiêu: xây web tool đơn giản để dán transaction signature và xem nhanh chi tiết giao dịch trên Solana (slot/time, fee payer, instructions, transfers, logs), tối ưu tốc độ và độ dễ đọc.

## Phạm vi & Không phạm vi
- Phạm vi: Frontend only, gọi RPC Solana để đọc/parse giao dịch và hiển thị.
- Không phạm vi (MVP): viết smart contract, backend server, DB.

## Tech Stack
- Build/Framework: Vite + React + TypeScript
- UI: TailwindCSS (+ optional: shadcn/ui hoặc Headless UI cho Tabs/Accordion/Toast)
- Solana: `@solana/web3.js`
- Thời gian/format: `dayjs`
- Data fetching/cache: React Query (hoặc Zustand + fetch tự viết nếu muốn nhẹ hơn)
- Triển khai: Vercel (preview, public URL)

## Trạng thái repo hiện tại
- Đang có cấu trúc lồng: `SolanaTxViewer/SolanaTxViewer/*` do khởi tạo Vite bên trong thư mục cùng tên.
- Việc cần làm: flatten cấu trúc dự án về 1 cấp.
  - Di chuyển toàn bộ nội dung trong `SolanaTxViewer/` (thư mục con) lên thư mục gốc dự án, giữ lại cặp `package.json` + `package-lock.json` đúng.
  - Xóa `package-lock.json` “thừa” ở gốc (nếu có), rồi chạy lại `npm install` tại thư mục gốc mới.

## Cấu trúc thư mục (mục tiêu)
```
SolanaTxViewer/
  ├─ src/
  │  ├─ components/        # InputForm, SummaryCard, InstructionList, TransferList, LogViewer
  │  ├─ utils/             # call RPC, parse/format
  │  ├─ pages/ or main.tsx # entry
  │  └─ types/             # định nghĩa type TS dùng chung
  ├─ public/
  ├─ index.html
  ├─ package.json
  ├─ Note.md               # file này
  └─ README.md
```

## Env & cấu hình
- Cluster: `mainnet-beta` (default), `devnet` (tùy chọn), `testnet` (optional).
- RPC endpoint mặc định:
  - Mainnet: `https://api.mainnet-beta.solana.com`
  - Devnet: `https://api.devnet.solana.com`
  - Testnet: `https://api.testnet.solana.com`
- Cho phép user nhập custom RPC (ví dụ Helius/QuickNode) và lưu vào `localStorage`.
- Biến môi trường (optional):
  - `VITE_RPC_MAINNET_URL`, `VITE_RPC_DEVNET_URL`, `VITE_RPC_TESTNET_URL`

## Kiến trúc & Flow
- Input: signature (base58), chọn cluster, optional custom RPC.
- Validate: signature hợp lệ (base58, độ dài hợp lý), tránh ký tự lạ.
- Fetch: `connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })`.
- Chuẩn hóa: tạo object kết quả gồm summary, accounts, instructions, transfers, logs.
- Hiển thị: SummaryCard + Tabs (Instructions / Transfers / Logs / Accounts).
- Chia sẻ: sync URL `?tx=...&cluster=...`.
- Cache: React Query cache theo `[cluster, signature]`.

## Định nghĩa dữ liệu (TypeScript – gợi ý)
```ts
export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet';

export type TxStatus = 'success' | 'fail' | 'unknown';

export interface TxSummary {
  signature: string;
  slot: number;
  blockTime: number | null; // epoch seconds hoặc null
  status: TxStatus;         // dựa trên meta.err
  feeLamports: number;      // meta.fee
  feePayer: string;         // public key
}

export interface InstructionItem {
  index: number;
  programId: string;
  programName?: string;     // map từ well-known program IDs
  type?: string;            // nếu parse được (SPL Token, System)
  accounts: string[];
  params?: Record<string, unknown>;
  inner?: InstructionItem[]; // inner instructions (nếu muốn hiển thị lồng)
}

export type TransferKind = 'SOL' | 'SPL';

export interface TransferItem {
  kind: TransferKind;
  amount: string;           // dạng string đã format hoặc lamports/raw + decimals
  decimals?: number;        // cho SPL
  mint?: string;            // cho SPL
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

## Parse chiến lược (MVP)
- Summary:
  - `slot`, `blockTime` → format bằng dayjs; handle null.
  - `status` từ `meta.err` (null → success).
  - `feeLamports` từ `meta.fee`; `feePayer` từ message/loaded addresses.
- Instructions:
  - Liệt kê từng instruction: `programId`, accounts, và cố gắng nhận diện program quen thuộc (System, SPL Token, Memo, Stake, Vote).
  - Inner instructions: hỗ trợ expand/collapse (optional ở MVP).
- Transfers:
  - SOL: dựa vào chênh lệch `preBalances`/`postBalances` (trừ fee) hoặc nhận diện `SystemProgram.transfer`.
  - SPL: dựa `preTokenBalances`/`postTokenBalances` (group theo `owner + mint`).
- Logs:
  - Hiển thị `meta.logMessages` theo dòng, đánh dấu error nếu có `program failed to complete`.
- Mapping program IDs (ví dụ):
  - System Program: `11111111111111111111111111111111`
  - SPL Token: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
  - Memo: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

## Xử lý lỗi & Edge cases
- Signature không hợp lệ → báo lỗi sớm, không gọi RPC.
- `getTransaction` trả về `null` → gợi ý kiểm tra cluster hoặc độ mới của tx.
- Versioned tx (v0) vẫn ok với `maxSupportedTransactionVersion: 0`, nhưng account label có thể thiếu nếu không resolve address tables (có thể bổ sung sau MVP).
- `blockTime` có thể null → hiển thị `N/A`.
- Rate limit RPC → hiển thị hướng dẫn dùng custom RPC.

## UI/UX
- Layout: Input ở trên, kết quả dưới; SummaryCard nổi bật slot/time/status/fee/fee payer.
- Tabs: Instructions / Transfers / Logs / Accounts.
- Badge/Tag: tô màu theo program, highlight fee payer/sender/receiver.
- Skeleton khi loading; toast khi lỗi; copy-to-clipboard cho địa chỉ/signature.
- Dark mode (optional, Tailwind).

## Testing & Mẫu dữ liệu
- Thêm danh sách signature mẫu (mainnet/devnet) để thử nhanh (đặt trong `Note.md` hoặc `README.md`).
- Unit cho utils parse (nếu thêm Jest/Vitest):
  - parseSummary, parseTransfers (delta balances), classify logs.

## Hiệu năng
- Debounce input, cancel request khi signature thay đổi.
- React Query: staleTime ngắn (ví dụ 30–60s), retry hợp lý.

## MVP Checklist
- [ ] InputForm: nhập signature, chọn cluster, optional custom RPC.
- [ ] Validate signature base58, feedback lỗi.
- [ ] Gọi `getTransaction` và xử lý loading/error.
- [ ] SummaryCard: slot, time, status, fee, fee payer.
- [ ] InstructionList: programId → tên, accounts.
- [ ] TransferList: SOL + SPL bằng delta balances.
- [ ] LogViewer: hiển thị log, highlight error.
- [ ] Share link `?tx=...&cluster=...`.
- [ ] Lưu history gần đây (localStorage, 5–10 mục).

## Mở rộng (Backlog)
- [ ] Decode sâu SPL-Token (Instruction type & params).
- [ ] Hỗ trợ import Anchor IDL để decode event/log.
- [ ] Resolve Address Lookup Tables cho tx v0 để label accounts đầy đủ.
- [ ] Export JSON/CSV từ view Transfers/Instructions.
- [ ] PWA: cache offline phần history.
- [ ] i18n EN/VI switch.

## Quyết định cần chốt (nhờ bạn xác nhận)
- Cluster mặc định: `mainnet-beta` hay nhớ lần gần nhất?
- Có bật ô nhập custom RPC và lưu local không?
- Dùng React Query hay tự quản lý state/fetch (Zustand)?
- UI thuần Tailwind hay thêm shadcn/ui?
- Giới hạn lịch sử: 5, 10 hay 20 signature gần nhất?

## Kế hoạch triển khai (đề xuất)
1) Flatten thư mục dự án, cài deps nền tảng (Tailwind, React Query, dayjs).
2) Tạo utils `getTransactionDetails` + các hàm parse summary/transfers/logs.
3) Scaffold UI: InputForm, SummaryCard, Tabs và từng view rỗng.
4) Kết nối dữ liệu thật + handle lỗi/edge cases.
5) Bổ sung share link, history, polish UI và deploy Vercel.

---
Cập nhật file này khi chốt quyết định hoặc thay đổi hướng triển khai để cả team nắm chung.
