import { useEffect, useRef, useState } from 'react';
import { Camera, CameraIcon, RefreshCw, X } from 'lucide-react';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

type FacingMode = 'user' | 'environment';

export default function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [deviceId, setDeviceId] = useState('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function startCamera() {
      setLoading(true);
      setError('');
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot open a camera. Please use the upload option instead.');
        setLoading(false);
        return;
      }

      try {
        const video: MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 1280 } }
          : { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 1280 } };
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCameras(devices.filter((item) => item.kind === 'videoinput'));
      } catch (cameraError) {
        if (!cancelled) {
          const denied = cameraError instanceof DOMException && cameraError.name === 'NotAllowedError';
          setError(denied
            ? 'Camera access was blocked. Allow camera permission in your browser, or upload a photo instead.'
            : 'The camera could not be opened. Make sure another app is not using it, or upload a photo instead.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open, deviceId, facingMode]);

  function switchCamera() {
    if (cameras.length > 1) {
      const activeId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId;
      const currentIndex = cameras.findIndex((camera) => camera.deviceId === activeId);
      const next = cameras[(currentIndex + 1 + cameras.length) % cameras.length];
      setDeviceId(next.deviceId);
      return;
    }
    setDeviceId('');
    setFacingMode((current) => current === 'user' ? 'environment' : 'user');
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxSize = 1600;
    const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('The photo could not be captured. Please try again.');
        return;
      }
      onCapture(new File([blob], `membership-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onClose();
    }, 'image/jpeg', 0.9);
  }

  if (!open) return null;

  return (
    <div className="camera-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="camera-modal-heading">
          <div><p className="eyebrow">Verification photo</p><h2 id="camera-title">Take your photo</h2></div>
          <button type="button" className="camera-close" onClick={onClose} aria-label="Close camera"><X /></button>
        </div>
        <div className={`camera-viewport ${facingMode === 'user' && !deviceId ? 'camera-front' : ''}`}>
          <video ref={videoRef} playsInline muted aria-label="Live camera preview" />
          {loading && <div className="camera-message"><Camera className="animate-pulse" /><span>Opening camera…</span></div>}
          {error && <div className="camera-message camera-error"><CameraIcon /><span>{error}</span></div>}
          {!loading && !error && <div className="camera-guide" aria-hidden="true" />}
        </div>
        {cameras.length > 1 && <label className="camera-selector">Camera<select value={deviceId || streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId || ''} onChange={(event) => setDeviceId(event.target.value)}>{cameras.map((camera, index) => <option value={camera.deviceId} key={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>}
        <div className="camera-actions">
          <button type="button" className="btn-secondary" onClick={switchCamera} disabled={loading}><RefreshCw size={17} /> Switch camera</button>
          <button type="button" className="btn-primary" onClick={takePhoto} disabled={loading || Boolean(error)}><Camera size={17} /> Take photo</button>
        </div>
        <p className="camera-help">Choose the front or back camera on mobile, or any available webcam on a computer.</p>
      </section>
    </div>
  );
}
