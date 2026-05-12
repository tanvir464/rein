'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronRight, Wallet, Coins, ShieldCheck, Terminal,
  ArrowRight, AlertCircle, Loader2, ExternalLink, Copy,
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  buildInitVaultIx,
  buildInitPolicyIx,
  buildDepositIx,
  deriveVaultPda,
} from '@rein/sdk';

import { ReinMark, ReinWordmark } from '../../components/rein-mark';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { CodeBlock } from '../../components/code-block';
import { ThemeToggle } from '../../components/theme-toggle';
import { useAuth } from '../../components/auth-provider';
import { getConfig, listVaults, postFaucet, type Config, type FaucetError } from '../../lib/api';
import { truncate } from '../../lib/format';
import { cn } from '../../lib/cn';

type Step = 0 | 1 | 2 | 3;

type Preset = {
  id: 'starter' | 'pro' | 'team';
  name: string;
  body: string;
  daily: number;     // ui USDC
  perTx: number;     // ui USDC
  stepUp: number;    // ui USDC
  suited: string;
  recommended?: boolean;
};

const PRESETS: Preset[] = [
  {
    id: 'starter',
    name: 'Starter',
    body: 'Daily $25 · per-tx $5 · step-up over $5',
    daily: 25, perTx: 5, stepUp: 5,
    suited: 'Single coding agent or hobby project',
  },
  {
    id: 'pro',
    name: 'Pro',
    body: 'Daily $100 · per-tx $25 · step-up over $10',
    daily: 100, perTx: 25, stepUp: 10,
    suited: 'Production agents, multi-runtime',
    recommended: true,
  },
  {
    id: 'team',
    name: 'Team',
    body: 'Daily $500 · per-tx $100 · step-up over $50',
    daily: 500, perTx: 100, stepUp: 50,
    suited: 'Crews and treasury ops',
  },
];

const DEPOSIT_UI = 25; // USDC moved into the vault during onboarding
// init_vault (~0.003 SOL rent) + init_policy (~0.007 SOL rent) + ~3 tx fees.
// Set the floor higher than the strict minimum so a tiny remaining balance
// doesn't pass the gate and then fail on the second tx.
const MIN_SOL_FOR_INIT = 0.05;

// ─── Tx helper ───────────────────────────────────────────────────────────

