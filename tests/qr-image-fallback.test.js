import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseJobCardQr } from '../src/utils/job-card-qr.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('QR image scanning does not require the native BarcodeDetector API', () => {
  const decoder = read('../src/utils/qr-image-decoder.js');
  const component = read('../src/components/production/job-card-qr-scanner.jsx');
  assert.match(decoder, /import jsQR from 'jsqr'/);
  assert.match(decoder, /decodeQrImageFile/);
  assert.match(decoder, /decodeQrVideoFrame/);
  assert.match(component, /await decodeQrImageFile\(file\)/);
  assert.doesNotMatch(component, /window\.BarcodeDetector/);
  assert.match(component, /detectionRef\.current\(number\)/);
});

test('PNG JPG WebP and SVG are supported, and image URLs are revoked', () => {
  const decoder = read('../src/utils/qr-image-decoder.js');
  assert.match(decoder, /image\/svg\+xml/);
  assert.match(decoder, /image\/png/);
  assert.match(decoder, /image\/jpeg/);
  assert.match(decoder, /image\/webp/);
  assert.match(decoder, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(decoder, /fillRect\(0, 0, width, height\)/);
});

test('lockfile and package.json include QR decoder dependency', () => {
  const manifest = JSON.parse(read('../package.json'));
  const lock = JSON.parse(read('../package-lock.json'));
  assert.equal(manifest.dependencies.jsqr, '1.4.0');
  assert.equal(lock.packages[''].dependencies.jsqr, '1.4.0');
  assert.equal(lock.packages['node_modules/jsqr'].version, '1.4.0');
});

test('the uploaded example QR number is accepted by the existing job-card parser', () => {
  assert.equal(parseJobCardQr('144296'), '144296');
});
