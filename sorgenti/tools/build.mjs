// Costruisce la cartella "web/" pronta da pubblicare: node tools/build.mjs
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'web');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [join(root, 'src/app.js')],
  bundle: true, minify: true, format: 'iife', target: ['es2020', 'safari15', 'chrome90'],
  outfile: join(out, 'app.js'), legalComments: 'none', logLevel: 'warning',
});

cpSync(join(root, 'index.html'), join(out, 'index.html'));
cpSync(join(root, 'style.css'), join(out, 'style.css'));
cpSync(join(root, 'tools/manifest.json'), join(out, 'manifest.webmanifest'));
execFileSync('python3', ['-I', join(root, 'tools/make_icons.py'), out], { stdio: 'inherit' });
writeFileSync(join(out, '.nojekyll'), '');

const files = ['./', './index.html', './style.css', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const h = createHash('sha256');
for (const f of files.slice(2)) h.update(readFileSync(join(out, f)));
const version = h.digest('hex').slice(0, 10);
const sw = readFileSync(join(root, 'tools/sw.template.js'), 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files));
writeFileSync(join(out, 'sw.js'), sw);
console.log('build ok, versione cache', version, readdirSync(out).join(' '));
