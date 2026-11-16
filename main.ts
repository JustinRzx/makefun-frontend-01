#!/usr/bin/env node
/* Custom entry rewritten in-session for makefun: deterministic copy + dossier build
   - Node 22 compatible ESM
   - Honors MAKEFUN_OUTPUT_DIR or ./output
   - Clears output dir contents before writing
   - Copies app/ and screenshots/ recursively (deterministic order)
   - Imports buildDossier from vendor/makefun-frontend.ts and writes dossier.json
*/
import { buildDossier } from './vendor/makefun-frontend.ts';
import { promises as fsp } from 'fs';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const envOut = process.env.MAKEFUN_OUTPUT_DIR;
const OUT = envOut ? envOut : './output';

async function emptyDir(path) {
  try {
    const entries = await fsp.readdir(path, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      const p = join(path, e.name);
      if (e.isDirectory()) await fsp.rm(p, { recursive: true, force: true });
      else await fsp.unlink(p).catch(() => {});
    }
  } catch (err) {
    // ignore if dir missing
  }
}

async function copyTree(src, dst) {
  const entries = await fsp.readdir(src, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const srcPath = join(src, e.name);
    const dstPath = join(dst, e.name);
    if (e.isDirectory()) {
      await fsp.mkdir(dstPath, { recursive: true });
      await copyTree(srcPath, dstPath);
    } else if (e.isFile()) {
      const data = await fsp.readFile(srcPath);
      await fsp.writeFile(dstPath, data);
    }
  }
}

async function run() {
  const outDir = OUT;
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  await emptyDir(outDir);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const root = __dirname;
  const appSrc = join(root, 'app');
  const shotsSrc = join(root, 'screenshots');
  const appDst = join(outDir, 'app');
  const shotsDst = join(outDir, 'screenshots');

  if (existsSync(appSrc)) {
    await fsp.mkdir(appDst, { recursive: true });
    await copyTree(appSrc, appDst);
  }
  if (existsSync(shotsSrc)) {
    await fsp.mkdir(shotsDst, { recursive: true });
    await copyTree(shotsSrc, shotsDst);
  }

  const caps = {
    text_max_bytes: 163840,
    screenshots: { max: 3, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216
  };

  const bytes = buildDossier(outDir, caps);
  await fsp.writeFile(join(outDir, 'dossier.json'), Buffer.from(bytes));
}

run().catch((err) => {
  console.error('error:', err && (err.stack || err.message || err));
  process.exitCode = 2;
});
