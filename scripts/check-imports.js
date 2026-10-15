import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';

const root = process.cwd();
const src = join(root, 'src');
const extensions = ['.js', '.jsx', '.css'];
let checked = 0;
const missing = [];

function resolvesToFile(base) {
    return [base, ...extensions.map((extension) => `${base}${extension}`), ...extensions.map((extension) => join(base, `index${extension}`))]
        .some((candidate) => existsSync(candidate));
}
function scan(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const file = join(dir, entry.name);
        if (entry.isDirectory()) { scan(file); continue; }
        if (!['.js', '.jsx'].includes(extname(file))) continue;
        const text = readFileSync(file, 'utf8');
        const matcher = /\b(?:import|export)\s*(?:\(\s*)?(?:[^\n;]*?\bfrom\s*)?['"]([^'"]+)['"]/g;
        for (const match of text.matchAll(matcher)) {
            const specifier = match[1];
            if (!specifier.startsWith('@/') && !specifier.startsWith('./') && !specifier.startsWith('../')) continue;
            const candidate = specifier.startsWith('@/') ? resolve(src, specifier.slice(2)) : resolve(dirname(file), specifier);
            if (!resolvesToFile(candidate)) missing.push(`${file.replace(`${root}/`, '')}: ${specifier}`);
            checked++;
        }
    }
}
scan(src);
if (missing.length) {
    console.error(`Missing local module imports (${missing.length}):\n${missing.join('\n')}`);
    process.exitCode = 1;
} else {
    console.log(`Validated ${checked} local module references: all resolved.`);
}
