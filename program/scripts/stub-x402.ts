/**
 * Tiny x402 endpoint stub for testing REIN's x402 client end-to-end.
 *
 * GET /api/quote
 *   - Without `X-Payment` header → 402 with payment_requirements pointing at
 *     a Solana USDC recipient (loaded from .devnet-seed.json).
 *   - With `X-Payment` header → 200 with a sample JSON body (the "paid content").
 *
 * Run via:  npx tsx program/scripts/stub-x402.ts
 *           (listens on 0.0.0.0:9999 by default)
 *
 * The recipient is the same USDC ATA seeded by seed-devnet.ts. Override via
 * STUB_RECIPIENT env var.
 */
import { createServer } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = parseInt(process.env.PORT ?? '9999', 10);
const here = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.resolve(here, '..', '.devnet-seed.json');

let recipient = process.env.STUB_RECIPIENT;
let mint = process.env.STUB_MINT;

if (!recipient || !mint) {
  if (!fs.existsSync(cachePath)) {
    console.error('No seed cache and no STUB_RECIPIENT/STUB_MINT env vars.');
    console.error('Run seed-devnet.ts first or set both env vars.');
    process.exit(1);
  }
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  // The seed script doesn't write the recipient ATA back to cache; for the stub
  // we point at a hardcoded recipient that the seed script created.
  // Actually best path: pass via env. Fall back to a known one for convenience.
  recipient = recipient ?? '2Z7gtudSk61G57sLXWQietd9ubvZrJPRrgaYd4mDwMp3';
  mint = mint ?? cache.mint;
}

console.log(`stub-x402 listening on http://0.0.0.0:${PORT}`);
console.log(`  recipient ATA: ${recipient}`);
console.log(`  asset (mint):  ${mint}`);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const xPayment = req.headers['x-payment'];

  if (url.pathname !== '/api/quote') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }

  if (!xPayment) {
    const body = {
      x402Version: 1,
      facilitator: 'coinbase',
      accepts: [
        {
          scheme: 'exact',
          network: 'solana-devnet',
          asset: mint,
          maxAmountRequired: '100000', // $0.10 micro-USDC
          payTo: recipient,
        },
      ],
    };
    res.writeHead(402, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
    return;
  }

  // Paid request — return the "content".
  const body = {
    quote: 'BTC: $73,420 (mock)',
    paidWith: xPayment,
    receipt: req.headers['x-rein-receipt'] ?? null,
    serverTs: new Date().toISOString(),
  };
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
});

server.listen(PORT, '0.0.0.0');
