import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { Env } from './env';
import { receiptsRouter } from './routes/receipts';
import { recipientsRouter } from './routes/recipients';
import { authRouter } from './routes/auth';
import { spendRouter } from './routes/spend';
import { x402Router } from './routes/x402';
import { notificationsRouter } from './routes/notifications';
import { activityRouter } from './routes/activity';
import { webhooksRouter } from './routes/webhooks';
import { dataRouter } from './routes/data';
import { configRouter } from './routes/config';
import { faucetRouter } from './routes/faucet';

// Re-exported so wrangler can wire the DO binding declared in wrangler.toml.
export { ActivityRoom } from './activity/room';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: (origin) => origin ?? '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
    credentials: false,
  }),
);

app.get('/', (c) => c.text('REIN service. See /health.'));

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'rein',
    version: '0.0.0',
    env: c.env.ENVIRONMENT,
    cluster: c.env.SOLANA_CLUSTER,
    programId: c.env.PROGRAM_ID,
    kvBound: !!c.env.REIN_KV,
    activityBound: !!c.env.ACTIVITY_ROOM,
  }),
);

app.route('/', receiptsRouter);
app.route('/', recipientsRouter);
app.route('/', authRouter);
app.route('/', spendRouter);
app.route('/', x402Router);
app.route('/', notificationsRouter);
app.route('/', activityRouter);
app.route('/', webhooksRouter);
app.route('/', dataRouter);
app.route('/', configRouter);
app.route('/', faucetRouter);

export default app;
