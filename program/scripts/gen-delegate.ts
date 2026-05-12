/**
 * Generate a delegate keypair for the REIN service. The delegate has NO
 * authority over the vault — it just pays SOL for tx fees + receipt rent.
 * The on-chain `spend` ix is signed by the vault PDA (program-derived), so
 * a compromised delegate key can only drain its own SOL balance for fees.
 *
 * Output: prints base58 secret key to stdout. Pipe into your `.dev.vars`:
 *   npx tsx scripts/gen-delegate.ts >> ../service/.dev.vars
 *
 * Then fund it with devnet SOL:
 *   solana airdrop 1 <pubkey> --url https://api.devnet.solana.com
 */
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const kp = Keypair.generate();
const secretB58 = bs58.encode(kp.secretKey);

console.log('# Generated REIN service delegate keypair');
console.log(`# pubkey: ${kp.publicKey.toBase58()}`);
console.log(`# Fund it: solana airdrop 0.5 ${kp.publicKey.toBase58()} --url https://api.devnet.solana.com`);
console.log(`DELEGATE_KEYPAIR_BASE58=${secretB58}`);
