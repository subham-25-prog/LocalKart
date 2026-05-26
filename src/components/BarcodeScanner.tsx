import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeResult, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  /**
   * Called when a barcode/QR code is successfully decoded.
   * The decoded string is passed to the parent component.
   */
  onDetected: (code: string) => void;
  /** Optional: CSS class for the wrapper div */
  className?: string;
}

/**
 * BarcodeScanner – a lightweight wrapper around the `html5-qrcode` library.
 * It automatically selects the back‑camera on mobile devices, starts the stream on mount,
 * and stops it on unmount. If scanning fails, a simple retry button is shown.
 */
const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, className }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);

  useEffect(() => {
    if (!scannerRef.current) return;
    const html5QrCode = new Html5Qrcode(scannerRef.current.id);
    const config = {
      fps: 30, // Increase frame rate for ultra-fast response
      qrbox: (width: number, height: number) => ({
        width: Math.min(width * 0.85, 320),
        height: Math.min(height * 0.4, 130), // Horizontal rectangular scanning box for barcodes
      }),
      // Restrict support to common product barcode formats for massive CPU optimization
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39
      ],
      // Prefer the environment (back) camera on mobile devices
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    };

    const startScanning = async () => {
      try {
        // Ask the library to use the back camera if available
        const cameras = await Html5Qrcode.getCameras();
        const backCamera = cameras.find(c => /back|environment/i.test(c.label)) || cameras[0];
        await html5QrCode.start(
          backCamera?.id ?? cameras[0].id,
          config,
          (decodedText: string, _: Html5QrcodeResult) => {
            // Notify parent and stop scanning to avoid duplicate callbacks
            onDetected(decodedText);
            html5QrCode.stop().catch(() => {});
          },
          (errorMessage: string) => {
            // The library emits frequent decode errors; we ignore them to keep UI quiet.
            // If you need to surface a persistent failure, set error state here.
          }
        );
        setScanning(true);
        setError(null);
      } catch (err: any) {
        console.error('Barcode scanner init error', err);
        setError(err?.message || 'Failed to initialise scanner');
      }
    };

    startScanning();

    // Cleanup on component unmount
    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, [scannerRef, onDetected]);

  const handleRetry = () => {
    setError(null);
    setScanning(false);
    // Re‑trigger the effect by toggling a dummy state – easiest is to unmount/remount.
    // Here we simply reload the page fragment.
    window.location.reload();
  };

  return (
    <div className={className}>
      <div id="barcode-scanner" ref={scannerRef} style={{ width: '100%' }} />
      {error && (
        <div className="mt-2 text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      )}
      {!scanning && !error && (
        <p className="mt-2 text-center text-gray-500">Starting camera…</p>
      )}
    </div>
  );
};

export default BarcodeScanner;
