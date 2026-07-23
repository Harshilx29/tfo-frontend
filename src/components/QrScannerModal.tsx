import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "../context/ToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (text: string) => void;
  validationRegex?: RegExp;
  validationErrorMessage?: string;
  hintText?: string;
  title?: string;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  validationRegex,
  validationErrorMessage,
  hintText,
  title = "Scan QR Code"
}: Props) {
  const { addToast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = "qr-reader-el";

  // One-shot guard: stops the scanner the moment a valid code is decoded,
  // preventing a second callback firing before the async stop() completes.
  const hasScanFiredRef = useRef(false);

  // Torch control states
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Camera flip states
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length > 1) {
          setHasMultipleCameras(true);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  // Time tracker for log intervals
  const lastAttemptTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    hasScanFiredRef.current = false;
    setHasTorch(false);
    setIsTorchOn(false);
    lastAttemptTimeRef.current = null;

    const startTime = performance.now();
    console.log("[QR Scanner] Modal opened. Initializing scanner element...");

    const html5Qrcode = new Html5Qrcode(elementId);
    scannerRef.current = html5Qrcode;

    let decodeAttempts = 0;

    const startScanner = async () => {
      const startInitTime = performance.now();
      console.log(`[QR Scanner] Warmup delay ended. Starting camera after ${Math.round(startInitTime - startTime)}ms`);
      try {
        await html5Qrcode.start(
          {
            facingMode: facingMode,
            advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
          },
          {
            fps: 30,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.65;
              return { width: size, height: size };
            },
            videoConstraints: {
              facingMode: facingMode,
              width:  { ideal: 1280 },
              height: { ideal: 720 },
            } as MediaTrackConstraints,
          },
          (decodedText) => {
            if (hasScanFiredRef.current) return;
            const successTime = performance.now();
            console.log(`[QR Scanner] Decode SUCCESS! Text: "${decodedText}"`);
            console.log(`[QR Scanner] Time from modal open to decode: ${Math.round(successTime - startTime)}ms`);
            console.log(`[QR Scanner] Total decode attempts: ${decodeAttempts}`);

            const cleanText = decodedText.trim();
            const regex = validationRegex || /.*/;
            if (regex.test(cleanText)) {
              hasScanFiredRef.current = true;
              console.log("[QR Scanner] Regex validation passed. Stopping camera feed...");
              const stopStartTime = performance.now();
              html5Qrcode.stop().catch(() => {}).finally(() => {
                console.log(`[QR Scanner] Camera stopped after ${Math.round(performance.now() - stopStartTime)}ms. Firing success callback.`);
                onScanSuccess(cleanText);
                onClose();
              });
            } else {
              addToast(validationErrorMessage || `Invalid format: ${cleanText}`, 'error');
            }
          },
          () => {
            decodeAttempts++;
            const now = performance.now();
            const last = lastAttemptTimeRef.current || startTime;
            console.log(`[QR Scanner] Attempt #${decodeAttempts} failed at ${Math.round(now - startTime)}ms (delta: ${Math.round(now - last)}ms)`);
            lastAttemptTimeRef.current = now;
          }
        );

        const cameraStartTime = performance.now();
        console.log(`[QR Scanner] Camera active after ${Math.round(cameraStartTime - startTime)}ms`);

        // Check track settings and query for torch support
        setTimeout(() => {
          try {
            const videoEl = document.querySelector(`#${elementId} video`) as HTMLVideoElement | null;
            if (videoEl && videoEl.srcObject) {
              const stream = videoEl.srcObject as MediaStream;
              const track = stream.getVideoTracks()[0];
              if (track) {
                const settings = track.getSettings();
                const capabilities = typeof track.getCapabilities === "function" ? track.getCapabilities() as any : {};
                
                console.log("[QR Scanner] ACTIVE TRACK SETTINGS:", settings);
                console.log("[QR Scanner] ACTIVE TRACK CAPABILITIES:", capabilities);
                
                if (capabilities.torch) {
                  console.log("[QR Scanner] Torch/Flashlight capability detected!");
                  setHasTorch(true);
                } else {
                  console.log("[QR Scanner] Torch/Flashlight capability not supported on this track.");
                }
              } else {
                console.warn("[QR Scanner] No video track found on camera stream.");
              }
            } else {
              console.warn("[QR Scanner] Could not locate video element or stream source.");
            }
          } catch (e) {
            console.error("[QR Scanner] Error reading runtime track settings:", e);
          }
        }, 500);

      } catch (err) {
        console.error('[QR Scanner] Failed to start scanner:', err);
      }
    };

    const t = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(t);
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(err => console.error('Failed to stop scanner:', err));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, validationRegex, facingMode]);

  const toggleTorch = async () => {
    try {
      const videoEl = document.querySelector(`#${elementId} video`) as HTMLVideoElement | null;
      const stream = videoEl?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track && typeof track.applyConstraints === "function") {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any]
        });
        setIsTorchOn(nextState);
        console.log(`[QR Scanner] Torch state applied successfully: ${nextState}`);
      }
    } catch (err) {
      console.error("[QR Scanner] Failed to apply torch constraint:", err);
      addToast("Failed to toggle flashlight", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="qr-modal-overlay">
      <div className="qr-video-wrapper">
        <div id={elementId} className="qr-video-el" />
        <div className="qr-scan-frame" />

        <div className="qr-top-controls">
          <div style={{ display: 'flex', gap: '16px' }}>
            {hasTorch && (
              <button className={`qr-icon-btn ${isTorchOn ? 'active' : ''}`} type="button" onClick={toggleTorch}>
                <svg viewBox="0 0 24 24">
                  {isTorchOn ? (
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  ) : (
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8zm-1 2.26L10.3 8H6.07l6.93 8.31L12 18.26 13.7 14h4.23l-6.93-8.31L12 4.26z" />
                  )}
                </svg>
              </button>
            )}
            {hasMultipleCameras && (
              <button 
                className="qr-icon-btn" 
                type="button" 
                onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l1.83-2h4.24l1.83 2H20v12zM12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="qr-bottom-controls">
          <button className="qr-cancel-btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
