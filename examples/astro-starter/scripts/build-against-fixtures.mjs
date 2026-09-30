// Run through with-fixtures.mjs (fixture server + env). Builds the site and asserts the output.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const r = spawnSync('pnpm', ['exec', 'astro', 'build'], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

const distDir = new URL('../dist/', import.meta.url).pathname;
const unitPage = join(distDir, 'client/units/u-1201/index.html');
if (!existsSync(unitPage)) throw new Error('dist/client/units/u-1201/index.html was not built');
const html = readFileSync(unitPage, 'utf8');
for (const needle of ['Unit 1201', 'Available', 'Summer -5%']) {
  if (!html.includes(needle)) throw new Error(`unit page is missing "${needle}"`);
}

const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
for (const file of walk(distDir)) {
  if (readFileSync(file).includes('pcs_fixture'))
    throw new Error(`the source key leaked into ${file}`);
}
console.log('starter build against fixtures: ok');
