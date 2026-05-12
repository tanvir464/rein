/**
 * Wire-shape types for the dashboard's API client. Mirrors
 * `service/src/routes/data.ts` JSON responses 1:1 — when the service evolves
 * a field, update both sides.
 */

export type VaultStatus = 'active' | 'paused' | 'expired';

export type Vault = {
  id: string;
  name: string;
  pubkey: string;
  owner?: string;
  usdcMint?: string;
  balanceUsdc: number;
  balanceSol: number;
  spend24h: number;
  cap24h: number;
  status: VaultStatus;
  policyVersion: number;
  spark: number[];
  createdAt: string;
};

export type Receipt = {
  nonce: string;
  vaultId: string;
  recipient: string;
  recipientLabel?: string;
  amountUsdc: number;
  taskId: string;
  txSig: string;
  status: 'settled' | 'pending' | 'disputed' | 'blocked';
  createdAt: string;
  endpoint?: string;
  runtime?: 'mcp' | 'langchain' | 'openai' | 'vercel-ai' | 'python' | 'cli';
};

export type Policy = {
  vaultId: string;
  version: number;
  dailyCapUsdc: number;
  perTxCapUsdc: number;
  stepUpThresholdUsdc: number;
  allowlist: string[];
  blocklist: string[];
  expiresAt?: string;
  pausedAt?: string;
};

export type StepUp = {
  id: string;
  vaultId: string;
  recipient: string;
  recipientLabel?: string;
  amountUsdc: number;
  taskId: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
};
