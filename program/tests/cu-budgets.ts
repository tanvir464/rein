import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import { expect } from 'chai';

import { Rein } from '../target/types/rein';
import { createUsdcFixture } from './fixtures/usdc-mint';
import { fundedKeypair } from './fixtures/wallets';
import { defaultPolicyArgs, dollars } from './fixtures/policy';
import {
  currentDayBN,
  deriveCounterPda,
  derivePolicyPda,
  deriveReceiptPda,
  deriveVaultPda,
  nextNonce,
  setupSpendBundle,
  ZERO_HASH,
} from './fixtures/spend';
import { deriveBlocklistPda } from './fixtures/blocklist';
import { deriveStepUpPda } from './fixtures/stepup';

const PROGRAM_ID_STR = '2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj';

// Targets calibrated against measured values (see program/README.md `### Compute budgets`)
// with ~30% headroom so cosmetic refactors don't break the build.
const TARGETS_CU: Record<string, number> = {
  init_vault: 70_000,      // observed 54_896 (CPI to associated_token_program is the heavy part)
  deposit: 45_000,         // observed 32_845 (transfer_checked CPI)
  init_policy: 35_000,     // observed 24_433
  update_policy: 15_000,   // observed 8_546
  spend: 60_000,           // observed 44_232 (still well under the F3 spec's 80k bar)
  request_step_up: 20_000, // observed 13_071
  approve_step_up: 10_000, // observed 6_120
  pause: 12_000,           // observed 7_797
  dispute: 15_000,         // observed 9_407
  expire_policy: 12_000,   // observed 7_722
};
const REGRESSION_MARGIN = 1.2; // 20% above target → fail

