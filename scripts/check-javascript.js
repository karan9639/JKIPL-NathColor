import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const allowed = new Set(['.js', '.jsx']);
const scriptRoot = process.cwd();
const srcRoot = join(scriptRoot, 'src');
if (!existsSync(srcRoot)) throw new Error('Missing src directory');
let count = 0;
function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) { scan(path); continue; }
        const extension = extname(entry.name);
        if (['.ts', '.tsx', '.mts', '.cts'].includes(extension)) throw new Error(`TypeScript is disallowed: ${path}`);
        if (!allowed.has(extension)) continue;
        const source = readFileSync(path, 'utf8');
        if (!source.trim()) throw new Error(`Empty source file: ${path}`);
        if (extension === '.js') execFileSync(process.execPath, ['--check', path]);
        count++;
    }
}
scan(srcRoot);
console.log(`Checked ${count} JavaScript/JSX source files (Vite validates JSX during build).`);
