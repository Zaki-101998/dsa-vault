// Reads a vault backup (the JSON the app's sidebar Export button produces) and
// writes scripts/a2z-worked-keys.json — the DSA seed keys that carry real work.
//
//   node scripts/extract-worked-keys.mjs ~/Downloads/vault-backup-2026-09-20.json
//
// build-a2z-sheet.mjs uses that list to decide which problems Striver dropped are
// still worth carrying into the new sheet. Re-run this whenever a fresh backup is
// taken: an entry that gains work after the list was generated would otherwise be
// dropped from the sheet and its row orphaned.
//
// Only keys are written — no notes, code or timestamps — so the file is safe to
// commit.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "a2z-worked-keys.json");

const backupPath = process.argv[2];
if (!backupPath) {
  console.error("usage: node scripts/extract-worked-keys.mjs <vault-backup.json>");
  process.exit(1);
}

const backup = JSON.parse(readFileSync(backupPath, "utf8"));
const rows = backup.rows ?? [];

// Mirrors lib/subjects.ts subjectOf(): non-DSA keys are namespaced, DSA keys bare.
const isDsa = (key) => {
  const i = key.indexOf(":");
  return !(i > 0 && ["cn", "os", "dbms"].includes(key.slice(0, i)));
};

// "Work" is anything the user would be upset to lose. A row can exist with none
// of it — opening a problem is enough to create one — and those are not worth
// keeping a dropped problem alive for.
const hasWork = (r) =>
  (r.status && r.status !== "Unsolved") ||
  !!r.starred ||
  !!(r.notes_html && r.notes_html.trim() && r.notes_html !== "<p></p>") ||
  !!(r.approaches && r.approaches.length) ||
  (r.rev_count || 0) > 0 ||
  !!r.last_revised;

const keys = rows
  .filter((r) => isDsa(r.problem_key) && !r.problem_key.startsWith("custom:") && hasWork(r))
  .map((r) => r.problem_key)
  .sort();

writeFileSync(OUT, JSON.stringify(keys, null, 2) + "\n");

const dsa = rows.filter((r) => isDsa(r.problem_key));
console.log(
  `backup: ${rows.length} rows (${dsa.length} DSA, ${dsa.filter((r) => r.problem_key.startsWith("custom:")).length} custom)\n` +
    `wrote ${keys.length} worked keys -> ${OUT}`
);
