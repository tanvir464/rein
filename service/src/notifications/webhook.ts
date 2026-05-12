import type { NotificationEvent } from './types';

/**
 * POST the event to a subscriber-provided URL. If a `secret` was registered,
 * we attach an HMAC-SHA256 signature over the body in the `X-REIN-Signature`
 * header so the receiver can verify the call originated from REIN and wasn't
 * spoofed.
 */
export async function sendWebhook(
  url: string,
  event: NotificationEvent,
  secret?: string,
): Promise<{ ok: boolean; status: number; err?: string }> {
  const body = JSON.stringify(event);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': 'REIN/1 (+https://rein.so/webhooks)',
    'x-rein-event': event.type,
  };

  if (secret) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const sigHex = Array.from(new Uint8Array(sig))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
    headers['x-rein-signature'] = `sha256=${sigHex}`;
  }

  try {
    const r = await fetch(url, { method: 'POST', headers, body });
    if (!r.ok) {
      const text = await r.text();
      return { ok: false, status: r.status, err: text.slice(0, 300) };
    }
    return { ok: true, status: r.status };
  } catch (e: any) {
    return { ok: false, status: 0, err: e?.message ?? String(e) };
  }
}
