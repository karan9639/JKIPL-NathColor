import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseJobCardQr } from '../src/utils/job-card-qr.js';

const good = [
  ['144296','144296'],
  [' 00144296 ','00144296'],
  ['Job Card No: 144296','144296'],
  ['DJC:144296','144296'],
  ['JOBCARDNO=144296','144296'],
  ['{"jobCardNo":"144296","extra":"text"}','144296'],
  ['{"JOBCARDNO":144296}','144296'],
  ['https://erp.example.com/job-cards/144296','144296'],
  ['https://erp.example.com/scan?jobCardNo=144296','144296'],
];
for (const [source, expected] of good) {
  test(`decodes job-card QR: ${source}`, () => assert.equal(parseJobCardQr(source), expected));
}
for (const source of ['', 'other QR text', 'http://erp.example.com/login', '{bad json',
  'ORD-144296', 'Job card #oops', 'javascript:alert(1)', 'https://erp.example.com/fabric/144296']) {
  test(`rejects unrelated QR: ${source}`, () => assert.equal(parseJobCardQr(source), null));
}
test('all production entry screens inherit the scanner and preserve existing job-card lookup', () => {
  const stagePage = readFileSync(new URL('../src/pages/production/stage-entry.jsx', import.meta.url),'utf8');
  const routes = readFileSync(new URL('../src/routes/AppRoutes.jsx', import.meta.url),'utf8');
  assert.match(stagePage, /JobCardQrScanner/);
  assert.match(stagePage, /lookup\.mutate\(number\)/);
  assert.match(stagePage, /Find job card/);
  assert.match(routes, /STAGES\.map/);
});
test('scanner releases camera tracks when closed or unmounted', () => {
  const scanner = readFileSync(new URL('../src/components/production/job-card-qr-scanner.jsx', import.meta.url),'utf8');
  assert.match(scanner,/track\.stop\(\)/);
  assert.match(scanner,/cancelAnimationFrame/);
  assert.match(scanner,/document\.hidden/);
});
