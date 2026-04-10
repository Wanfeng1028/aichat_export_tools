import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const outfile = resolve('dist/src/content/index.js');
await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve('src/content/index.ts')],
  outfile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: false,
  minify: true,
  legalComments: 'none'
});
