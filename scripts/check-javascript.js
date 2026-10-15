import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { parse } from '@babel/parser';

const allowed = new Set(['.js', '.jsx']);
const root = process.cwd();
const srcRoot = join(root, 'src');
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
        try {
            // Parses JSX as well as plain JS. Catches missing closing parentheses
            // inside JSX conditionals BEFORE Vite tries to lazy-load a route.
            parse(source, { sourceType: 'module', plugins: ['jsx', 'importAttributes'] });
        } catch (error) {
            throw new Error(`Invalid JavaScript/JSX in ${path}: ${error.message}`, { cause: error });
        }
        count++;
    }
}
scan(srcRoot);
console.log(`Validated JSX/JavaScript syntax in ${count} source files. No TypeScript source.`);
