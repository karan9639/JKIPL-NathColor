import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function toNumber(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const n = Number(value.replace(/,/g, '').trim());
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}
export function formatNumber(value, digits = 2) {
    return toNumber(value).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    });
}
export function isNumericLike(value) {
    if (typeof value === 'number')
        return Number.isFinite(value);
    if (typeof value === 'string' && value.trim() !== '') {
        return /^-?[\d,]*\.?\d+$/.test(value.trim());
    }
    return false;
}
export function formatCell(value) {
    if (value === null || value === undefined)
        return '—';
    if (typeof value === 'boolean')
        return value ? 'Yes' : 'No';
    if (typeof value === 'object')
        return JSON.stringify(value);
    const text = String(value);
    return text.trim() === '' ? '—' : text;
}
export function humanizeKey(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}
export function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
export function nowLocalDateTime() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
export function parseLooseDate(value) {
    if (!value)
        return null;
    const text = String(value).trim();
    const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (dmy) {
        const [, d, m, y, hh = '0', mm = '0', ss = '0'] = dmy;
        const year = y.length === 2 ? 2000 + Number(y) : Number(y);
        const date = new Date(year, Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
}
export function formatDate(value, withTime = false) {
    const date = parseLooseDate(value);
    if (!date)
        return formatCell(value);
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
}
export function pickString(row, ...keys) {
    if (!row)
        return '';
    for (const key of keys) {
        const v = row[key];
        if (v !== undefined && v !== null && String(v).trim() !== '')
            return String(v);
    }
    return '';
}
export function asRows(data) {
    if (Array.isArray(data))
        return data.filter((r) => !!r && typeof r === 'object');
    if (data && typeof data === 'object') {
        const obj = data;
        for (const key of ['data', 'results', 'rows', 'items', 'records']) {
            if (Array.isArray(obj[key]))
                return asRows(obj[key]);
        }
    }
    return [];
}
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
