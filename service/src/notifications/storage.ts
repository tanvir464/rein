/**
 * Per-vault subscriber storage in KV.
 *   Key:   sub:<vault>
 *   Value: { webhook?: { url, secret? }, telegram?: { chatId } }
 *
 * Idempotency keys live under:
 *   Key:   notify:dedupe:<event_id>:<channel>   (TTL 5 min)
 */

export type SubscriberRecord = {
  webhook?: { url: string; secret?: string };
  telegram?: { chatId: string };
};

const subKey = (vault: string) => `sub:${vault}`;
const dedupeKey = (eventId: string, channel: string) => `notify:dedupe:${eventId}:${channel}`;

export async function getSubscribers(
  kv: KVNamespace,
  vault: string,
): Promise<SubscriberRecord> {
  const raw = await kv.get(subKey(vault));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SubscriberRecord;
  } catch {
    return {};
  }
}

export async function patchSubscribers(
  kv: KVNamespace,
  vault: string,
  patch: Partial<SubscriberRecord>,
): Promise<SubscriberRecord> {
  const existing = await getSubscribers(kv, vault);
  const merged: SubscriberRecord = { ...existing, ...patch };
  await kv.put(subKey(vault), JSON.stringify(merged));
  return merged;
}

export async function clearChannel(
  kv: KVNamespace,
  vault: string,
  channel: keyof SubscriberRecord,
): Promise<void> {
  const existing = await getSubscribers(kv, vault);
  delete existing[channel];
  await kv.put(subKey(vault), JSON.stringify(existing));
}

export async function alreadyDispatched(
  kv: KVNamespace,
  eventId: string,
  channel: string,
): Promise<boolean> {
  const v = await kv.get(dedupeKey(eventId, channel));
  return v !== null;
}

export async function markDispatched(
  kv: KVNamespace,
  eventId: string,
  channel: string,
): Promise<void> {
  await kv.put(dedupeKey(eventId, channel), '1', { expirationTtl: 300 });
}
