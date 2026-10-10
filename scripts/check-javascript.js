import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['node_modules', '.git', '.next', 'dist']);
const violations = [];

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !excluded.has(entry.name)) await inspect(path);
    if (entry.isFile() && (/\.(?:ts|tsx|mts|cts)$/.test(entry.name) || /^(?:tsconfig.*\.json|next\.config\..*)$/.test(entry.name))) {
      violations.push(relative(root, path));
    }
  }
}

await inspect(root);
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
  if (name === 'next' || name === 'typescript' || name.startsWith('@types/')) violations.push(`Direct dependency: ${name}`);
}
if (violations.length) {
  console.error('JavaScript-only project check failed:\n' + violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('JavaScript-only check passed: no TypeScript source/configuration or direct Next.js/TypeScript dependencies.');
}