async function sendIxs(
  conn: Connection,
  feePayer: PublicKey,
  ixs: TransactionInstruction[],
  signTx: (tx: Transaction) => Promise<Transaction>,
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer, blockhash, lastValidBlockHeight });
  for (const ix of ixs) tx.add(ix);
  const signed = await signTx(tx);
  const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// ─── Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { connection: walletConnection } = useConnection();
  const { publicKey, signTransaction, connected, connecting, wallets, select, connect, wallet, disconnect } = useWallet();
  const { auth, signIn } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [config, setConfig] = useState<Config | null>(null);
  const [preset, setPreset] = useState<Preset['id']>('pro');
  const [vaultPk, setVaultPk] = useState<string | null>(null);
  const [policyTx, setPolicyTx] = useState<string | null>(null);
  const [depositTx, setDepositTx] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'connecting' | 'vault' | 'fund' | 'policy' | 'finish'>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  // When the connected wallet already has a vault on-chain bound to a
  // *different* USDC mint than `config.usdcMint`, deposit will fail with a
  // raw Anchor `AccountNotInitialized` error (the ATA for the new mint was
  // never created). Detect this up-front and block the flow with a clear
  // message + a disconnect-and-try-again button.
  const [mintMismatch, setMintMismatch] = useState<{
    existingMint: string;
    vault: string;
  } | null>(null);
  // Owner-wallet SOL balance + airdrop UX. init_vault + init_policy together
  // consume ~0.01 SOL of rent; fresh Phantom wallets ship with 0 lamports, so
  // we surface this up-front instead of letting users hit the Solana runtime
  // error "Attempt to debit an account but found no record of a prior credit".
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [airdropping, setAirdropping] = useState(false);
  const [airdropError, setAirdropError] = useState<string | null>(null);
  // Guards SSR/hydration mismatches in inputs that read window state.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Already authed? Bypass — they have a vault and a session.
  useEffect(() => {
    if (auth) {
      router.replace('/app');
    }
  }, [auth, router]);

  // Fetch worker config (USDC mint, programId, faucet availability).
  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  // Auto-advance from step 0 once a wallet is connected.
  useEffect(() => {
    if (connected && publicKey && step === 0) {
      setStep(1);
      setError(null);
    }
  }, [connected, publicKey, step]);

  // Pre-derive vault pubkey for display once wallet is connected.
  const derivedVault = useMemo(() => {
    if (!publicKey) return null;
    try {
      const [pda] = deriveVaultPda(publicKey);
      return pda.toBase58();
    } catch {
      return null;
    }
  }, [publicKey]);

  // Use the worker-supplied RPC if we have it (Helius if available); fall
  // back to the wallet-adapter's connection.
  const conn = useMemo(() => {
    if (config?.rpcUrl) return new Connection(config.rpcUrl, 'confirmed');
    return walletConnection;
  }, [config?.rpcUrl, walletConnection]);

  // Poll owner SOL balance every 10s while connected. Used to surface the
  // "you have 0 SOL, you need an airdrop" trap before tx submission.
  useEffect(() => {
    if (!publicKey) {
      setSolBalance(null);
      return;
    }
    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const lamports = await conn.getBalance(publicKey);
        if (!cancelled) setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        // ignore — UI just shows "—"
      }
    };
    fetchBalance();
    const t = setInterval(fetchBalance, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [publicKey, conn]);

  const requestAirdrop = async () => {
    if (!publicKey) return;
    setAirdropError(null);
    setAirdropping(true);
    try {
      const sig = await conn.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
      await conn.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed',
      );
      const lamports = await conn.getBalance(publicKey);
      setSolBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Public devnet faucet is heavily rate-limited; point at the working alternative.
      setAirdropError(
        /429|rate|airdrop request limit/i.test(msg)
          ? 'Devnet RPC rate-limited the airdrop. Use https://faucet.solana.com — paste the address above.'
          : msg,
      );
    } finally {
      setAirdropping(false);
    }
  };

  // Auto-run mint-mismatch pre-flight whenever the wallet or config changes.
  // Catches the "wallet has a stale vault from a previous mint" trap before
  // the user clicks Initialize/Fund.
  useEffect(() => {
    if (!publicKey || !config?.usdcMint) {
      setMintMismatch(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const existing = await listVaults(publicKey.toBase58());
      if (cancelled) return;
      const v = existing[0];
      if (v && v.usdcMint !== config.usdcMint) {
        setMintMismatch({ existingMint: v.usdcMint ?? '(unknown)', vault: v.id });
      } else {
        setMintMismatch(null);
      }
    })();
    return () => { cancelled = true; };
  }, [publicKey, config?.usdcMint]);

  const onDisconnectAndReset = async () => {
    setError(null);
    setProgress(null);
    setMintMismatch(null);
    setVaultPk(null);
    setDepositTx(null);
    setPolicyTx(null);
    try {
      await disconnect();
    } catch {
      // ignore — some adapters throw on already-disconnected
    }
    setStep(0);
  };

  // ─── Step actions ──────────────────────────────────────────────────────

  const onConnect = async () => {
    setError(null);
    setBusy('connecting');
    try {
      let activeAdapter = wallet?.adapter ?? null;
      if (!activeAdapter) {
        const ready = wallets.find((w) => w.readyState === 'Installed');
        if (!ready) throw new Error('Install Phantom, Solflare, or Backpack and reload.');
        select(ready.adapter.name);
        activeAdapter = ready.adapter;
      }
      if (!activeAdapter.connected) {
        await activeAdapter.connect();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onInitVault = async () => {
    if (!publicKey || !signTransaction) {
      setError('Wallet not ready');
      return;
    }
    if (!config?.usdcMint) {
      setError('USDC mint not configured on the worker (set USDC_MINT in wrangler.toml).');
      return;
    }
    if (mintMismatch) return; // banner shown; user must disconnect first
    if (solBalance !== null && solBalance < MIN_SOL_FOR_INIT) {
      setError(
        `Wallet has ${solBalance.toFixed(4)} SOL — need at least ${MIN_SOL_FOR_INIT} SOL to cover init_vault rent. Request an airdrop above.`,
      );
      return;
    }
    setError(null);
    setBusy('vault');
    setProgress('Checking on-chain state…');
    try {
      // Re-verify on-chain state right before submitting (the effect-driven
      // pre-flight may be stale if config just changed).
      const existing = await listVaults(publicKey.toBase58());
      const existingVault = existing[0];
      if (existingVault) {
        if (existingVault.usdcMint !== config.usdcMint) {
          setMintMismatch({ existingMint: existingVault.usdcMint ?? '(unknown)', vault: existingVault.id });
          return;
        }
        // Existing vault with the right mint — skip init, reuse.
        setVaultPk(existingVault.id);
        setProgress('Vault already exists — reusing.');
        return;
      }

      setProgress('Initializing vault on-chain…');
      const mint = new PublicKey(config.usdcMint);
      const programId = new PublicKey(config.programId);
      const { ix, vault } = await buildInitVaultIx({
        owner: publicKey,
        usdcMint: mint,
        programId,
      });
      const sig = await sendIxs(conn, publicKey, [ix], signTransaction);
      setVaultPk(vault.toBase58());
      setProgress(`Vault created · ${truncate(sig, 6, 6)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Race: another tab/session may have initialized between pre-flight and
      // submission. Refetch to figure out which case we're in.
      if (/already in use|custom program error: 0x0/i.test(msg) && publicKey) {
        const existing = await listVaults(publicKey.toBase58());
        const existingVault = existing[0];
        if (existingVault && existingVault.usdcMint !== config.usdcMint) {
          setMintMismatch({ existingMint: existingVault.usdcMint ?? '(unknown)', vault: existingVault.id });
        } else {
          const [vault] = deriveVaultPda(publicKey);
          setVaultPk(vault.toBase58());
          setProgress('Vault already exists — reusing.');
        }
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const onFund = async () => {
    if (!publicKey || !signTransaction) return;
    if (!vaultPk) {
      setError('Initialize the vault first.');
      return;
    }
    if (!config?.usdcMint) return;
    if (mintMismatch) return; // banner is showing
    if (!config.faucetEnabled) {
      setError(
        'Faucet not enabled on this worker. Set MINT_AUTHORITY_KEYPAIR_BASE58 to fund automatically, or top up the owner USDC ATA manually.',
      );
      return;
    }
    setError(null);
    setBusy('fund');
    try {
      const mint = new PublicKey(config.usdcMint);
      const vault = new PublicKey(vaultPk);

      setProgress('Faucet → owner USDC ATA…');
      const faucetRes = await postFaucet(publicKey.toBase58());
      if ('error' in faucetRes) {
        const fe = faucetRes as FaucetError;
        throw new Error(fe.hint ? `${fe.error} — ${fe.hint}` : fe.error);
      }

      setProgress(`Depositing $${DEPOSIT_UI} USDC into vault…`);
      const ownerAta = getAssociatedTokenAddressSync(mint, publicKey);
      const vaultAta = getAssociatedTokenAddressSync(mint, vault, true);
      const ix = await buildDepositIx({
        owner: publicKey,
        vault,
        usdcMint: mint,
        ownerUsdcAta: ownerAta,
        vaultUsdcAta: vaultAta,
        amount: BigInt(DEPOSIT_UI * 1_000_000),
      });
      const sig = await sendIxs(conn, publicKey, [ix], signTransaction);
      setDepositTx(sig);
      setProgress(`Funded · ${truncate(sig, 6, 6)}`);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onInitPolicy = async () => {
    if (!publicKey || !signTransaction || !vaultPk || !config) return;
    setError(null);
    setBusy('policy');
    setProgress('Submitting policy on-chain…');
    try {
      const programId = new PublicKey(config.programId);
      const p = PRESETS.find((x) => x.id === preset)!;
      const { ix } = await buildInitPolicyIx({
        owner: publicKey,
        vault: new PublicKey(vaultPk),
        args: {
          dailyCap: BigInt(p.daily * 1_000_000),
          perTxCap: BigInt(p.perTx * 1_000_000),
          stepUpThreshold: BigInt(p.stepUp * 1_000_000),
          expiryTs: 0n,
          paused: false,
          allowlist: [],
        },
        programId,
      });
      const sig = await sendIxs(conn, publicKey, [ix], signTransaction);
      setPolicyTx(sig);
      setProgress(`Policy v1 set · ${truncate(sig, 6, 6)}`);
      setStep(3);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already in use/i.test(msg)) {
        setProgress('Policy already set — moving on.');
        setStep(3);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  };

  const onFinish = async () => {
    setError(null);
    setBusy('finish');
    try {
      await signIn();
      // signIn updates auth via context; effect above will redirect.
      // As a fallback in case state hasn't propagated yet:
      router.replace('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  const installCmd = vaultPk
    ? `npx @rein/cli init --runtime mcp \\
  --vault ${vaultPk} \\
  --policy ${preset}`
    : `npx @rein/cli init --runtime mcp --policy ${preset}`;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header
        className="flex items-center px-6 border-b border-[var(--border)]"
        style={{ height: 'var(--header-height)' }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <ReinMark size={26} />
          <ReinWordmark size={16} />
        </Link>
        <span className="ml-4 text-sm text-[var(--muted)]">Onboarding</span>
        {connected && publicKey && (
          <span
            className="ml-3 hidden sm:inline-flex items-center gap-1.5 px-2.5 h-7 rounded-[var(--radius-pill)] border text-[12px] font-mono"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
            {truncate(publicKey.toBase58(), 4, 4)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" variant="ghost">I already have a vault</Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto px-6 py-10 w-full" style={{ maxWidth: 'var(--prose)' }}>
        <Stepper step={step} />

        {!config && (
          <p className="mt-6 text-[13px] text-[var(--muted)] flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" /> Loading worker config…
          </p>
        )}
        {config && !config.usdcMint && (
          <ErrorBanner>
            Worker has no USDC mint configured. Set <code>USDC_MINT</code> in
            <code> service/wrangler.toml</code> (use the value from
            <code> program/.devnet-seed.json</code>).
          </ErrorBanner>
        )}
        {config && !config.faucetEnabled && config.usdcMint && (
          <InfoBanner>
            Faucet is disabled on this worker. Onboarding needs
            <code> MINT_AUTHORITY_KEYPAIR_BASE58</code> set
            (<code>wrangler secret put MINT_AUTHORITY_KEYPAIR_BASE58</code> with the
            wallet that ran <code>seed-devnet.ts</code>).
          </InfoBanner>
        )}

        <div className="mt-10">
          {/* ── Step 0: Connect wallet ─────────────────────────────────── */}
          {step === 0 && (
            <StepWrap
              icon={Wallet}
              title="Connect a wallet"
              body="Phantom, Solflare, and Backpack are auto-detected. We never see your seed phrase — only message signatures."
            >
              {!mounted ? (
                <Card className="p-5 text-sm text-[var(--muted)]">
                  Detecting wallets…
                </Card>
              ) : wallets.length === 0 ? (
                <Card className="p-5 text-sm text-[var(--muted)]">
                  No Solana wallet detected. Install one and reload — most users
                  pick{' '}
                  <a
                    href="https://phantom.app/download"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--accent-700)] hover:underline inline-flex items-center gap-1"
                  >
                    Phantom <ExternalLink size={11} />
                  </a>
                  .
                </Card>
              ) : (
                <div className="grid sm:grid-cols-3 gap-3">
                  {wallets.map((w) => (
                    <button
                      key={w.adapter.name}
                      onClick={async () => {
                        select(w.adapter.name);
                        await new Promise((r) => setTimeout(r, 50));
                        await onConnect();
                      }}
                      disabled={busy !== null || w.readyState !== 'Installed'}
                      className={cn(
                        'flex flex-col items-start gap-1 p-4 rounded-[var(--radius-lg)] border bg-[var(--bg-elevated)] text-left',
                        'hover:border-[var(--accent-700)] disabled:opacity-50 disabled:hover:border-[var(--border)]',
                        wallet?.adapter.name === w.adapter.name ? 'border-[var(--accent-700)]' : 'border-[var(--border)]',
                      )}
                      style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold">{w.adapter.name}</span>
                        {w.readyState === 'Installed' ? (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-pill)]"
                            style={{ backgroundColor: 'var(--accent-soft-bg)', color: 'var(--accent-soft-fg)' }}
                          >
                            INSTALLED
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--muted)]">{w.readyState}</span>
                        )}
                      </div>
                      <span className="text-[12px] text-[var(--muted)]">{w.adapter.url ?? 'wallet adapter'}</span>
                    </button>
                  ))}
                </div>
              )}
              {(busy === 'connecting' || connecting) && (
                <p className="text-[13px] text-[var(--muted)] mt-4 inline-flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" /> Approving in your wallet…
                </p>
              )}
              {error && <ErrorBanner>{error}</ErrorBanner>}
            </StepWrap>
          )}

          {/* ── Step 1: Init vault + fund ──────────────────────────────── */}
          {step === 1 && (
            <StepWrap
              icon={Coins}
              title="Initialize and fund your vault"
              body="One transaction creates the on-chain vault. We then drop test USDC and deposit some so your agent has spending money."
            >
              {mintMismatch ? (
                <MintMismatchCard
                  expectedMint={config?.usdcMint ?? '—'}
                  existingMint={mintMismatch.existingMint}
                  vault={mintMismatch.vault}
                  onDisconnect={onDisconnectAndReset}
                />
              ) : (
                <>
                  <SolBalanceCard
                    owner={publicKey?.toBase58() ?? null}
                    balance={solBalance}
                    minimum={MIN_SOL_FOR_INIT}
                    airdropping={airdropping}
                    error={airdropError}
                    onAirdrop={requestAirdrop}
                  />
                  <Card className="p-5 flex flex-col gap-4">
                    <Row label="Owner" value={publicKey ? truncate(publicKey.toBase58(), 6, 6) : '—'} mono />
                    <Row label="Vault PDA" value={derivedVault ? truncate(derivedVault, 6, 6) : '—'} mono />
                    <Row label="USDC mint" value={config?.usdcMint ? truncate(config.usdcMint, 6, 6) : '—'} mono />

                    <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <StepDot done={!!vaultPk} active={!vaultPk} />
                        <span className="flex-1 text-[14px]">Initialize vault on-chain</span>
                        <Button
                          size="sm"
                          onClick={onInitVault}
                          disabled={busy !== null || !!vaultPk || !config?.usdcMint || (solBalance !== null && solBalance < MIN_SOL_FOR_INIT)}
                          loading={busy === 'vault'}
                        >
                          {vaultPk ? 'Done' : 'Initialize'}
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <StepDot done={!!depositTx} active={!!vaultPk && !depositTx} />
                        <span className="flex-1 text-[14px]">
                          Faucet 50 USDC + deposit ${DEPOSIT_UI} into vault
                        </span>
                        <Button
                          size="sm"
                          onClick={onFund}
                          disabled={busy !== null || !vaultPk || !!depositTx || !config?.faucetEnabled}
                          loading={busy === 'fund'}
                        >
                          {depositTx ? 'Done' : 'Fund'}
                        </Button>
                      </div>
                    </div>

                    {progress && (
                      <p className="text-[12px] text-[var(--muted)] inline-flex items-center gap-2">
                        {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} color="var(--success)" />}
                        {progress}
                      </p>
                    )}
                  </Card>

                  {error && <ErrorBanner>{error}</ErrorBanner>}
                </>
              )}
            </StepWrap>
          )}

          {/* ── Step 2: Pick policy preset ─────────────────────────────── */}
          {step === 2 && (
            <StepWrap
              icon={ShieldCheck}
              title="Pick a policy preset"
              body="On-chain spending rules your agent cannot bypass. You can edit any rule afterwards in Policy → Edit."
            >
              <div className="flex flex-col gap-3">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    disabled={busy !== null}
                    className={cn(
                      'p-5 rounded-[var(--radius-lg)] border bg-[var(--bg-elevated)] text-left flex items-start gap-4 disabled:opacity-50',
                      preset === p.id ? 'border-[var(--accent-700)]' : 'border-[var(--border)]',
                    )}
                    style={{ transition: 'border-color var(--dur-instant) var(--ease-snap)' }}
                  >
                    <div
                      className="h-5 w-5 mt-0.5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: '2px solid',
                        borderColor: preset === p.id ? 'var(--accent-700)' : 'var(--gray-500)',
                      }}
                    >
                      {preset === p.id && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: 'var(--accent-700)' }}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        {p.recommended && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-pill)]"
                            style={{ backgroundColor: 'var(--accent-soft-bg)', color: 'var(--accent-soft-fg)' }}
                          >
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-[var(--muted)] mt-0.5">{p.body}</div>
                      <div className="text-[12px] text-[var(--muted)] mt-1.5">{p.suited}</div>
                    </div>
                  </button>
                ))}
              </div>

              {progress && (
                <p className="text-[12px] text-[var(--muted)] mt-4 inline-flex items-center gap-2">
                  {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} color="var(--success)" />}
                  {progress}
                </p>
              )}

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <div className="flex justify-end mt-5">
                <Button onClick={onInitPolicy} loading={busy === 'policy'} disabled={busy !== null}>
                  {policyTx ? 'Continue' : 'Submit policy on-chain'} <ArrowRight size={14} />
                </Button>
              </div>
            </StepWrap>
          )}

          {/* ── Step 3: Done ───────────────────────────────────────────── */}
          {step === 3 && (
            <StepWrap
              icon={Terminal}
              title="Drop into your runtime"
              body="One command wires the vault into Claude Code, Cursor, Claude Desktop, or any MCP host. Your agent can now spend under policy."
            >
              <Card className="p-5 flex flex-col gap-3 mb-4">
                <Row label="Vault" value={vaultPk ? truncate(vaultPk, 8, 8) : '—'} mono copy={vaultPk ?? undefined} />
                <Row label="Policy preset" value={preset} />
                {policyTx && (
                  <Row
                    label="Policy tx"
                    value={truncate(policyTx, 6, 6)}
                    mono
                    explorer={`https://explorer.solana.com/tx/${policyTx}?cluster=${config?.cluster ?? 'devnet'}`}
                  />
                )}
                {depositTx && (
                  <Row
                    label="Deposit tx"
                    value={truncate(depositTx, 6, 6)}
                    mono
                    explorer={`https://explorer.solana.com/tx/${depositTx}?cluster=${config?.cluster ?? 'devnet'}`}
                  />
                )}
              </Card>

              <CodeBlock code={installCmd} language="bash" />

              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-[13px]">
                {['mcp', 'langchain', 'openai', 'vercel-ai', 'python', 'cli'].map((r) => (
                  <div
                    key={r}
                    className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-elevated)]"
                  >
                    <Check size={14} color="var(--success)" />
                    <span className="font-mono text-[12px]">--runtime {r}</span>
                  </div>
                ))}
              </div>

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <div className="flex justify-end mt-6">
                <Button onClick={onFinish} loading={busy === 'finish'} disabled={busy !== null}>
                  Sign in & open dashboard <ArrowRight size={14} />
                </Button>
              </div>
            </StepWrap>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small UI bits ───────────────────────────────────────────────────────

function Stepper({ step }: { step: Step }) {
  const labels = ['Wallet', 'Fund', 'Policy', 'Install'];
  return (
    <ol className="flex items-center gap-2 text-[13px]">
      {labels.map((l, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className="h-6 w-6 rounded-full flex items-center justify-center text-[12px] font-semibold"
              style={{
                backgroundColor: done ? 'var(--accent-700)' : active ? 'var(--bg)' : 'var(--bg-elevated)',
                color: done ? 'white' : active ? 'var(--accent-900)' : 'var(--muted)',
                border: active ? '2px solid var(--accent-700)' : `1px solid var(--border)`,
              }}
            >
              {done ? <Check size={12} /> : i + 1}
            </span>
            <span className={active ? 'text-[var(--fg)] font-medium' : 'text-[var(--muted)]'}>{l}</span>
            {i < labels.length - 1 && <ChevronRight size={14} color="var(--gray-500)" />}
          </li>
        );
      })}
    </ol>
  );
}

function StepWrap({
  icon: Icon, title, body, children,
}: {
  icon: typeof Wallet;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fade-in">
      <div className="flex items-start gap-4 mb-6">
        <div
          className="flex items-center justify-center shrink-0"
          style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'var(--accent-soft-bg)', color: 'var(--accent-soft-fg)' }}
        >
          <Icon size={22} />
        </div>
        <div>
          <h2 className="m-0 text-[24px] font-semibold" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
          <p className="m-0 mt-1 text-[var(--muted)]">{body}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function StepDot({ done, active }: { done: boolean; active: boolean }) {
  return (
    <span
      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
      style={{
        backgroundColor: done ? 'var(--accent-700)' : active ? 'var(--bg)' : 'var(--bg-elevated)',
        color: done ? 'white' : 'var(--muted)',
        border: active ? '2px solid var(--accent-700)' : `1px solid var(--border)`,
      }}
    >
      {done ? <Check size={11} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? 'var(--accent-700)' : 'var(--gray-500)' }} />}
    </span>
  );
}

