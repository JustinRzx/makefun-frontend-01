#!/usr/bin/env node
/* full rewrite in-session: deterministic copy + dossier build
   - Node 22 ESM
   - Honors MAKEFUN_OUTPUT_DIR
   - Resolves script dir from import.meta.url
   - Copies app/ and screenshots/ deterministically
   - Uses vendor/makefun-frontend.ts buildDossier
*/
import { buildDossier } from './vendor/makefun-frontend.ts';
import { promises as fsp } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const OUT = process.env.MAKEFUN_OUTPUT_DIR || './output';

async function emptyDir(path){
  try{
    const entries = await fsp.readdir(path,{withFileTypes:true});
    entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
    for(const e of entries){
      const p = join(path,e.name);
      if(e.isDirectory()) await fsp.rm(p,{recursive:true,force:true});
      else await fsp.unlink(p).catch(()=>{});
    }
  }catch(e){}
}

async function copyTree(src,dst){
  const entries = await fsp.readdir(src,{withFileTypes:true});
  entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);
  for(const e of entries){
    if(e.name.startsWith('.')) continue;
    const s = join(src,e.name); const d = join(dst,e.name);
    if(e.isDirectory()){ await fsp.mkdir(d,{recursive:true}); await copyTree(s,d); }
    else if(e.isFile()){ const data = await fsp.readFile(s); await fsp.writeFile(d,data); }
  }
}

async function run(){
  const out = OUT;
  if(!existsSync(out)) mkdirSync(out,{recursive:true});
  await emptyDir(out);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const root = __dirname;
  const appSrc = join(root,'app');
  const shotsSrc = join(root,'screenshots');
  const appDst = join(out,'app');
  const shotsDst = join(out,'screenshots');

  if(existsSync(appSrc)){
    await fsp.mkdir(appDst,{recursive:true});
    await copyTree(appSrc,appDst);
  }
  if(existsSync(shotsSrc)){
    await fsp.mkdir(shotsDst,{recursive:true});
    await copyTree(shotsSrc,shotsDst);
  }

  const caps = {
    text_max_bytes:163840,
    screenshots:{max:3,max_bytes:262144},
    app_max_files:993,
    app_max_bytes:16777216
  };

  const bytes = buildDossier(out,caps);
  await fsp.writeFile(join(out,'dossier.json'),Buffer.from(bytes));
}

run().catch(err=>{console.error('error:',err&&(err.stack||err.message||err));process.exitCode=2});
