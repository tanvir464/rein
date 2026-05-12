import type { Program } from '@coral-xyz/anchor';
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';

import { ReinError } from './errors';
import { parseToken } from './auth/token';
import {
  createConnection,
  createProgram,
  type ProgramOpts,
} from './chain/program';
import { decodePolicy, decodeReceipt } from './chain/decoder';
import { loadSimulatorState } from './chain/load-state';
import { simulate as simulateFn } from './policy';
import {
  deriveReceiptPda,
  derivePolicyPda,
  deriveStepUpPda,
} from './pdas';
import { ServiceHttp } from './service/http';
import { buildRequestStepUpIx } from './chain/builders';
import { x402SpendViaService } from './x402/client';
import { openActivitySocket } from './activity/socket';
import type {
  ActivityEvent,
  Cluster,
  Logger,
  ParsedToken,
  Policy,
  Receipt,
  RetryConfig,
  Scope,
  SimulationOutcome,
  SpendOpts,
  SpendResult,
  StepUpOpts,
  SubscribeOpts,
  Unsubscribe,
} from './types';
import type { Rein as ReinIdl } from './idl';
import type { Signer } from './auth/signer';

export type ReinOpts = {
  vault: string;
  token: string;
  cluster?: Cluster;
  rpcUrl?: string;
  serviceUrl?: string;
  fetch?: typeof fetch;
  signer?: Signer;
  logger?: Logger;
  retries?: RetryConfig;
  heliusApiKey?: string;
  refreshWindowSec?: number;
  onTokenRefresh?: (next: ParsedToken) => void;
};

const DEFAULT_HISTORY_LIMIT = 50;
const SPEND_RECEIPT_VAULT_OFFSET = 8; // 8-byte Anchor discriminator, then `vault: Pubkey`

/**
 * Pick a sensible default service URL from the token's env. Callers can always
 * override via `opts.serviceUrl`. Devnet is the deployed staging today; the
 * `production` mapping points at the planned mainnet hostname.
 */
function defaultServiceUrl(env: ParsedToken['env']): string {
  switch (env) {
    case 'dev':
      return 'http://127.0.0.1:8787';
    case 'devnet':
      return 'https://api.rein.so';
    case 'production':
      return 'https://api.rein.so';
  }
}

function defaultClusterForEnv(env: ParsedToken['env']): Cluster {
  // 'dev' typically still talks to devnet program; if you need localnet, pass `cluster` explicitly.
  return env === 'production' ? 'mainnet-beta' : 'devnet';
}

/**
 * Single-vault client. One `Rein` instance per vault — instances are cheap.
 */
export class Rein {
  readonly vault: PublicKey;
  readonly token: ParsedToken;
  readonly cluster: Cluster;
  readonly serviceUrl: string;
  readonly connection: Connection;
  readonly program: Program<ReinIdl>;
  readonly http: ServiceHttp;
  readonly logger?: Logger;
  readonly signer?: Signer;

  private cachedVaultAcct?: { usdcMint: PublicKey; vaultUsdcAta: PublicKey };
  private disposed = false;

  constructor(opts: ReinOpts) {
    if (!opts || typeof opts !== 'object') {
      throw new ReinError('ErrConfig', { reason: 'opts is required' });
    }
    if (typeof opts.vault !== 'string') {
      throw new ReinError('ErrConfig', { reason: 'vault must be a base58 string' });
    }
    if (typeof opts.token !== 'string') {
      throw new ReinError('ErrConfig', { reason: 'token must be a string' });
    }

    let vault: PublicKey;
    try {
      vault = new PublicKey(opts.vault);
    } catch {
      throw new ReinError('ErrConfig', { reason: 'vault is not valid base58' });
    }

    const token = parseToken(opts.token);
    if (token.payload.vault !== opts.vault) {
      throw new ReinError('ErrConfig', {
        reason: 'token vault mismatch',
        expected: opts.vault,
        tokenVault: token.payload.vault,
      });
    }

    const cluster = opts.cluster ?? defaultClusterForEnv(token.env);
    const serviceUrl = opts.serviceUrl ?? defaultServiceUrl(token.env);
    if (!serviceUrl.startsWith('http://') && !serviceUrl.startsWith('https://')) {
      throw new ReinError('ErrConfig', { reason: 'serviceUrl must be http(s)' });
    }
    if (cluster === 'mainnet-beta') {
      // §15: mainnet support is gated post-audit. Pre-empt with a clear error.
      throw new ReinError('ErrConfig', {
        reason: 'mainnet-beta cluster is gated until program audit lands',
      });
    }

    const programOpts: ProgramOpts = {
      cluster,
      rpcUrl: opts.rpcUrl,
      heliusApiKey: opts.heliusApiKey,
      commitment: 'confirmed',
    };
    const connection = createConnection(programOpts);
    const program = createProgram(connection);

    const http = new ServiceHttp({
      serviceUrl,
      token,
      fetch: opts.fetch,
      logger: opts.logger,
      retries: opts.retries,
      refreshWindowSec: opts.refreshWindowSec,
      onTokenRefresh: opts.onTokenRefresh,
    });

    this.vault = vault;
    this.token = token;
    this.cluster = cluster;
    this.serviceUrl = serviceUrl;
    this.connection = connection;
    this.program = program;
    this.http = http;
    this.logger = opts.logger;
    this.signer = opts.signer;
  }

