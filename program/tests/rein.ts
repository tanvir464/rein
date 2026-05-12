import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { assert, expect } from 'chai';

import { Rein } from '../target/types/rein';
import { createUsdcFixture, toMicroUsdc, USDC_DECIMALS } from './fixtures/usdc-mint';
import { fundedKeypair } from './fixtures/wallets';
import { defaultPolicyArgs, dollars, PolicyArgsLike } from './fixtures/policy';
import {
  currentDayBN,
  deriveCounterPda,
  derivePolicyPda,
  deriveReceiptPda,
  nextNonce,
  setupSpendBundle,
  ZERO_HASH,
} from './fixtures/spend';
import { deriveStepUpPda } from './fixtures/stepup';
import { deriveBlocklistPda } from './fixtures/blocklist';

const VAULT_SEED = Buffer.from('vault');

function deriveVaultPda(owner: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([VAULT_SEED, owner.toBuffer()], programId);
}

// Anchor / web3.js errors come back in many shapes (AnchorError, SendTransactionError,
// SimulationError). Flatten anything plausibly diagnostic into one searchable string.
function errString(e: any): string {
  const parts: unknown[] = [
    e?.error?.errorCode?.code,
    e?.error?.errorMessage,
    e?.message,
    Array.isArray(e?.logs) ? e.logs.join('\n') : undefined,
    e?.transactionMessage,
    e?.transactionLogs?.join?.('\n'),
    e?.simulationResponse?.logs?.join?.('\n'),
    e?.toString?.(),
  ];
  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(' || ');
}

