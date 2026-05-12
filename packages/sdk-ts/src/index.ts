// ─── F8 foundation (Phase 1) ─────────────────────────────────────────
export { REIN_PROGRAM_ID } from './program-id';
export {
  VAULT_SEED,
  POLICY_SEED,
  BLOCKLIST_SEED,
  COUNTER_SEED,
  RECEIPT_SEED,
  STEP_UP_SEED,
} from './seeds';
export {
  deriveVaultPda,
  derivePolicyPda,
  deriveBlocklistPda,
  deriveCounterPda,
  deriveReceiptPda,
  deriveReceiptV2Pda,
  deriveStepUpPda,
  deriveUmbraRefMarkerPda,
} from './pdas';
export { IDL, type Rein as ReinIdl } from './idl';

// ─── F10 simulator (Phase 2) ─────────────────────────────────────────
export {
  simulate,
  type SimulatorState,
  type SimulatorRequest,
  type SimulationResult,
  type SimReason,
} from './policy';

// ─── F16 client surface (Phase 3) ───────────────────────────────────
export { ReinError, isReinError, type ErrorCode, type SpendErrorCode } from './errors';
export type {
  ActivityEvent,
  Cluster,
  Env,
  Logger,
  ParsedToken,
  Policy,
  Receipt,
  RetryConfig,
  Scope,
  SimulationFail,
  SimulationOk,
  SimulationOutcome,
  SpendOpts,
  SpendResult,
  StepUpOpts,
  SubscribeOpts,
  TokenPayload,
  Unsubscribe,
} from './types';
export {
  parseToken,
  redactToken,
  tokenNearingExpiry,
  hasScope,
} from './auth/token';
export { DelegateSigner, OwnerSigner, type Signer } from './auth/signer';
export { ServiceHttp, type HttpOpts } from './service/http';

// ─── F16 chain layer ────────────────────────────────────────────────
export {
  createConnection,
  createProgram,
  resolveRpcUrl,
  type ProgramOpts,
} from './chain/program';
export { bnToBigint, bigintToBn, decodePolicy, decodeReceipt } from './chain/decoder';
export { loadSimulatorState } from './chain/load-state';
export {
  buildInitVaultIx,
  buildDepositIx,
  buildInitPolicyIx,
  buildUpdatePolicyIx,
  buildRequestStepUpIx,
  buildApproveStepUpIx,
  buildPauseIx,
  buildDisputeIx,
  buildExpirePolicyIx,
  buildSpendIx,
  buildRecordPrivateSpendIx,
  type InitVaultInput,
  type DepositInput,
  type PolicyArgsInput,
  type StepUpRequestArgsInput,
  type SpendArgsInput,
  type RecordPrivateSpendArgsInput,
} from './chain/builders';

// ─── F16 x402 ──────────────────────────────────────────────────────
export {
  parsePaymentRequirements,
  type Requirement,
  type Facilitator,
} from './x402/parser';
export {
  selectAcceptable,
  SUPPORTED_USDC_MINTS,
  SUPPORTED_NETWORKS,
  type SelectFilter,
} from './x402/selector';
export { encodePaymentHeader } from './x402/encoder';
export {
  x402SpendViaService,
  probe402,
  payAndRetry,
  type X402SpendInput,
} from './x402/client';

// ─── F16 receipts ──────────────────────────────────────────────────
export { verifyReceipt, type VerifyResult } from './receipts/verify';

// ─── F16 activity ──────────────────────────────────────────────────
export {
  openActivitySocket,
  decodeEvent,
  type ActivitySocketOpts,
} from './activity/socket';

// ─── F16 client ─────────────────────────────────────────────────────
export { Rein, type ReinOpts } from './client';
