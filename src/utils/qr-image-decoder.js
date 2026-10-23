/**
 * Cross-browser QR decoder for camera frames and user-selected images.
 * Unlike BarcodeDetector, jsQR works in browsers without the experimental API.
 * Decoding runs in the browser; no uploaded image is sent to a server.
 */
import jsQR from 'jsqr';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;
const MIN_IMAGE_DIMENSION = 560;
const SUPPORTED_EXT = /\.(?:png|jpe?g|webp|svg)$/i;
const SUPPORTED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
]);

export function validateQrImageFile(file) {
  if (!file) return 'Choose a QR-code image.';
  if (!SUPPORTED_EXT.test(file.name || '') || (file.type && !SUPPORTED_MIME.has(file.type))) {
    return 'Choose a PNG, JPG, WebP or SVG image containing the QR code.';
  }
  if (!file.size) return 'The selected image is empty.';
  if (file.size > MAX_IMAGE_BYTES) return 'The image is too large (maximum 12 MB).';
  return null;
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Unable to read image pixels in this browser.');
  return { canvas, context };
}

/** Does not rely on window.BarcodeDetector. */
export function decodeQrCanvas(canvas, context) {
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  return result?.data ?? null;
}

function drawOnWhite(context, source, width, height, smoothing = true) {
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = smoothing;
  context.drawImage(source, 0, 0, width, height);
  context.restore();
}

function calculateImageDimensions(width, height) {
  // Tiny SVGs can have a 25x25 viewBox. Upscale their QR modules before detection.
  const sourceWidth = Math.max(1, width);
  const sourceHeight = Math.max(1, height);
  const scale = Math.min(
    MAX_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight),
    Math.max(1, MIN_IMAGE_DIMENSION / Math.min(sourceWidth, sourceHeight)),
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The selected image could not be opened.'));
    image.src = url;
  });
}

/**
 * Decode PNG, JPEG, WebP and SVG (including files with viewBox-only dimensions).
 * SVG is rendered as an image, never inserted into the document as executable markup.
 */
export async function decodeQrImageFile(file) {
  const validationError = validateQrImageFile(file);
  if (validationError) throw new Error(validationError);

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const { width, height } = calculateImageDimensions(image.naturalWidth, image.naturalHeight);
    const { canvas, context } = createCanvas(width, height);
    // QR modules need crisp boundaries; avoid interpolating tiny / vector QR images.
    drawOnWhite(context, image, width, height, !isSvg && Math.min(image.naturalWidth, image.naturalHeight) >= 256);
    return decodeQrCanvas(canvas, context);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Scan a webcam frame (call at an interval, not on every animation frame). */
export function decodeQrVideoFrame(video, canvas) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
  const ratio = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * ratio));
  const height = Math.max(1, Math.round(video.videoHeight * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  drawOnWhite(context, video, width, height);
  return decodeQrCanvas(canvas, context);
}