function Row({
  label, value, mono, copy, explorer,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: string;
  explorer?: string;
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="flex items-center gap-2">
        <span className={mono ? 'font-mono text-[12px]' : ''}>{value}</span>
        {copy && (
          <button
            onClick={() => navigator.clipboard.writeText(copy)}
            aria-label={`Copy ${label}`}
            className="text-[var(--muted)] hover:text-[var(--fg)]"
          >
            <Copy size={11} />
          </button>
        )}
        {explorer && (
          <a href={explorer} target="_blank" rel="noreferrer" className="text-[var(--muted)] hover:text-[var(--fg)]">
            <ExternalLink size={11} />
          </a>
        )}
      </span>
    </div>
  );
}

function SolBalanceCard({
  owner, balance, minimum, airdropping, error, onAirdrop,
}: {
  owner: string | null;
  balance: number | null;
  minimum: number;
  airdropping: boolean;
  error: string | null;
  onAirdrop: () => void | Promise<void>;
}) {
  const low = balance !== null && balance < minimum;
  const copy = async () => {
    if (owner) await navigator.clipboard.writeText(owner);
  };
  return (
    <Card
      className="p-4 flex flex-col gap-3 mb-3"
      style={{
        // Soft warning when low, neutral otherwise.
        background: low ? 'var(--tone-warning-bg)' : 'var(--bg-elevated)',
        borderColor: low ? 'var(--warning)' : 'var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: low ? 'rgba(255,255,255,0.5)' : 'var(--accent-soft-bg)',
            color: low ? 'var(--tone-warning-fg)' : 'var(--accent-soft-fg)',
          }}
        >
          {low ? <AlertCircle size={16} /> : <Coins size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Wallet SOL · pays tx fees + rent
          </div>
          <div className="tabular text-[18px] font-semibold leading-none mt-1">
            {balance === null ? '—' : `${balance.toFixed(4)} SOL`}
            {low && (
              <span className="ml-2 text-[12px] font-medium" style={{ color: 'var(--tone-warning-fg)' }}>
                · need ≥ {minimum} SOL
              </span>
            )}
          </div>
        </div>
        <Button
          size="sm"
          variant={low ? 'primary' : 'secondary'}
          loading={airdropping}
          disabled={airdropping || !owner}
          onClick={onAirdrop}
        >
          Airdrop 1 SOL
        </Button>
      </div>

      {low && (
        <div className="text-[12px] flex items-center gap-2 flex-wrap" style={{ color: 'var(--muted)' }}>
          <span>
            Or paste your address into
            {' '}
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--fg)] inline-flex items-center gap-1"
            >
              faucet.solana.com <ExternalLink size={11} />
            </a>
            :
          </span>
          <code className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
            {owner ? truncate(owner, 6, 6) : '—'}
          </code>
          <button
            onClick={copy}
            aria-label="Copy address"
            className="text-[var(--muted)] hover:text-[var(--fg)]"
          >
            <Copy size={11} />
          </button>
        </div>
      )}

      {error && (
        <div
          className="px-2.5 py-1.5 rounded-[var(--radius-md)] text-[12px] flex items-start gap-1.5"
          style={{ background: 'var(--tone-danger-bg)', color: 'var(--tone-danger-fg)' }}
        >
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span className="flex-1 break-all">{error}</span>
        </div>
      )}
    </Card>
  );
}

