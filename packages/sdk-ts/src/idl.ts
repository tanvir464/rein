import idlJson from './idl.json' with { type: 'json' };
import type { Rein } from './idl-types';

/**
 * Anchor IDL for the REIN program. Loaded from `src/idl.json`, which is generated from
 * `program/target/idl/rein.json` by `pnpm sync-idl` (runs as `prebuild`).
 */
export const IDL = idlJson as Rein;
export type { Rein };
