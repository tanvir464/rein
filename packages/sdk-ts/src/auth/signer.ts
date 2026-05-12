import type {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

/**
 * Minimal signer surface — compatible with @solana/wallet-adapter wallets
 * and our own `DelegateSigner`/`OwnerSigner` impls.
 */
export interface Signer {
  readonly publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions?<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

/**
 * Default signer used by the agent path.
 *
 * The "delegate" is a per-session keypair whose only authority is to envelope-
 * sign the spend tx and pay its SOL fee. The on-chain `spend` instruction
 * itself is signed by the vault PDA via program seeds, so a stolen delegate
 * key cannot move USDC out of the vault — only burn the delegate's own SOL on
 * tx fees. Rotation is a single tx.
 */
export class DelegateSigner implements Signer {
  constructor(private readonly keypair: Keypair) {}

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (isVersionedTx(tx)) {
      tx.sign([this.keypair]);
    } else {
      (tx as Transaction).partialSign(this.keypair);
    }
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> {
    const out: T[] = [];
    for (const t of txs) out.push(await this.signTransaction(t));
    return out;
  }
}

/**
 * Owner-controlled signer. The host app supplies the underlying signer
 * (typically a wallet adapter); this class is a typed shim that satisfies the
 * `Signer` interface and provides a sane `signAllTransactions` fallback.
 *
 * Used by the dashboard for owner-side flows (init_vault, update_policy,
 * approve_step_up) — never by an agent.
 */
export class OwnerSigner implements Signer {
  constructor(
    public readonly publicKey: PublicKey,
    private readonly impl: {
      signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
      signAllTransactions?: <T extends Transaction | VersionedTransaction>(
        txs: T[],
      ) => Promise<T[]>;
    },
  ) {}

  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.impl.signTransaction(tx);
  }

  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> {
    if (this.impl.signAllTransactions) return this.impl.signAllTransactions(txs);
    return Promise.all(txs.map((t) => this.impl.signTransaction(t)));
  }
}

function isVersionedTx(
  tx: Transaction | VersionedTransaction,
): tx is VersionedTransaction {
  return 'version' in tx && 'message' in tx;
}