async function measureCu(
  provider: anchor.AnchorProvider,
  ix: string,
  sig: string,
): Promise<number | null> {
  // tx may not be indexed at the connection's commitment level immediately after .rpc() resolves;
  // poll a few times before giving up.
  let logs: string[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    const tx = await provider.connection.getTransaction(sig, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    logs = tx?.meta?.logMessages ?? [];
    if (logs.length > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  // Match the CU line for our program. Format: "Program <id> consumed N of M compute units".
  const re = /consumed (\d+) of \d+ compute units/;
  for (const line of logs) {
    if (!line.includes(PROGRAM_ID_STR)) continue;
    const m = line.match(re);
    if (m) return parseInt(m[1]!, 10);
  }
  console.warn(`[cu] could not parse CU for ${ix}; last logs:\n  ${logs.join('\n  ')}`);
  return null;
}

describe('rein — F7 compute-unit budgets', () => {
  let provider: anchor.AnchorProvider;
  let program: Program<Rein>;
  const measured: Record<string, number> = {};

  before(() => {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    program = anchor.workspace.rein as Program<Rein>;
  });

  after(() => {
    console.log('\n[CU REPORT]');
    console.log('| Instruction | Measured | Target | Margin |');
    console.log('|---|---|---|---|');
    for (const [ix, target] of Object.entries(TARGETS_CU)) {
      const m = measured[ix];
      if (m === undefined) {
        console.log(`| ${ix} | (skipped) | ${target} | — |`);
      } else {
        const diff = target - m;
        console.log(`| ${ix} | ${m} | ${target} | ${diff >= 0 ? '+' : ''}${diff} |`);
      }
    }
  });

  it('measures init_vault, deposit, init_policy, update_policy, spend, request_step_up, approve_step_up, pause, dispute, expire_policy', async function () {
    this.timeout(180_000);

    // -- init_vault + deposit + init_policy via setupSpendBundle, but call manually so we can capture sigs --
    const owner = await fundedKeypair(provider, 5);
    const fixture = await createUsdcFixture(provider, owner, 50);
    const [vault, vaultBump] = deriveVaultPda(owner.publicKey, program.programId);
    const vaultAta = await getAssociatedTokenAddress(fixture.mint, vault, true);

    let sig = await program.methods
      .initVault()
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        usdcMint: fixture.mint,
        vaultUsdcAta: vaultAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([owner])
      .rpc();
    measured.init_vault = (await measureCu(provider, 'init_vault', sig)) ?? -1;

    sig = await program.methods
      .deposit(new BN(dollars(20).toString()))
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        usdcMint: fixture.mint,
        ownerUsdcAta: fixture.payerAta.address,
        vaultUsdcAta: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
    measured.deposit = (await measureCu(provider, 'deposit', sig)) ?? -1;

    const [policy] = derivePolicyPda(vault, program.programId);
    const [blocklist] = deriveBlocklistPda(vault, program.programId);
    const policyArgs = defaultPolicyArgs({
      dailyCap: dollars(10),
      perTxCap: dollars(1),
      stepUpThreshold: dollars(0.5),
      // expiry in the near future so we can test expire_policy at the end
      expiryTs: new BN(Math.floor(Date.now() / 1000) + 30),
    });
    sig = await program.methods
      .initPolicy(policyArgs as any)
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        policy,
        blocklist,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    measured.init_policy = (await measureCu(provider, 'init_policy', sig)) ?? -1;

    sig = await program.methods
      .updatePolicy(
        defaultPolicyArgs({
          dailyCap: dollars(10),
          perTxCap: dollars(1),
          stepUpThreshold: dollars(0.5),
          expiryTs: new BN(Math.floor(Date.now() / 1000) + 30),
        }) as any,
      )
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        policy,
      })
      .signers([owner])
      .rpc();
    measured.update_policy = (await measureCu(provider, 'update_policy', sig)) ?? -1;

    // Recipient ATA.
    const rWallet = await fundedKeypair(provider, 1);
    const recipientAta = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        owner,
        fixture.mint,
        rWallet.publicKey,
      )
    ).address;

    // spend (within step-up threshold, so no step-up needed)
    const day = currentDayBN();
    const spendNonce = nextNonce();
    const [counterPda] = deriveCounterPda(vault, day, program.programId);
    const [receiptPda] = deriveReceiptPda(vault, spendNonce, program.programId);
    sig = await program.methods
      .spend({
        amount: new BN(dollars(0.3).toString()),
        nonce: spendNonce,
        x402UrlHash: ZERO_HASH,
        day,
      } as any)
      .accountsStrict({
        payer: owner.publicKey,
        vault,
        policy,
        usdcMint: fixture.mint,
        vaultUsdcAta: vaultAta,
        recipientUsdcAta: recipientAta,
        dailyCounter: counterPda,
        receipt: receiptPda,
        blocklist,
        stepUpRequest: null,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
    measured.spend = (await measureCu(provider, 'spend', sig)) ?? -1;

    // request_step_up + approve_step_up
    const stepUpNonce = nextNonce();
    const [stepUpPda] = deriveStepUpPda(vault, stepUpNonce, program.programId);
    sig = await program.methods
      .requestStepUp({
        amount: new BN(dollars(0.8).toString()),
        recipient: recipientAta,
        nonce: stepUpNonce,
        ttlSecs: new BN(300),
      } as any)
      .accountsStrict({
        payer: owner.publicKey,
        vault,
        policy,
        stepUpRequest: stepUpPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    measured.request_step_up = (await measureCu(provider, 'request_step_up', sig)) ?? -1;

    sig = await program.methods
      .approveStepUp()
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        stepUpRequest: stepUpPda,
      })
      .signers([owner])
      .rpc();
    measured.approve_step_up = (await measureCu(provider, 'approve_step_up', sig)) ?? -1;

    // pause
    sig = await program.methods
      .pause({ paused: true } as any)
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        policy,
      })
      .signers([owner])
      .rpc();
    measured.pause = (await measureCu(provider, 'pause', sig)) ?? -1;

    // unpause so dispute's preconditions don't matter (dispute reads receipt, not policy.paused)
    await program.methods
      .pause({ paused: false } as any)
      .accountsStrict({ owner: owner.publicKey, vault, policy })
      .signers([owner])
      .rpc();

    // dispute
    sig = await program.methods
      .dispute({ nonce: spendNonce } as any)
      .accountsStrict({
        owner: owner.publicKey,
        vault,
        receipt: receiptPda,
        blocklist,
      })
      .signers([owner])
      .rpc();
    measured.dispute = (await measureCu(provider, 'dispute', sig)) ?? -1;

    // expire_policy — wait until on-chain Clock is past expiry_ts.
    // Real wall-clock can have drifted past, but the validator's Clock sysvar may lag a bit.
    const policyAcct = await program.account.policy.fetch(policy);
    const expiryTs = policyAcct.expiryTs.toNumber();
    for (let i = 0; i < 60; i++) {
      const slot = await provider.connection.getSlot('confirmed');
      const clockTs = await provider.connection.getBlockTime(slot);
      if (clockTs !== null && clockTs > expiryTs) break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    sig = await program.methods
      .expirePolicy()
      .accountsStrict({
        caller: owner.publicKey,
        vault,
        policy,
      })
      .signers([owner])
      .rpc();
    measured.expire_policy = (await measureCu(provider, 'expire_policy', sig)) ?? -1;

    // Regression gate.
    for (const [ix, target] of Object.entries(TARGETS_CU)) {
      const m = measured[ix];
      if (m === undefined || m < 0) continue; // skipped or unparseable, don't fail here
      expect(
        m,
        `${ix} consumed ${m} CU; target ${target} (×${REGRESSION_MARGIN} = ${Math.round(target * REGRESSION_MARGIN)})`,
      ).to.be.lessThan(Math.round(target * REGRESSION_MARGIN));
    }
  });
});