  // ─── Reads ──────────────────────────────────────────────────────────

  /** SOL + USDC balances for the vault. Reads on-chain; no service round-trip. */
  async balance(): Promise<{ usdc: bigint; sol: bigint; updatedAt: Date }> {
    this.assertAlive();
    const { vaultUsdcAta } = await this.getVaultAcct();
    const [solLamports, usdcRaw] = await Promise.all([
      this.connection.getBalance(this.vault, 'confirmed'),
      this.connection.getTokenAccountBalance(vaultUsdcAta, 'confirmed').catch((e: unknown) => {
        // ATA may not exist yet for a freshly initialized vault.
        const msg = (e as Error)?.message ?? String(e);
        if (/could not find account|Invalid param/.test(msg)) {
          return { value: { amount: '0' } };
        }
        throw e;
      }),
    ]);
    return {
      sol: BigInt(solLamports),
      usdc: BigInt(usdcRaw.value.amount),
      updatedAt: new Date(),
    };
  }

  /** Current Policy. Reads on-chain; the SDK does not cache (policy can change between calls). */
  async policy(): Promise<Policy> {
    this.assertAlive();
    const [policyPda] = derivePolicyPda(this.vault, this.program.programId);
    const raw = await this.program.account.policy.fetch(policyPda);
    return decodePolicy({
      version: raw.version as number,
      dailyCap: raw.dailyCap as BN,
      perTxCap: raw.perTxCap as BN,
      allowlist: raw.allowlist as PublicKey[],
      allowlistLen: raw.allowlistLen as number,
      stepUpThreshold: raw.stepUpThreshold as BN,
      expiryTs: raw.expiryTs as BN,
      paused: raw.paused as boolean,
    });
  }

  /**
   * Vault receipt history, newest first. Reads `SpendReceipt` accounts via
   * `getProgramAccounts` with a memcmp filter on the `vault` field.
   *
   * Each receipt is enriched with its first known transaction signature via
   * `getSignaturesForAddress(receiptPda, limit:1)` — one extra RPC per receipt.
   */
  async history(opts: { limit?: number; before?: Date } = {}): Promise<Receipt[]> {
    this.assertAlive();
    const limit = opts.limit ?? DEFAULT_HISTORY_LIMIT;

    const all = await this.program.account.spendReceipt.all([
      { memcmp: { offset: SPEND_RECEIPT_VAULT_OFFSET, bytes: this.vault.toBase58() } },
    ]);

    const sorted = all
      .map((entry) => {
        const ts = (entry.account.ts as BN).toNumber();
        return { entry, ts };
      })
      .filter(({ ts }) => (opts.before ? ts * 1000 < opts.before.getTime() : true))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);

