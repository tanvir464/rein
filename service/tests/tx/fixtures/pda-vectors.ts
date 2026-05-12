import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export const FIXED_OWNER = new PublicKey('11111111111111111111111111111112');
export const FIXED_VAULT = new PublicKey('So11111111111111111111111111111111111111112');
export const FIXED_USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mainnet (just a fixture; not RPC-touched)
);
export const FIXED_VAULT_ATA = new PublicKey(
  'BBhBURREy9UeKpdqYNKqQVnY4wUyv3F1Y6WSgiQMfYn5',
);
export const FIXED_RECIPIENT_ATA = new PublicKey(
  '7RPNsACVw1cYsBQ9bP5xtxoG3X9rAd5T6F5Mzf2g8EW9',
);
export const FIXED_NONCE = new BN('1234567890');
export const FIXED_DAY = new BN('20212');
export const FIXED_AMOUNT = new BN('500000'); // $0.50 in micro-USDC
export const ZERO_HASH: number[] = Array(32).fill(0);
