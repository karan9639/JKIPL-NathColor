import { useEffect, useRef, useState } from 'react';
import { CameraOff, ImageUp, RefreshCcw, ScanLine } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseJobCardQr } from '@/utils/job-card-qr';
import { decodeQrImageFile, decodeQrVideoFrame } from '@/utils/qr-image-decoder';

function cameraError(error) {
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error?.name)) {
    return 'Camera permission denied. Allow camera access in your browser settings, or scan an image instead.';
  }
  if (['NotFoundError', 'OverconstrainedError'].includes(error?.name)) {
    return 'No camera was found. You can still scan a saved QR image.';
  }
  if (error?.name === 'NotReadableError') {
    return 'Camera is already in use by another application. Close it and retry.';
  }
  return 'Could not open the camera. You can still scan a saved QR image or enter a number manually.';
}

function ScannerCamera({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const detectionRef = useRef(onDetected);
  const closeRef = useRef(onClose);
  const imageBusyRef = useRef(false);
  detectionRef.current = onDetected;
  closeRef.current = onClose;

  const [facing, setFacing] = useState('environment');
  const [cameraStatus, setCameraStatus] = useState('Opening camera…');
  const [cameraFailure, setCameraFailure] = useState('');
  const [scanError, setScanError] = useState('');
  const [readingFile, setReadingFile] = useState(false);

  useEffect(() => {
    let active = true;
    let stream = null;
    let frame = null;
    let accepted = false;
    let lastScan = 0;
    const video = videoRef.current;
    const scanCanvas = document.createElement('canvas');

    setCameraFailure('');
    setCameraStatus('Opening camera…');
    setScanError('');

    async function start() {
      // File-based scanning is independent of camera availability.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        if (active) {
          setCameraFailure('Camera requires HTTPS or localhost and an available device. Saved QR images can still be scanned.');
          setCameraStatus('Camera unavailable');
        }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 } },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (!active) return;
        setCameraStatus('Point the camera at the job-card QR code');

        const scan = (timestamp) => {
          if (!active || accepted) return;
          if (!imageBusyRef.current && timestamp - lastScan >= 220) {
            lastScan = timestamp;
            try {
              const raw = decodeQrVideoFrame(video, scanCanvas);
              if (raw) {
                const number = parseJobCardQr(raw);
                if (number) {
                  accepted = true;
                  detectionRef.current(number);
                  return;
                }
                setScanError('This QR code does not contain a valid job-card number.');
              }
            } catch {
              // A camera frame may be unreadable; next frame will be retried.
            }
          }
          if (active && !accepted) frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch (error) {
        if (active) {
          setCameraFailure(cameraError(error));
          setCameraStatus('Camera unavailable');
        }
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) closeRef.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    void start();

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (frame !== null) cancelAnimationFrame(frame);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (video) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [facing]);

  async function scanSelectedImage(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // Choosing the same image twice must work.
    if (!file || imageBusyRef.current) return;
    imageBusyRef.current = true;
    setReadingFile(true);
    setScanError('');

    try {
      const raw = await decodeQrImageFile(file);
      if (!raw) throw new Error('No QR code found. Use a clear PNG, JPG, WebP or SVG with the full QR visible.');
      const number = parseJobCardQr(raw);
      if (!number) throw new Error('QR detected, but it does not contain a valid job-card number.');
      detectionRef.current(number); // Existing StageEntryPage performs the API lookup.
    } catch (error) {
      setScanError(error?.message || 'Could not read the QR image.');
    } finally {
      imageBusyRef.current = false;
      setReadingFile(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-950 sm:aspect-video">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          aria-label="Live job-card QR camera preview"
          className="h-full w-full object-cover"
        />
        {!cameraFailure && <div aria-hidden="true" className="pointer-events-none absolute inset-[16%] rounded-xl border-2 border-white/80" />}
        {cameraFailure && <CameraOff aria-hidden="true" className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-white/70" />}
      </div>

      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
        <ScanLine aria-hidden="true" className="size-4" /> {cameraStatus}
      </p>
      {cameraFailure && <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{cameraFailure}</p>}
      {scanError && <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{scanError}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={readingFile || !!cameraFailure}
          onClick={() => setFacing((current) => current === 'environment' ? 'user' : 'environment')}
        >
          <RefreshCcw aria-hidden="true" /> Switch camera
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={readingFile}
          loading={readingFile}
          onClick={() => fileRef.current?.click()}
        >
          <ImageUp aria-hidden="true" /> Scan QR image
        </Button>
        <Button type="button" variant="ghost" onClick={() => closeRef.current()}>Enter manually</Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
          aria-label="Choose PNG, JPG, WebP or SVG containing a job-card QR code"
          className="sr-only"
          onChange={scanSelectedImage}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Supports PNG, JPG, WebP and SVG, even without the browser BarcodeDetector API.
        Decoding happens on your device; only the job-card number is sent to the lookup API.
      </p>
    </div>
  );
}

export function JobCardQrScanner({ open, onOpenChange, onDetected }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Scan job-card QR"
      description="Point your camera at a QR code, or select a saved QR image."
      className="sm:max-w-xl"
    >
      {open && <ScannerCamera onDetected={onDetected} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}
