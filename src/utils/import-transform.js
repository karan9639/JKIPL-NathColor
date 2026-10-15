import { humanizeKey } from './format.js';
import { normalizeDyeingRecords, normalizeYarnRecords } from './import-mappers.js';

export function flattenForPreview(row) {
    return Object.fromEntries(Object.entries(row).flatMap(([name, value]) =>
        value && typeof value === 'object' && !Array.isArray(value)
            ? Object.entries(value).map(([nested, number]) => [`${name}.${nested}`, number])
            : [[name, value]]));
}
export function summarize(result) {
    return Object.entries(result ?? {}).filter(([, v]) => typeof v === 'number' || typeof v === 'string' || Array.isArray(v))
        .map(([k, v]) => [humanizeKey(k), Array.isArray(v) ? String(v.length) : String(v)]);
}
export function normalizeRecords(def, sourceRows) {
    if (def.backend === 'dyeing') return normalizeDyeingRecords(sourceRows);
    if (def.backend === 'yarn') return normalizeYarnRecords(sourceRows);
    return { rows: sourceRows, errors: [] };
}
