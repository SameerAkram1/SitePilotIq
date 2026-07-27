'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2 } from 'lucide-react';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function QrScanner({ onScan, onError, disabled }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if camera is available
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
    }
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!containerRef.current) return;

    try {
      const scanner = new Html5Qrcode('qr-scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Ignore scan failures (no QR found in frame)
        },
      );

      setIsScanning(true);
    } catch (err: any) {
      const message = typeof err === 'string' ? err : err?.message || 'Failed to start camera';
      onError?.(message);
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  if (!hasCamera) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div
        id="qr-scanner-container"
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl border-2 border-dashed transition-colors ${
          isScanning
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-border bg-muted/30'
        }`}
        style={{ minHeight: isScanning ? 280 : 0 }}
      >
        {isScanning && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 z-10 h-7 w-7 p-0 bg-white/80 hover:bg-white"
            onClick={stopScanning}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isScanning ? (
        <Button
          variant="outline"
          onClick={startScanning}
          disabled={disabled}
          className="w-full rounded-xl"
        >
          <Camera className="h-4 w-4 mr-2" />
          Scan QR Code
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={stopScanning}
          className="w-full rounded-xl"
        >
          <X className="h-4 w-4 mr-2" />
          Stop Scanner
        </Button>
      )}
    </div>
  );
}
