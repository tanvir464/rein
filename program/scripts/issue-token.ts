/**
 * Sign an auth challenge with the dev wallet and POST it to /v1/auth/issue.
 * Reads the seeded vault from .devnet-seed.json, builds the challenge string,
 * signs with ed25519, posts to wrangler dev, prints the resulting token + a
 * curl example for /v1/me.
 *
 * Run via:
 *   ANCHOR_WALLET=$HOME/.config/solana/id.json npx tsx program/scripts/issue-token.ts
 *
 * Optional env:
 *   SERVICE_URL — defaults to http://127.0.0.1:8787
 */
import * as anchor from '@coral-xyz/anchor';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVICE_URL = process.env.SERVICE_URL ?? 'http://127.0.0.1:8787';

async function main() {
  const provider = anchor.AnchorProvider.env();
  const owner = (provider.wallet as anchor.Wallet).payer;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const cachePath = path.resolve(here, '..', '.devnet-seed.json');
  if (!fs.existsSync(cachePath)) {
    throw new Error('no seeded vault — run `npx tsx scripts/seed-devnet.ts` first');
  }
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as { vault: string };
  const vault = cache.vault;

  const ts = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(8);
  crypto.getRandomValues(nonceBytes);
  const nonceHex = Array.from(nonceBytes)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
  const message = `rein-auth:v1:${vault}:${ts}:${nonceHex}`;

  const sig = nacl.sign.detached(new TextEncoder().encode(message), owner.secretKey);
  const signatureB58 = bs58.encode(sig);

  console.log('vault:    ', vault);
  console.log('owner:    ', owner.publicKey.toBase58());
  console.log('message:  ', message);
  console.log('signature:', signatureB58);
  console.log();
  console.log('POST', `${SERVICE_URL}/v1/auth/issue`);

  const res = await fetch(`${SERVICE_URL}/v1/auth/issue`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      vault,
      message,
      signature: signatureB58,
      scopes: ['spend', 'read'],
    }),
  });
  const body = await res.text();
  console.log(`HTTP ${res.status}`, body);
  if (!res.ok) process.exit(1);

  const issued = JSON.parse(body) as { token: string; kid: string; expiresAt: number };
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('TOKEN ISSUED.');
  console.log('kid:       ', issued.kid);
  console.log('expiresAt: ', new Date(issued.expiresAt * 1000).toISOString());
  console.log('\nUse it:');
  console.log(`  curl -H "Authorization: Bearer ${issued.token}" ${SERVICE_URL}/v1/me`);
  console.log('──────────────────────────────────────────────────────────────\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