describe('rein — F1 Vault', () => {
  // Provider/program are resolved lazily inside `before` so the file can be loaded
  // by tooling (ts-mocha discovery, type-check) without ANCHOR_PROVIDER_URL set.
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  // Per-test-suite shared fixture: one owner, one mint, fresh per file run.
  let owner: Keypair;
  let attacker: Keypair;
  let usdcMint: PublicKey;
  let ownerAta: PublicKey;
  let vaultPda: PublicKey;
  let vaultBump: number;
  let vaultAta: PublicKey;

  before(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;

    owner = await fundedKeypair(provider, 5);
    attacker = await fundedKeypair(provider, 2);

    const fixture = await createUsdcFixture(provider, owner, 1000); // 1000 USDC
    usdcMint = fixture.mint;
    ownerAta = fixture.payerAta.address;

    [vaultPda, vaultBump] = deriveVaultPda(owner.publicKey, program.programId);
    vaultAta = await getAssociatedTokenAddress(usdcMint, vaultPda, true);
  });

  describe('init_vault', () => {
    it('happy: creates vault PDA and vault USDC ATA', async () => {
      await program.methods
        .initVault()
        .accountsStrict({
          owner: owner.publicKey,
          vault: vaultPda,
          usdcMint,
          vaultUsdcAta: vaultAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([owner])
        .rpc();

      const vault = await program.account.vault.fetch(vaultPda);
      expect(vault.owner.toBase58()).to.equal(owner.publicKey.toBase58());
      expect(vault.usdcMint.toBase58()).to.equal(usdcMint.toBase58());
      expect(vault.bump).to.equal(vaultBump);
      expect(vault.createdAt.toNumber()).to.be.greaterThan(0);

      const ata = await getAccount(provider.connection, vaultAta);
      expect(ata.owner.toBase58()).to.equal(vaultPda.toBase58());
      expect(ata.amount).to.equal(0n);
    });

    it('negative: init_vault twice from same owner fails', async () => {
      try {
        await program.methods
          .initVault()
          .accountsStrict({
            owner: owner.publicKey,
            vault: vaultPda,
            usdcMint,
            vaultUsdcAta: vaultAta,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([owner])
          .rpc();
        assert.fail('expected init_vault to fail on second call');
      } catch (e: any) {
        // Anchor surfaces as `already in use` from the system program when init_if_needed isn't set.
        expect(errString(e)).to.match(/already in use|already exists|0x0|AccountAlreadyInitialized|custom program error/i);
      }
    });
  });

  describe('deposit', () => {
    it('happy: deposit 100 USDC moves balance', async () => {
      const amount = toMicroUsdc(100);
      const ownerBefore = (await getAccount(provider.connection, ownerAta)).amount;
      const vaultBefore = (await getAccount(provider.connection, vaultAta)).amount;

      await program.methods
        .deposit(new BN(amount.toString()))
        .accountsStrict({
          owner: owner.publicKey,
          vault: vaultPda,
          usdcMint,
          ownerUsdcAta: ownerAta,
          vaultUsdcAta: vaultAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([owner])
        .rpc();

      const ownerAfter = (await getAccount(provider.connection, ownerAta)).amount;
      const vaultAfter = (await getAccount(provider.connection, vaultAta)).amount;
      expect(ownerBefore - ownerAfter).to.equal(amount);
      expect(vaultAfter - vaultBefore).to.equal(amount);
    });

    it('happy: two sequential deposits accumulate', async () => {
      const a = toMicroUsdc(50);
      const b = toMicroUsdc(25);
      const vaultBefore = (await getAccount(provider.connection, vaultAta)).amount;

      for (const amt of [a, b]) {
        await program.methods
          .deposit(new BN(amt.toString()))
          .accountsStrict({
            owner: owner.publicKey,
            vault: vaultPda,
            usdcMint,
            ownerUsdcAta: ownerAta,
            vaultUsdcAta: vaultAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([owner])
          .rpc();
      }

      const vaultAfter = (await getAccount(provider.connection, vaultAta)).amount;
      expect(vaultAfter - vaultBefore).to.equal(a + b);
    });

    it('negative: deposit 0 → ErrAmountZero', async () => {
      try {
        await program.methods
          .deposit(new BN(0))
          .accountsStrict({
            owner: owner.publicKey,
            vault: vaultPda,
            usdcMint,
            ownerUsdcAta: ownerAta,
            vaultUsdcAta: vaultAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([owner])
          .rpc();
        assert.fail('expected ErrAmountZero');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrAmountZero/);
      }
    });

    it('negative: non-owner signer → ErrNotVaultOwner', async () => {
      // Attacker has their own USDC in their own ATA, but tries to deposit "into the owner's vault."
      // The vault PDA is derived from `owner.key()`, so when attacker signs and we use their key
      // as `owner` in the seeds, the PDA won't match; the closer signal is `has_one = owner` failing
      // when we pass owner.publicKey but attacker is the signer.
      const attackerAta = (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          attacker,
          usdcMint,
          attacker.publicKey,
        )
      ).address;
      // give attacker some USDC so the source has balance (rules out InsufficientFunds masking)
      await mintTo(
        provider.connection,
        owner,
        usdcMint,
        attackerAta,
        owner,
        toMicroUsdc(10),
      );

      try {
        await program.methods
          .deposit(new BN(toMicroUsdc(1).toString()))
          .accountsStrict({
            owner: attacker.publicKey,
            vault: vaultPda,
            usdcMint,
            ownerUsdcAta: attackerAta,
            vaultUsdcAta: vaultAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([attacker])
          .rpc();
        assert.fail('expected non-owner deposit to fail');
      } catch (e: any) {
        // PDA seed mismatch fires before has_one — both are correct rejections.
        expect(errString(e)).to.match(/ErrNotVaultOwner|ConstraintSeeds|ConstraintHasOne|seeds constraint/i);
      }
    });

    it('negative: wrong mint argued → ErrMintMismatch', async () => {
      // Create a second mint and try to use it as the deposit mint.
      const otherMint = await createMint(
        provider.connection,
        owner,
        owner.publicKey,
        null,
        USDC_DECIMALS,
      );
      // We need ATAs for both sides under the wrong mint, otherwise constraint resolution
      // will fail earlier than ErrMintMismatch and mask it.
      const ownerOtherAta = (
        await getOrCreateAssociatedTokenAccount(
          provider.connection,
          owner,
          otherMint,
          owner.publicKey,
        )
      ).address;
      await mintTo(provider.connection, owner, otherMint, ownerOtherAta, owner, toMicroUsdc(1));
      const vaultOtherAta = await getAssociatedTokenAddress(otherMint, vaultPda, true);
      // intentionally not creating vaultOtherAta — has_one on usdc_mint will fire first

      try {
        await program.methods
          .deposit(new BN(toMicroUsdc(1).toString()))
          .accountsStrict({
            owner: owner.publicKey,
            vault: vaultPda,
            usdcMint: otherMint,
            ownerUsdcAta: ownerOtherAta,
            vaultUsdcAta: vaultOtherAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([owner])
          .rpc();
        assert.fail('expected ErrMintMismatch');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrMintMismatch|ConstraintHasOne|has_one|AccountNotInitialized/i);
      }
    });
  });
});

describe('rein — F2 Policy', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  let owner: Keypair;
  let attacker: Keypair;
  let vaultPda: PublicKey;
  let policyPda: PublicKey;
  let blocklistPda: PublicKey;

  before(async () => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;

    owner = await fundedKeypair(provider, 5);
    attacker = await fundedKeypair(provider, 2);

    // Each F2 suite gets its own owner so it doesn't collide with the F1 vault.
    const fixture = await createUsdcFixture(provider, owner, 0);
    [vaultPda] = deriveVaultPda(owner.publicKey, program.programId);
    const vaultAta = await getAssociatedTokenAddress(fixture.mint, vaultPda, true);
    await program.methods
      .initVault()
      .accountsStrict({
        owner: owner.publicKey,
        vault: vaultPda,
        usdcMint: fixture.mint,
        vaultUsdcAta: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();

    [policyPda] = derivePolicyPda(vaultPda, program.programId);
    [blocklistPda] = deriveBlocklistPda(vaultPda, program.programId);
  });

  // Helper: anchor expects camelCase field names matching the IDL.
  function ix(args: PolicyArgsLike) {
    return args as any;
  }

  describe('init_policy', () => {
    it('happy: creates a v1 Policy bound to the vault', async () => {
      const args = defaultPolicyArgs();
      await program.methods
        .initPolicy(ix(args))
        .accountsStrict({
          owner: owner.publicKey,
          vault: vaultPda,
          policy: policyPda,
          blocklist: blocklistPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const policy = await program.account.policy.fetch(policyPda);
      expect(policy.owner.toBase58()).to.equal(owner.publicKey.toBase58());
      expect(policy.vault.toBase58()).to.equal(vaultPda.toBase58());
      expect(policy.version).to.equal(1);
      expect(policy.dailyCap.toString()).to.equal(args.dailyCap.toString());
      expect(policy.perTxCap.toString()).to.equal(args.perTxCap.toString());
      expect(policy.stepUpThreshold.toString()).to.equal(args.stepUpThreshold.toString());
      expect(policy.expiryTs.toString()).to.equal('0');
      expect(policy.paused).to.equal(false);
      expect(policy.allowlistLen).to.equal(0);
      expect(policy.createdAt.toNumber()).to.be.greaterThan(0);
      expect(policy.updatedAt.toString()).to.equal(policy.createdAt.toString());
    });

    it('negative: init_policy twice for same vault → AccountAlreadyInitialized', async () => {
      try {
        await program.methods
          .initPolicy(ix(defaultPolicyArgs()))
          .accountsStrict({
            owner: owner.publicKey,
            vault: vaultPda,
            policy: policyPda,
            blocklist: blocklistPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([owner])
          .rpc();
        assert.fail('expected init_policy to fail on second call');
      } catch (e: any) {
        expect(errString(e)).to.match(/already in use|already exists|0x0|AccountAlreadyInitialized|custom program error/i);
      }
    });
  });

  describe('init_policy validation', () => {
    // These tests exercise the validate() rules. Each uses a fresh owner+vault+policy
    // so they don't collide with the existing one.
    async function freshVaultAndPolicy(): Promise<{
      o: Keypair;
      vault: PublicKey;
      policy: PublicKey;
      blocklist: PublicKey;
    }> {
      const o = await fundedKeypair(provider, 2);
      const fx = await createUsdcFixture(provider, o, 0);
      const [v] = deriveVaultPda(o.publicKey, program.programId);
      const vAta = await getAssociatedTokenAddress(fx.mint, v, true);
      await program.methods
        .initVault()
        .accountsStrict({
          owner: o.publicKey,
          vault: v,
          usdcMint: fx.mint,
          vaultUsdcAta: vAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([o])
        .rpc();
      const [p] = derivePolicyPda(v, program.programId);
      const [b] = deriveBlocklistPda(v, program.programId);
      return { o, vault: v, policy: p, blocklist: b };
    }

    async function attemptInit(
      o: Keypair,
      v: PublicKey,
      p: PublicKey,
      b: PublicKey,
      args: PolicyArgsLike,
    ) {
      return program.methods
        .initPolicy(ix(args))
        .accountsStrict({
          owner: o.publicKey,
          vault: v,
          policy: p,
          blocklist: b,
          systemProgram: SystemProgram.programId,
        })
        .signers([o])
        .rpc();
    }

    it('negative: allowlist of 17 → ErrAllowlistTooLong', async () => {
      const { o, vault, policy, blocklist } = await freshVaultAndPolicy();
      const big = Array.from({ length: 17 }, () => Keypair.generate().publicKey);
      try {
        await attemptInit(o, vault, policy, blocklist, defaultPolicyArgs({ allowlist: big }));
        assert.fail('expected ErrAllowlistTooLong');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrAllowlistTooLong/);
      }
    });

    it('negative: per_tx_cap == 0 → ErrInvalidPolicy', async () => {
      const { o, vault, policy, blocklist } = await freshVaultAndPolicy();
      try {
        await attemptInit(o, vault, policy, blocklist, defaultPolicyArgs({ perTxCap: new BN(0) }));
        assert.fail('expected ErrInvalidPolicy');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrInvalidPolicy/);
      }
    });

    it('negative: daily_cap < per_tx_cap → ErrInvalidPolicy', async () => {
      const { o, vault, policy, blocklist } = await freshVaultAndPolicy();
      try {
        await attemptInit(
          o,
          vault,
          policy,
          blocklist,
          defaultPolicyArgs({ dailyCap: dollars(0.1), perTxCap: dollars(1) }),
        );
        assert.fail('expected ErrInvalidPolicy');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrInvalidPolicy/);
      }
    });

    it('negative: expiry_ts in the past → ErrExpired', async () => {
      const { o, vault, policy, blocklist } = await freshVaultAndPolicy();
      try {
        await attemptInit(
          o,
          vault,
          policy,
          blocklist,
          defaultPolicyArgs({ expiryTs: new BN(1) }), // way in the past
        );
        assert.fail('expected ErrExpired');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrExpired/);
      }
    });

    it('negative: init_policy from non-owner → ErrNotVaultOwner', async () => {
      // Use the existing vaultPda but signed by attacker.
      // The vault PDA seed includes owner.key(); attacker as signer fails seed-derivation first.
      const [attackerVault] = deriveVaultPda(attacker.publicKey, program.programId);
      const [attackerPolicy] = derivePolicyPda(attackerVault, program.programId);
      const [attackerBlocklist] = deriveBlocklistPda(attackerVault, program.programId);
      try {
        // Pass attacker as signer + owner, but vaultPda derived from `owner` — seeds mismatch.
        await program.methods
          .initPolicy(ix(defaultPolicyArgs()))
          .accountsStrict({
            owner: attacker.publicKey,
            vault: vaultPda, // F2's owner-vault, not attacker's
            policy: attackerPolicy,
            blocklist: attackerBlocklist,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker])
          .rpc();
        assert.fail('expected non-owner init to fail');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrNotVaultOwner|ConstraintSeeds|seeds constraint/i);
      }
    });
  });

  describe('update_policy', () => {
    it('happy: bumps version monotonically across 3 updates', async () => {
      const before = await program.account.policy.fetch(policyPda);
      const startVersion = before.version;

      for (let i = 1; i <= 3; i++) {
        await program.methods
          .updatePolicy(ix(defaultPolicyArgs({ dailyCap: dollars(5 + i) })))
          .accountsStrict({
            owner: owner.publicKey,
            vault: vaultPda,
            policy: policyPda,
          })
          .signers([owner])
          .rpc();
      }

      const after = await program.account.policy.fetch(policyPda);
      expect(after.version).to.equal(startVersion + 3);
      expect(after.dailyCap.toString()).to.equal(dollars(5 + 3).toString());
      expect(after.createdAt.toString()).to.equal(before.createdAt.toString());
      expect(after.updatedAt.toNumber()).to.be.greaterThanOrEqual(before.updatedAt.toNumber());
    });

    it('happy: full allowlist of 16 entries persists in order', async () => {
      const list = Array.from({ length: 16 }, () => Keypair.generate().publicKey);
      await program.methods
        .updatePolicy(ix(defaultPolicyArgs({ allowlist: list })))
        .accountsStrict({
          owner: owner.publicKey,
          vault: vaultPda,
          policy: policyPda,
        })
        .signers([owner])
        .rpc();

      const policy = await program.account.policy.fetch(policyPda);
      expect(policy.allowlistLen).to.equal(16);
      for (let i = 0; i < 16; i++) {
        expect(policy.allowlist[i].toBase58()).to.equal(list[i].toBase58());
      }
    });

    it('negative: update_policy from non-owner → ErrUnauthorized', async () => {
      try {
        await program.methods
          .updatePolicy(ix(defaultPolicyArgs()))
          .accountsStrict({
            owner: attacker.publicKey,
            vault: vaultPda,
            policy: policyPda,
          })
          .signers([attacker])
          .rpc();
        assert.fail('expected ErrUnauthorized');
      } catch (e: any) {
        // Seed mismatch on vault PDA fires first (vault seed is owner.key()),
        // but ErrUnauthorized is the canonical name for the rejection.
        expect(errString(e)).to.match(/ErrUnauthorized|ErrNotVaultOwner|ConstraintSeeds|seeds constraint/i);
      }
    });
  });
});

describe('rein — F3 Spend (+ F4 Receipt)', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  before(() => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;
  });

  // Each test creates its own bundle — keeps daily counters and nonces clean.
  async function spendArgs(amount: BN, opts: { nonce?: BN } = {}) {
    return {
      amount,
      nonce: opts.nonce ?? nextNonce(),
      x402UrlHash: ZERO_HASH,
      day: currentDayBN(),
    };
  }

  async function callSpend(
    bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
    args: { amount: BN; nonce: BN; x402UrlHash: number[]; day: BN },
    overrides: { recipientAta?: PublicKey; stepUpRequest?: PublicKey | null } = {},
  ) {
    const recipientAta = overrides.recipientAta ?? bundle.recipientAta;
    const [counterPda] = deriveCounterPda(bundle.vault, args.day, program.programId);
    const [receiptPda] = deriveReceiptPda(bundle.vault, args.nonce, program.programId);
    const stepUpRequest =
      overrides.stepUpRequest === undefined ? null : overrides.stepUpRequest;
    return program.methods
      .spend(args as any)
      .accountsStrict({
        payer: bundle.payer.publicKey,
        vault: bundle.vault,
        policy: bundle.policy,
        usdcMint: bundle.mint,
        vaultUsdcAta: bundle.vaultAta,
        recipientUsdcAta: recipientAta,
        dailyCounter: counterPda,
        receipt: receiptPda,
        blocklist: bundle.blocklist,
        stepUpRequest,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bundle.payer])
      .rpc();
  }

  describe('happy paths', () => {
    it('spend within caps + empty allowlist (wildcard) succeeds', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(1) },
      });
      const args = await spendArgs(dollars(0.4));
      await callSpend(bundle, args);

      const recBal = (await getAccount(provider.connection, bundle.recipientAta)).amount;
      expect(recBal).to.equal(BigInt(args.amount.toString()));

      const [counterPda] = deriveCounterPda(bundle.vault, args.day, program.programId);
      const counter = await program.account.dailyCounter.fetch(counterPda);
      expect(counter.spent.toString()).to.equal(args.amount.toString());

      const [receiptPda] = deriveReceiptPda(bundle.vault, args.nonce, program.programId);
      const receipt = await program.account.spendReceipt.fetch(receiptPda);
      expect(receipt.amount.toString()).to.equal(args.amount.toString());
      expect(receipt.recipient.toBase58()).to.equal(bundle.recipientAta.toBase58());
      expect(receipt.policyVersion).to.equal(1);
      expect(receipt.nonce.toString()).to.equal(args.nonce.toString());
    });

    it('two spends same day accumulate in counter', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(1) },
      });

      const a = await spendArgs(dollars(0.3));
      await callSpend(bundle, a);
      const b = await spendArgs(dollars(0.4));
      await callSpend(bundle, b);

      const [counterPda] = deriveCounterPda(bundle.vault, a.day, program.programId);
      const counter = await program.account.dailyCounter.fetch(counterPda);
      expect(counter.spent.toString()).to.equal(dollars(0.7).toString());
    });

    it('spend at exact per_tx_cap succeeds (boundary)', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(1) },
      });
      const args = await spendArgs(dollars(0.5));
      await callSpend(bundle, args);
    });

    it('receipt records the policy version at submission time', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(1) },
      });
      // Bump policy to v2 first.
      await program.methods
        .updatePolicy(defaultPolicyArgs({ dailyCap: dollars(6) }) as any)
        .accountsStrict({
          owner: bundle.owner.publicKey,
          vault: bundle.vault,
          policy: bundle.policy,
        })
        .signers([bundle.owner])
        .rpc();

      const args = await spendArgs(dollars(0.3));
      await callSpend(bundle, args);
      const [receiptPda] = deriveReceiptPda(bundle.vault, args.nonce, program.programId);
      const receipt = await program.account.spendReceipt.fetch(receiptPda);
      expect(receipt.policyVersion).to.equal(2);
    });
  });

  describe('negative paths', () => {
    it('spend over per_tx_cap → ErrPerTxCap', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      try {
        await callSpend(bundle, await spendArgs(dollars(0.6)));
        assert.fail('expected ErrPerTxCap');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrPerTxCap/);
      }
    });

    it('spend over daily_cap → ErrDailyCap', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        // daily 0.5, per-tx 0.5, step-up well above
        policy: { dailyCap: dollars(0.5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      // First spend exhausts daily cap.
      await callSpend(bundle, await spendArgs(dollars(0.5)));
      try {
        await callSpend(bundle, await spendArgs(dollars(0.1)));
        assert.fail('expected ErrDailyCap');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrDailyCap/);
      }
    });

    it('spend to non-allowlisted recipient → ErrRecipientNotAllowed', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: {
          dailyCap: dollars(5),
          perTxCap: dollars(0.5),
          stepUpThreshold: dollars(10),
          // Allowlist contains some random unrelated keys, NOT the recipient ATA.
          allowlist: Array.from({ length: 3 }, () => Keypair.generate().publicKey),
        },
      });
      try {
        await callSpend(bundle, await spendArgs(dollars(0.3)));
        assert.fail('expected ErrRecipientNotAllowed');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrRecipientNotAllowed/);
      }
    });

    it('spend to recipient that IS in allowlist succeeds', async () => {
      // Build bundle first to know the recipient ATA, then re-init with that ATA in the list.
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      // Tighten allowlist to include only the bundle's recipient ATA.
      await program.methods
        .updatePolicy(
          defaultPolicyArgs({
            dailyCap: dollars(5),
            perTxCap: dollars(0.5),
            stepUpThreshold: dollars(10),
            allowlist: [bundle.recipientAta],
          }) as any,
        )
        .accountsStrict({
          owner: bundle.owner.publicKey,
          vault: bundle.vault,
          policy: bundle.policy,
        })
        .signers([bundle.owner])
        .rpc();

      await callSpend(bundle, await spendArgs(dollars(0.2)));
    });

    it('spend while paused → ErrPaused', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: {
          dailyCap: dollars(5),
          perTxCap: dollars(0.5),
          stepUpThreshold: dollars(10),
          paused: true,
        },
      });
      try {
        await callSpend(bundle, await spendArgs(dollars(0.3)));
        assert.fail('expected ErrPaused');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrPaused/);
      }
    });

    it('spend over step_up_threshold (no bypass yet) → ErrStepUpRequired', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        // step-up at 0.2; per-tx cap 0.5 lets us send 0.3 which exceeds threshold
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(0.2) },
      });
      try {
        await callSpend(bundle, await spendArgs(dollars(0.3)));
        assert.fail('expected ErrStepUpRequired');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrStepUpRequired/);
      }
    });

    it('spend with reused nonce → AccountAlreadyInitialized (ErrReplay)', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      const sharedNonce = nextNonce();
      const a = await spendArgs(dollars(0.2), { nonce: sharedNonce });
      await callSpend(bundle, a);
      try {
        await callSpend(bundle, await spendArgs(dollars(0.2), { nonce: sharedNonce }));
        assert.fail('expected replay rejection');
      } catch (e: any) {
        expect(errString(e)).to.match(/already in use|already exists|0x0|AccountAlreadyInitialized|custom program error/i);
      }
    });

    it('spend with amount == 0 → ErrAmountZero', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      try {
        await callSpend(bundle, await spendArgs(new BN(0)));
        assert.fail('expected ErrAmountZero');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrAmountZero/);
      }
    });
  });
});