    const enriched: Receipt[] = await Promise.all(
      sorted.map(async ({ entry }) => {
        let signature = '';
        try {
          const sigs = await this.connection.getSignaturesForAddress(
            entry.publicKey,
            { limit: 1 },
          );
          signature = sigs[0]?.signature ?? '';
        } catch (e) {
          this.logger?.debug('history: getSignaturesForAddress failed', e);
        }
        return decodeReceipt({
          id: entry.publicKey.toBase58(),
          signature,
          raw: {
            vault: entry.account.vault as PublicKey,
            amount: entry.account.amount as BN,
            recipient: entry.account.recipient as PublicKey,
            ts: entry.account.ts as BN,
            policyVersion: entry.account.policyVersion as number,
            nonce: entry.account.nonce as BN,
            x402UrlHash: entry.account.x402UrlHash as number[] | Uint8Array,
            disputed: entry.account.disputed as boolean,
          },
        });
      }),
    );
    return enriched;
  }

  /**
   * Fetch a single receipt by its PDA address (base58) or by its u64 nonce
   * (numeric string). Returns `null` if the receipt does not exist.
   */
  async receipt(idOrNonce: string): Promise<Receipt | null> {
    this.assertAlive();
    let pda: PublicKey;
    if (/^\d+$/.test(idOrNonce)) {
      pda = deriveReceiptPda(this.vault, new BN(idOrNonce), this.program.programId)[0];
    } else {
      try {
        pda = new PublicKey(idOrNonce);
      } catch {
        return null;
      }
    }
    try {
      const raw = await this.program.account.spendReceipt.fetch(pda);
      let signature = '';
      try {
        const sigs = await this.connection.getSignaturesForAddress(pda, { limit: 1 });
        signature = sigs[0]?.signature ?? '';
      } catch {
        // best-effort
      }
      return decodeReceipt({
        id: pda.toBase58(),
        signature,
        raw: {
          vault: raw.vault as PublicKey,
          amount: raw.amount as BN,
          recipient: raw.recipient as PublicKey,
          ts: raw.ts as BN,
          policyVersion: raw.policyVersion as number,
          nonce: raw.nonce as BN,
          x402UrlHash: raw.x402UrlHash as number[] | Uint8Array,
          disputed: raw.disputed as boolean,
        },
      });
    } catch (e: unknown) {
      const msg = (e as Error)?.message ?? String(e);
      if (/Account does not exist|could not find/.test(msg)) return null;
      throw e;
    }
  }

  /**
   * Off-chain pre-flight against the live policy + counter + step-up state.
   * Same byte-for-byte rules as the on-chain `spend` handler — see
   * `policy/simulate.ts` for the asymmetry contract.
   */
  async simulate(opts: {
    recipient: string;
    amount: bigint;
    nonce?: bigint;
  }): Promise<SimulationOutcome> {
    this.assertAlive();
    let recipientPk: PublicKey;
    try {
      recipientPk = new PublicKey(opts.recipient);
    } catch {
      throw new ReinError('ErrConfig', { reason: 'recipient is not valid base58' });
    }
    if (typeof opts.amount !== 'bigint' || opts.amount <= 0n) {
      throw new ReinError('ErrConfig', { reason: 'amount must be a positive bigint' });
    }

    const slot = await this.connection.getSlot('confirmed');
    const blockTime = await this.connection.getBlockTime(slot);
    const nowSec = blockTime ?? Math.floor(Date.now() / 1000);

    const nonce = new BN((opts.nonce ?? BigInt(Date.now())).toString());
    const state = await loadSimulatorState(
      this.program,
      this.vault,
      nonce,
      nowSec,
    );
    const day = new BN(Math.floor(nowSec / 86_400));
    const result = simulateFn(state, {
      amount: new BN(opts.amount.toString()),
      recipient: recipientPk,
      nonce,
      day,
    });

    if (result.ok) {
      return {
        ok: true,
        willCost: BigInt(result.willCost.toString()),
        dailySpentAfter: BigInt(result.dailySpentAfter.toString()),
      };
    }
    return {
      ok: false,
      reason: result.reason,
      ...(result.suggestedStepUp
        ? {
            suggestedStepUp: {
              amount: BigInt(result.suggestedStepUp.amount.toString()),
              threshold: BigInt(result.suggestedStepUp.threshold.toString()),
            },
          }
        : {}),
    };
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────

  /** Idempotent. Marks the client unusable; future reads/writes throw. */
  async dispose(): Promise<void> {
    this.disposed = true;
    // WebSocket cleanup happens in the activity socket itself, added in Day 3.
  }

  /** True if `dispose()` has been called. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /** True if the client's token carries the given scope. */
  hasScope(scope: Scope): boolean {
    return this.token.payload.scopes.includes(scope);
  }

  // ─── Writes ────────────────────────────────────────────────────────

  /**
   * Execute a spend.
   *
   *  - `kind: 'transfer'` → calls `POST /v1/spend`. The service simulates
   *    against on-chain state, builds + signs the spend tx with its delegate
   *    keypair, and confirms.
   *  - `kind: 'x402'` → calls `POST /v1/x402/spend`. Service runs the full
   *    402 dance (parse, select, simulate, sign, retry-with-X-Payment).
   *
   * Returns a `SpendResult { ok: true, ... }` on success or `{ ok: false, reason }`
   * on policy / network / endpoint rejection. Never throws for policy
   * rejections — only for caller bugs (token expired, vault mismatch, etc.).
   */
  async spend(opts: SpendOpts): Promise<SpendResult> {
    this.assertAlive();
    if (!this.hasScope('spend')) {
      return { ok: false, reason: 'ErrTokenScope', details: 'token missing `spend` scope' };
    }

    if (opts.kind === 'transfer') {
      const body = await this.http.post<TransferSpendBody>('/v1/spend', {
        recipient: opts.recipient,
        amount: opts.amount.toString(),
      });
      if (body.ok) {
        return {
          ok: true,
          receiptId: body.receiptPda,
          signature: body.signature,
          amount: BigInt(body.amount),
          recipient: body.recipient,
          policyVersion: body.policyVersion,
          confirmedAt: new Date(),
        };
      }
      return {
        ok: false,
        reason: body.reason,
        stage: body.stage,
      };
    }

    return x402SpendViaService(this.http, {
      url: opts.url,
      maxAmount: opts.maxAmount ?? BigInt(Number.MAX_SAFE_INTEGER),
      method: opts.method,
      body: opts.body,
      headers: opts.headers,
    });
  }

  /**
   * Open a `request_step_up` PDA for a future over-threshold spend. Direct
   * mode: requires a `Signer` passed at construction time (the signer pays
   * for the PDA rent; it has no authority over the vault).
   *
   * Returns the request PDA, the on-chain expiry, and the submission signature.
   */
  async requestStepUp(opts: StepUpOpts): Promise<{
    requestPda: string;
    expiresAt: Date;
    signature: string;
  }> {
    this.assertAlive();
    if (!this.signer) {
      throw new ReinError('ErrConfig', {
        reason: 'requestStepUp requires a `signer` at construction time',
      });
    }
    if (typeof opts.amount !== 'bigint' || opts.amount <= 0n) {
      throw new ReinError('ErrConfig', { reason: 'amount must be a positive bigint' });
    }
    let recipientPk: PublicKey;
    try {
      recipientPk = new PublicKey(opts.recipient);
    } catch {
      throw new ReinError('ErrConfig', { reason: 'recipient is not valid base58' });
    }

    const ttlSecs = BigInt(opts.ttlSecs ?? 300);
    if (ttlSecs <= 0n || ttlSecs > 86_400n) {
      throw new ReinError('ErrConfig', {
        reason: 'ttlSecs must be in (0, 86400]',
      });
    }

    const nonce = BigInt(Date.now());
    const [stepUpPda] = deriveStepUpPda(
      this.vault,
      new BN(nonce.toString()),
      this.program.programId,
    );

    const { ix } = await buildRequestStepUpIx({
      payer: this.signer.publicKey,
      vault: this.vault,
      args: { amount: opts.amount, recipient: recipientPk, nonce, ttlSecs },
      programId: this.program.programId,
    });

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const message = new TransactionMessage({
      payerKey: this.signer.publicKey,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();
    const tx = new VersionedTransaction(message);
    const signed = await this.signer.signTransaction(tx);
    const signature = await this.connection.sendTransaction(signed);

    // Best-effort confirmation
    try {
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const status = await this.connection.getSignatureStatuses([signature]);
        const v = status?.value?.[0];
        if (v && (v.confirmationStatus === 'confirmed' || v.confirmationStatus === 'finalized')) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } catch (e) {
      this.logger?.debug('requestStepUp: confirmation poll error', e);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((nowSec + Number(ttlSecs)) * 1000);

    return {
      requestPda: stepUpPda.toBase58(),
      expiresAt,
      signature,
    };
  }

  /**
   * Subscribe to the live activity stream for this vault. Returns an
   * `Unsubscribe` function. Reconnects with exponential backoff on close;
   * resumes from `since` to replay events missed during outages.
   */
  subscribe(
    handler: (event: ActivityEvent) => void,
    opts: SubscribeOpts = {},
  ): Unsubscribe {
    this.assertAlive();
    if (!this.hasScope('read')) {
      throw new ReinError('ErrTokenScope', { required: 'read' });
    }
    return openActivitySocket(
      {
        serviceUrl: this.serviceUrl,
        vault: this.vault.toBase58(),
        token: this.token.raw,
        since: opts.since,
        logger: this.logger,
      },
      handler,
      opts,
    );
  }

  // ─── Internal ───────────────────────────────────────────────────────

  private assertAlive(): void {
    if (this.disposed) {
      throw new ReinError('ErrConfig', { reason: 'Rein client has been disposed' });
    }
  }

  private async getVaultAcct(): Promise<{
    usdcMint: PublicKey;
    vaultUsdcAta: PublicKey;
  }> {
    if (this.cachedVaultAcct) return this.cachedVaultAcct;
    const v = await this.program.account.vault.fetch(this.vault);
    const usdcMint = v.usdcMint as PublicKey;
    const vaultUsdcAta = getAssociatedTokenAddressSync(usdcMint, this.vault, true);
    this.cachedVaultAcct = { usdcMint, vaultUsdcAta };
    return this.cachedVaultAcct;
  }
}

// ─── Service response shapes (internal, not exported) ────────────────
type TransferSpendBody =
  | {
      ok: true;
      signature: string;
      receiptPda: string;
      nonce: string;
      amount: string;
      policyVersion: number;
      recipient: string;
    }
  | {
      ok: false;
      stage?:
        | 'load' | 'simulate' | 'build' | 'sign' | 'submit' | 'confirm';
      reason: string;
    };
