/**
 * Tiny webhook receiver that prints every event REIN dispatches to it.
 * Verifies the X-REIN-Signature HMAC if STUB_WEBHOOK_SECRET is set.
 *
 * Run via: npx tsx program/scripts/stub-webhook.ts (listens on 0.0.0.0:9998)
 */
import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';

const PORT = parseInt(process.env.PORT ?? '9998', 10);
const SECRET = process.env.STUB_WEBHOOK_SECRET;

const server = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const sigHeader = (req.headers['x-rein-signature'] ?? '').toString();
    let sigOk: boolean | null = null;
    if (SECRET) {
      const expected = 'sha256=' + createHmac('sha256', SECRET).update(body).digest('hex');
      sigOk = expected === sigHeader;
    }
    const ts = new Date().toISOString();
    console.log(`\n[${ts}] ${req.method} ${req.url}`);
    console.log(`  X-REIN-Event:     ${req.headers['x-rein-event'] ?? '(none)'}`);
    console.log(`  X-REIN-Signature: ${sigHeader || '(none)'}`);
    if (sigOk !== null) console.log(`  signature ok:     ${sigOk}`);
    console.log('  body:', body);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`stub-webhook listening on http://0.0.0.0:${PORT}`);
  if (SECRET) console.log('  HMAC verification: ENABLED');
});