function MintMismatchCard({
  expectedMint, existingMint, vault, onDisconnect,
}: {
  expectedMint: string;
  existingMint: string;
  vault: string;
  onDisconnect: () => void | Promise<void>;
}) {
  return (
    <Card
      className="p-5 flex flex-col gap-4 border-2"
      style={{ borderColor: 'var(--warning)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-md shrink-0 flex items-center justify-center"
          style={{ backgroundColor: 'var(--tone-warning-bg)', color: 'var(--tone-warning-fg)' }}
        >
          <AlertCircle size={18} />
        </div>
        <div className="flex-1">
          <h3 className="m-0 text-[16px] font-semibold">This wallet already has a vault</h3>
          <p className="m-0 mt-1 text-[13px] text-[var(--muted)]">
            …and it's bound to a different USDC mint than the worker currently uses.
            On-chain vaults are 1:1 with the owner pubkey and can't be reinitialized,
            so this wallet can't continue onboarding. Use a fresh wallet to start clean.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-2 text-[13px]">
        <Row label="Existing vault" value={truncate(vault, 8, 8)} mono />
        <Row label="Existing vault's mint" value={truncate(existingMint, 8, 8)} mono />
        <Row label="Current worker mint" value={truncate(expectedMint, 8, 8)} mono />
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Button onClick={onDisconnect}>
          Disconnect & use a different wallet
        </Button>
        <Link href="/login">
          <Button variant="ghost">I&apos;ll sign in instead</Button>
        </Link>
      </div>

      <p className="text-[11px] text-[var(--muted)] m-0">
        Tip: in Phantom, click your avatar → <strong>Add / Connect Wallet → Create New Wallet</strong>.
        Then airdrop SOL: <code className="font-mono text-[11px]">solana airdrop 2 &lt;new-address&gt; --url https://api.devnet.solana.com</code>
      </p>
    </Card>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 mt-4 p-3 rounded-[var(--radius-md)] border text-[13px]"
      style={{
        borderColor: 'var(--tone-danger-bg)',
        background: 'var(--tone-danger-bg)',
        color: 'var(--tone-danger-fg)',
      }}
    >
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span className="flex-1">{children}</span>
    </div>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 mt-4 p-3 rounded-[var(--radius-md)] border text-[13px]"
      style={{
        borderColor: 'var(--tone-warning-bg)',
        background: 'var(--tone-warning-bg)',
        color: 'var(--tone-warning-fg)',
      }}
    >
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span className="flex-1">{children}</span>
    </div>
  );
}
