/** Event payloads dispatched to subscribers. Wire-stable; do not rename. */

export type NotificationEvent =
  | {
      type: 'spend.completed';
      vault: string;
      signature: string;
      receiptPda: string;
      amount: string;            // micro-USDC
      recipient: string;
      policyVersion: number;
      ts: number;
    }
  | {
      type: 'spend.rejected';
      vault: string;
      stage: string;
      reason: string;
      amount: string;
      recipient?: string;
      ts: number;
    }
  | {
      type: 'step_up.requested';
      vault: string;
      requestPda: string;
      amount: string;
      recipient: string;
      nonce: string;
      expiresAt: number;
      ts: number;
    }
  | {
      type: 'step_up.approved';
      vault: string;
      requestPda: string;
      ts: number;
    };

export type Channel = 'webhook' | 'telegram';

export type DispatchResult = {
  channel: Channel;
  ok: boolean;
  attempts: number;
  status?: number;
  err?: string;
};
