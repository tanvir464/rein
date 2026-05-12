/**
 * Copies `program/target/idl/rein.json` and `program/target/types/rein.ts`
 * into `packages/sdk-ts/src/` so the package can import them as static modules.
 *
 * Run via `pnpm --filter @rein/sdk sync-idl`. Also runs automatically as `prebuild`.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const programDir = resolve(pkgRoot, '..', '..', 'program');

const SRC_IDL = resolve(programDir, 'target', 'idl', 'rein.json');
const SRC_TYPES = resolve(programDir, 'target', 'types', 'rein.ts');
const DST_IDL = resolve(pkgRoot, 'src', 'idl.json');
const DST_TYPES = resolve(pkgRoot, 'src', 'idl-types.ts');

const EXPECTED_PROGRAM_ID = '2QFW8Xg2mrbrLv6JzUdmnczA1G3RkksH8SKmfXxCuwNj';

async function main() {
  if (!existsSync(SRC_IDL) || !existsSync(SRC_TYPES)) {
    // In CI the Anchor build hasn't run, but the IDL is committed to src/.
    // Silently skip — the committed src/idl.json is the source of truth.
    if (existsSync(DST_IDL)) {
      console.log('[sync-idl] program/target not found; using committed src/idl.json (CI mode).');
      return;
    }
    console.error(
      `[sync-idl] missing ${SRC_IDL} or ${SRC_TYPES}.\n` +
        `Run \`anchor build\` inside the program/ directory first.`,
    );
    process.exit(1);
  }

  const idlRaw = await readFile(SRC_IDL, 'utf8');
  const idl = JSON.parse(idlRaw);

  if (idl.address !== EXPECTED_PROGRAM_ID) {
    console.error(
      `[sync-idl] IDL program address mismatch.\n` +
        `  expected: ${EXPECTED_PROGRAM_ID}\n` +
        `  got:      ${idl.address}\n` +
        `Refusing to sync. Check declare_id! in lib.rs and the constant in src/program-id.ts.`,
    );
    process.exit(1);
  }

  const typesRaw = await readFile(SRC_TYPES, 'utf8');

  await mkdir(dirname(DST_IDL), { recursive: true });
  await writeFile(DST_IDL, idlRaw + (idlRaw.endsWith('\n') ? '' : '\n'), 'utf8');
  await writeFile(DST_TYPES, typesRaw, 'utf8');

  const ixCount: number = Array.isArray(idl.instructions) ? idl.instructions.length : 0;
  const acctCount: number = Array.isArray(idl.accounts) ? idl.accounts.length : 0;
  const errCount: number = Array.isArray(idl.errors) ? idl.errors.length : 0;

  console.log(
    `[sync-idl] ok — ${ixCount} ixs, ${acctCount} accounts, ${errCount} errors. address=${idl.address}`,
  );
}

main().catch((e) => {
  console.error('[sync-idl] failed:', e);
  process.exit(1);
});
