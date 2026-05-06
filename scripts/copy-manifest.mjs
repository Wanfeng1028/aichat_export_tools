import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

async function loadManifest() {
  const result = await build({
    entryPoints: [resolve('src/manifest.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    target: ['node20'],
    legalComments: 'none'
  });

  const source = result.outputFiles[0]?.text;
  if (!source) {
    throw new Error('Manifest build did not produce output.');
  }

  const encoded = Buffer.from(source, 'utf8').toString('base64');
  const module = await import(`data:text/javascript;base64,${encoded}`);
  if (!module.manifest) {
    throw new Error('src/manifest.ts does not export a manifest object.');
  }

  return module.manifest;
}

const manifest = await loadManifest();
const outputPath = resolve('dist/manifest.json');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
