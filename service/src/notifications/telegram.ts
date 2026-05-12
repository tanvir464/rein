import type { NotificationEvent } from './types';

/**
 * Render a notification event as a human-readable Telegram message
 * (Markdown V2-safe — escape Telegram's reserved chars).
 */
function escapeMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function renderEvent(e: NotificationEvent): string {
  const dollars = (micro: string) =>
    `\$${(Number(BigInt(micro)) / 1_000_000).toFixed(4).replace(/\.?0+$/, '')}`;
  switch (e.type) {
    case 'spend.completed':
      return [
        `*✓ spend confirmed* ${escapeMd(dollars(e.amount))} USDC`,
        `recipient: \`${escapeMd(e.recipient)}\``,
        `tx: \`${escapeMd(e.signature)}\``,
        `vault: \`${escapeMd(e.vault)}\``,
      ].join('\n');
    case 'spend.rejected':
      return [
        `*✗ spend rejected* (\\${escapeMd(e.stage)}\\)`,
        `reason: ${escapeMd(e.reason)}`,
        `amount: ${escapeMd(dollars(e.amount))} USDC`,
        e.recipient ? `recipient: \`${escapeMd(e.recipient)}\`` : '',
      ]
        .filter(Boolean)
        .join('\n');
    case 'step_up.requested':
      return [
        `*⚠ step\\-up requested* ${escapeMd(dollars(e.amount))} USDC`,
        `recipient: \`${escapeMd(e.recipient)}\``,
        `expires: ${new Date(e.expiresAt * 1000).toISOString()}`,
        `request: \`${escapeMd(e.requestPda)}\``,
      ].join('\n');
    case 'step_up.approved':
      return `*✓ step\\-up approved* — request \`${escapeMd(e.requestPda)}\``;
  }
}

export async function sendTelegram(
  botToken: string,
  chatId: string,
  event: NotificationEvent,
): Promise<{ ok: boolean; status: number; err?: string }> {
  const text = renderEvent(event);
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
    });
    if (!r.ok) {
      const body = await r.text();
      return { ok: false, status: r.status, err: body.slice(0, 300) };
    }
    return { ok: true, status: r.status };
  } catch (e: any) {
    return { ok: false, status: 0, err: e?.message ?? String(e) };
  }
}
