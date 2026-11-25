// Midnight Ramen Rush — entry program for make.fun's best-cooking-game bounty.
// Node 22, standard library only. It hands in the game: it copies this repo's
// game/ (plain static files a desktop browser loads offline) and screenshots/
// (real renders of the game) into the output directory and writes
// dossier.json, the summary the judge reads, with the vendored make.fun
// library. It runs twice and both runs must write identical bytes, so it
// only copies files and writes the dossier the library builds — no time,
// no randomness, no removal of the output directory.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Fail fast when the playable entry point is missing: without
// game/index.html the browser has nothing to open, so refuse to hand in
// a broken game instead of copying it silently.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the playable game entry point is required');
}
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's caps: at most 4 screenshots, each at most 256 KiB; game/ at
// most 993 files and 48 MiB in all, no path under game/ over 1000 bytes;
// the dossier text at most 163,840 bytes. The library refuses an entry the
// scorer would refuse, so a bad bundle fails here instead of on the server.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