describe('rein — F5 Step-up', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  before(() => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;
  });

  async function callRequestStepUp(
    bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
    args: { amount: BN; recipient: PublicKey; nonce: BN; ttlSecs: BN },
  ) {
    const [stepUpPda] = deriveStepUpPda(bundle.vault, args.nonce, program.programId);
    await program.methods
      .requestStepUp(args as any)
      .accountsStrict({
        payer: bundle.payer.publicKey,
        vault: bundle.vault,
        policy: bundle.policy,
        stepUpRequest: stepUpPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([bundle.payer])
      .rpc();
    return stepUpPda;
  }

  async function callApproveStepUp(
    bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
    stepUpPda: PublicKey,
  ) {
    await program.methods
      .approveStepUp()
      .accountsStrict({
        owner: bundle.owner.publicKey,
        vault: bundle.vault,
        stepUpRequest: stepUpPda,
      })
      .signers([bundle.owner])
      .rpc();
  }

  async function callSpendF5(
    bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
    args: { amount: BN; nonce: BN; x402UrlHash: number[]; day: BN },
    stepUpRequest: PublicKey | null,
  ) {
    const [counterPda] = deriveCounterPda(bundle.vault, args.day, program.programId);
    const [receiptPda] = deriveReceiptPda(bundle.vault, args.nonce, program.programId);
    return program.methods
      .spend(args as any)
      .accountsStrict({
        payer: bundle.payer.publicKey,
        vault: bundle.vault,
        policy: bundle.policy,
        usdcMint: bundle.mint,
        vaultUsdcAta: bundle.vaultAta,
        recipientUsdcAta: bundle.recipientAta,
        dailyCounter: counterPda,
        receipt: receiptPda,
        blocklist: bundle.blocklist,
        stepUpRequest,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bundle.payer])
      .rpc();
  }

  describe('happy', () => {
    it('request → approve → spend completes end-to-end', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });

      const nonce = nextNonce();
      const stepUpPda = await callRequestStepUp(bundle, {
        amount: dollars(0.5),
        recipient: bundle.recipientAta,
        nonce,
        ttlSecs: new BN(300),
      });

      let req = await program.account.stepUpRequest.fetch(stepUpPda);
      expect(req.approved).to.equal(false);
      expect(req.amount.toString()).to.equal(dollars(0.5).toString());

      await callApproveStepUp(bundle, stepUpPda);

      req = await program.account.stepUpRequest.fetch(stepUpPda);
      expect(req.approved).to.equal(true);

      await callSpendF5(
        bundle,
        { amount: dollars(0.5), nonce, x402UrlHash: ZERO_HASH, day: currentDayBN() },
        stepUpPda,
      );

      const [receiptPda] = deriveReceiptPda(bundle.vault, nonce, program.programId);
      const receipt = await program.account.spendReceipt.fetch(receiptPda);
      expect(receipt.amount.toString()).to.equal(dollars(0.5).toString());
    });
  });

  describe('negative', () => {
    it('request_step_up below threshold → ErrStepUpNotNeeded', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.5) },
      });
      try {
        await callRequestStepUp(bundle, {
          amount: dollars(0.4),
          recipient: bundle.recipientAta,
          nonce: nextNonce(),
          ttlSecs: new BN(300),
        });
        assert.fail('expected ErrStepUpNotNeeded');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrStepUpNotNeeded/);
      }
    });

    it('request_step_up above per_tx_cap → ErrPerTxCap', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });
      try {
        await callRequestStepUp(bundle, {
          amount: dollars(2),
          recipient: bundle.recipientAta,
          nonce: nextNonce(),
          ttlSecs: new BN(300),
        });
        assert.fail('expected ErrPerTxCap');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrPerTxCap/);
      }
    });

    it('request_step_up with ttl_secs <= 0 → ErrStepUpTtlInvalid', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });
      try {
        await callRequestStepUp(bundle, {
          amount: dollars(0.5),
          recipient: bundle.recipientAta,
          nonce: nextNonce(),
          ttlSecs: new BN(0),
        });
        assert.fail('expected ErrStepUpTtlInvalid');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrStepUpTtlInvalid/);
      }
    });

    it('approve_step_up from non-owner → ErrUnauthorized / seeds', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });
      const nonce = nextNonce();
      const stepUpPda = await callRequestStepUp(bundle, {
        amount: dollars(0.5),
        recipient: bundle.recipientAta,
        nonce,
        ttlSecs: new BN(300),
      });
      const attacker = await fundedKeypair(provider, 1);
      try {
        await program.methods
          .approveStepUp()
          .accountsStrict({
            owner: attacker.publicKey,
            vault: bundle.vault,
            stepUpRequest: stepUpPda,
          })
          .signers([attacker])
          .rpc();
        assert.fail('expected non-owner approve to fail');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrUnauthorized|ErrNotVaultOwner|ConstraintSeeds|seeds constraint/i);
      }
    });

    it('spend with mismatched amount in approval → ErrStepUpMismatch', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });
      const nonce = nextNonce();
      const stepUpPda = await callRequestStepUp(bundle, {
        amount: dollars(0.5),
        recipient: bundle.recipientAta,
        nonce,
        ttlSecs: new BN(300),
      });
      await callApproveStepUp(bundle, stepUpPda);
      try {
        await callSpendF5(
          bundle,
          { amount: dollars(0.6), nonce, x402UrlHash: ZERO_HASH, day: currentDayBN() },
          stepUpPda,
        );
        assert.fail('expected ErrStepUpMismatch');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrStepUpMismatch/);
      }
    });

    it('spend with not-yet-approved request → ErrStepUpRequired', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });
      const nonce = nextNonce();
      const stepUpPda = await callRequestStepUp(bundle, {
        amount: dollars(0.5),
        recipient: bundle.recipientAta,
        nonce,
        ttlSecs: new BN(300),
      });
      try {
        await callSpendF5(
          bundle,
          { amount: dollars(0.5), nonce, x402UrlHash: ZERO_HASH, day: currentDayBN() },
          stepUpPda,
        );
        assert.fail('expected ErrStepUpRequired');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrStepUpRequired/);
      }
    });

    it('spend without request when amount > threshold → ErrStepUpRequired', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.2) },
      });
      try {
        await callSpendF5(
          bundle,
          { amount: dollars(0.5), nonce: nextNonce(), x402UrlHash: ZERO_HASH, day: currentDayBN() },
          null,
        );
        assert.fail('expected ErrStepUpRequired');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrStepUpRequired/);
      }
    });

    it('spend within threshold + no request attached → succeeds (parity)', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(1), stepUpThreshold: dollars(0.5) },
      });
      await callSpendF5(
        bundle,
        { amount: dollars(0.4), nonce: nextNonce(), x402UrlHash: ZERO_HASH, day: currentDayBN() },
        null,
      );
    });
  });
});

describe('rein — F6 Pause/Dispute/Expire', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;

  before(() => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;
  });

  // F6 spend helper (mirrors the F5 one but standalone for clarity).
  async function callSpendF6(
    bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
    args: { amount: BN; nonce: BN; x402UrlHash: number[]; day: BN },
    overrides: { recipientAta?: PublicKey } = {},
  ) {
    const recipientAta = overrides.recipientAta ?? bundle.recipientAta;
    const [counterPda] = deriveCounterPda(bundle.vault, args.day, program.programId);
    const [receiptPda] = deriveReceiptPda(bundle.vault, args.nonce, program.programId);
    return program.methods
      .spend(args as any)
      .accountsStrict({
        payer: bundle.payer.publicKey,
        vault: bundle.vault,
        policy: bundle.policy,
        usdcMint: bundle.mint,
        vaultUsdcAta: bundle.vaultAta,
        recipientUsdcAta: recipientAta,
        dailyCounter: counterPda,
        receipt: receiptPda,
        blocklist: bundle.blocklist,
        stepUpRequest: null,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([bundle.payer])
      .rpc();
  }

  describe('pause', () => {
    it('happy: pause then unpause; version unchanged', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      const before = await program.account.policy.fetch(bundle.policy);
      const startVersion = before.version;

      await program.methods
        .pause({ paused: true })
        .accountsStrict({
          owner: bundle.owner.publicKey,
          vault: bundle.vault,
          policy: bundle.policy,
        })
        .signers([bundle.owner])
        .rpc();

      let p = await program.account.policy.fetch(bundle.policy);
      expect(p.paused).to.equal(true);
      expect(p.version).to.equal(startVersion);

      await program.methods
        .pause({ paused: false })
        .accountsStrict({
          owner: bundle.owner.publicKey,
          vault: bundle.vault,
          policy: bundle.policy,
        })
        .signers([bundle.owner])
        .rpc();

      p = await program.account.policy.fetch(bundle.policy);
      expect(p.paused).to.equal(false);
      expect(p.version).to.equal(startVersion);
    });

    it('negative: pause from non-owner', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      const attacker = await fundedKeypair(provider, 1);
      try {
        await program.methods
          .pause({ paused: true })
          .accountsStrict({
            owner: attacker.publicKey,
            vault: bundle.vault,
            policy: bundle.policy,
          })
          .signers([attacker])
          .rpc();
        assert.fail('expected non-owner pause to fail');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrUnauthorized|ErrNotVaultOwner|ConstraintSeeds|seeds constraint/i);
      }
    });
  });

  describe('dispute', () => {
    async function spendThenDispute(
      bundle: Awaited<ReturnType<typeof setupSpendBundle>>,
      amount: BN,
    ) {
      const nonce = nextNonce();
      await callSpendF6(bundle, {
        amount,
        nonce,
        x402UrlHash: ZERO_HASH,
        day: currentDayBN(),
      });
      const [receiptPda] = deriveReceiptPda(bundle.vault, nonce, program.programId);
      await program.methods
        .dispute({ nonce })
        .accountsStrict({
          owner: bundle.owner.publicKey,
          vault: bundle.vault,
          receipt: receiptPda,
          blocklist: bundle.blocklist,
        })
        .signers([bundle.owner])
        .rpc();
      return receiptPda;
    }

    it('happy: dispute marks receipt and adds recipient to blocklist', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      const receiptPda = await spendThenDispute(bundle, dollars(0.3));

      const r = await program.account.spendReceipt.fetch(receiptPda);
      expect(r.disputed).to.equal(true);

      const b = await program.account.blocklist.fetch(bundle.blocklist);
      expect(b.len).to.equal(1);
      expect(b.entries[0].toBase58()).to.equal(bundle.recipientAta.toBase58());
    });

    it('happy: dispute is idempotent', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      const receiptPda = await spendThenDispute(bundle, dollars(0.3));
      // Dispute again — should be no-op.
      const nonce = (await program.account.spendReceipt.fetch(receiptPda)).nonce;
      await program.methods
        .dispute({ nonce })
        .accountsStrict({
          owner: bundle.owner.publicKey,
          vault: bundle.vault,
          receipt: receiptPda,
          blocklist: bundle.blocklist,
        })
        .signers([bundle.owner])
        .rpc();
      const b = await program.account.blocklist.fetch(bundle.blocklist);
      expect(b.len).to.equal(1);
    });

    it('happy: spend after dispute (different recipient) succeeds', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      await spendThenDispute(bundle, dollars(0.2));

      // Different recipient → succeeds.
      const otherWallet = await fundedKeypair(provider, 1);
      const { getOrCreateAssociatedTokenAccount: gATA } = await import('@solana/spl-token');
      const otherAta = (
        await gATA(provider.connection, bundle.owner, bundle.mint, otherWallet.publicKey)
      ).address;

      await callSpendF6(
        bundle,
        { amount: dollars(0.2), nonce: nextNonce(), x402UrlHash: ZERO_HASH, day: currentDayBN() },
        { recipientAta: otherAta },
      );
    });

    it('negative: spend to blocked recipient → ErrRecipientBlocked', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      await spendThenDispute(bundle, dollars(0.2));

      try {
        await callSpendF6(bundle, {
          amount: dollars(0.2),
          nonce: nextNonce(),
          x402UrlHash: ZERO_HASH,
          day: currentDayBN(),
        });
        assert.fail('expected ErrRecipientBlocked');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrRecipientBlocked/);
      }
    });

    it('negative: dispute from non-owner', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      const nonce = nextNonce();
      await callSpendF6(bundle, {
        amount: dollars(0.2),
        nonce,
        x402UrlHash: ZERO_HASH,
        day: currentDayBN(),
      });
      const [receiptPda] = deriveReceiptPda(bundle.vault, nonce, program.programId);
      const attacker = await fundedKeypair(provider, 1);
      try {
        await program.methods
          .dispute({ nonce })
          .accountsStrict({
            owner: attacker.publicKey,
            vault: bundle.vault,
            receipt: receiptPda,
            blocklist: bundle.blocklist,
          })
          .signers([attacker])
          .rpc();
        assert.fail('expected non-owner dispute to fail');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrUnauthorized|ErrNotVaultOwner|ConstraintSeeds|seeds constraint/i);
      }
    });

    it('negative: blocklist full (8 distinct recipients) → ErrBlocklistFull on the 9th', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 10,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.1), stepUpThreshold: dollars(10) },
      });
      const { getOrCreateAssociatedTokenAccount: gATA } = await import('@solana/spl-token');

      // Spend to 8 distinct recipients, dispute each → fills blocklist.
      for (let i = 0; i < 8; i++) {
        const w = await fundedKeypair(provider, 1);
        const ata = (await gATA(provider.connection, bundle.owner, bundle.mint, w.publicKey))
          .address;
        const nonce = nextNonce();
        await callSpendF6(
          bundle,
          { amount: dollars(0.05), nonce, x402UrlHash: ZERO_HASH, day: currentDayBN() },
          { recipientAta: ata },
        );
        const [rpda] = deriveReceiptPda(bundle.vault, nonce, program.programId);
        await program.methods
          .dispute({ nonce })
          .accountsStrict({
            owner: bundle.owner.publicKey,
            vault: bundle.vault,
            receipt: rpda,
            blocklist: bundle.blocklist,
          })
          .signers([bundle.owner])
          .rpc();
      }

      const b = await program.account.blocklist.fetch(bundle.blocklist);
      expect(b.len).to.equal(8);

      // 9th distinct recipient — should overflow.
      const w = await fundedKeypair(provider, 1);
      const ata = (await gATA(provider.connection, bundle.owner, bundle.mint, w.publicKey))
        .address;
      const nonce = nextNonce();
      await callSpendF6(
        bundle,
        { amount: dollars(0.05), nonce, x402UrlHash: ZERO_HASH, day: currentDayBN() },
        { recipientAta: ata },
      );
      const [rpda] = deriveReceiptPda(bundle.vault, nonce, program.programId);
      try {
        await program.methods
          .dispute({ nonce })
          .accountsStrict({
            owner: bundle.owner.publicKey,
            vault: bundle.vault,
            receipt: rpda,
            blocklist: bundle.blocklist,
          })
          .signers([bundle.owner])
          .rpc();
        assert.fail('expected ErrBlocklistFull');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrBlocklistFull/);
      }
    });
  });

  describe('expire_policy', () => {
    it('happy: anyone can expire after expiry_ts → policy.paused = true', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: {
          dailyCap: dollars(5),
          perTxCap: dollars(0.5),
          stepUpThreshold: dollars(10),
          expiryTs: new BN(nowSec + 5), // expires ~5 seconds from now (gives init_policy time to land)
        },
      });
      await new Promise((r) => setTimeout(r, 6500));

      const caller = await fundedKeypair(provider, 1);
      await program.methods
        .expirePolicy()
        .accountsStrict({
          caller: caller.publicKey,
          vault: bundle.vault,
          policy: bundle.policy,
        })
        .signers([caller])
        .rpc();

      const p = await program.account.policy.fetch(bundle.policy);
      expect(p.paused).to.equal(true);
    });

    it('negative: expire_policy on policy with expiry_ts == 0 → ErrNotExpiring', async () => {
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: { dailyCap: dollars(5), perTxCap: dollars(0.5), stepUpThreshold: dollars(10) },
      });
      try {
        await program.methods
          .expirePolicy()
          .accountsStrict({
            caller: bundle.owner.publicKey,
            vault: bundle.vault,
            policy: bundle.policy,
          })
          .signers([bundle.owner])
          .rpc();
        assert.fail('expected ErrNotExpiring');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrNotExpiring/);
      }
    });

    it('negative: expire_policy before expiry_ts → ErrNotExpired', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const bundle = await setupSpendBundle(provider, program, {
        depositUsdc: 5,
        policy: {
          dailyCap: dollars(5),
          perTxCap: dollars(0.5),
          stepUpThreshold: dollars(10),
          expiryTs: new BN(nowSec + 3600), // 1h in the future
        },
      });
      try {
        await program.methods
          .expirePolicy()
          .accountsStrict({
            caller: bundle.owner.publicKey,
            vault: bundle.vault,
            policy: bundle.policy,
          })
          .signers([bundle.owner])
          .rpc();
        assert.fail('expected ErrNotExpired');
      } catch (e: any) {
        expect(errString(e)).to.match(/ErrNotExpired/);
      }
    });
  });
});

