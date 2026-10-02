import { useEffect, useRef, useState } from 'react';
import { Camera, CameraIcon, Check, Loader2, RefreshCw, RotateCcw, X } from 'lucide-react';
import { compressProfilePhoto, formatPhotoSize } from '../lib/profilePhoto';

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

type FacingMode = 'user' | 'environment';
type CameraPhase = 'idle' | 'opening' | 'live' | 'processing' | 'preview' | 'error';

export default function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef('');
  const cameraRequestRef = useRef(0);
  const [phase, setPhase] = useState<CameraPhase>('idle');
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [deviceId, setDeviceId] = useState('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function clearPreview() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = '';
    setPreviewUrl('');
    setCapturedFile(null);
  }

  useEffect(() => {
    if (open) {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
      setPreviewUrl('');
      setCapturedFile(null);
      setPhase('idle');
      setFacingMode('user');
      setDeviceId('');
      setCameras([]);
      setError('');
      setStatus('');
      setProgress(0);
    }
    return () => {
      cameraRequestRef.current += 1;
      stopCamera();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = '';
    };
  }, [open]);

  async function startCamera(nextDeviceId = deviceId, nextFacingMode = facingMode) {
    const requestId = ++cameraRequestRef.current;
    stopCamera();
    clearPreview();
    setPhase('opening');
    setError('');
    setStatus('Opening camera…');

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot access a camera. Camera access is required to complete membership registration. Please use a supported browser and device.');
      setPhase('error');
      return;
    }

    try {
      const video: MediaTrackConstraints = nextDeviceId
        ? { deviceId: { exact: nextDeviceId }, width: { ideal: 1280 }, height: { ideal: 1280 } }
        : { facingMode: { ideal: nextFacingMode }, width: { ideal: 1280 }, height: { ideal: 1280 } };
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const availableCameras = devices.filter((item) => item.kind === 'videoinput');
      setCameras(availableCameras);
      const activeDevice = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (activeDevice) setDeviceId(activeDevice);
      setStatus('Position your face inside the guide, then capture the photo.');
      setPhase('live');
    } catch (cameraError) {
      stopCamera();
      const denied = cameraError instanceof DOMException && (cameraError.name === 'NotAllowedError' || cameraError.name === 'SecurityError');
      setError(denied
        ? 'Camera permission was denied. Allow camera access in your browser settings to complete membership registration or request a new profile photo.'
        : 'The camera could not be opened. Check that a camera is connected and not being used by another app, then try again.');
      setPhase('error');
    }
  }

  async function switchCamera() {
    if (phase !== 'live') return;
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex((camera) => camera.deviceId === deviceId);
      const next = cameras[(currentIndex + 1 + cameras.length) % cameras.length];
      setDeviceId(next.deviceId);
      await startCamera(next.deviceId, facingMode);
      return;
    }
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setDeviceId('');
    await startCamera('', nextFacing);
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight || phase !== 'live') return;

    setPhase('processing');
    setProgress(5);
    setStatus('Capturing photo…');
    setError('');
    try {
      const longestSide = 960;
      const scale = Math.min(1, longestSide / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('This browser could not capture the photo. Please try again.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('The photo could not be captured.')), 'image/jpeg', 0.92));
      stopCamera();
      const temporaryCapture = new File([blob], `live-camera-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      const prepared = await compressProfilePhoto(temporaryCapture, (nextProgress, message) => {
        setProgress(nextProgress);
        setStatus(message);
      });
      const nextPreviewUrl = URL.createObjectURL(prepared.file);
      previewUrlRef.current = nextPreviewUrl;
      setCapturedFile(prepared.file);
      setPreviewUrl(nextPreviewUrl);
      setStatus(`${prepared.width} × ${prepared.height} · ${formatPhotoSize(prepared.compressedBytes)} · ready to use`);
      setProgress(100);
      setPhase('preview');
    } catch (captureError) {
      stopCamera();
      setError(captureError instanceof Error ? captureError.message : 'The photo could not be captured. Please try again.');
      setPhase('error');
    }
  }

  function usePhoto() {
    if (!capturedFile) return;
    onCapture(capturedFile);
    onClose();
  }

  async function retake() {
    clearPreview();
    setProgress(0);
    await startCamera(deviceId, facingMode);
  }

  if (!open) return null;

  return (
    <div className="camera-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="camera-modal" role="dialog" aria-modal="true" aria-labelledby="camera-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="camera-modal-heading">
          <div><p className="eyebrow">Live verification</p><h2 id="camera-title">Take your profile photo</h2></div>
          <button type="button" className="camera-close" onClick={onClose} aria-label="Close camera"><X /></button>
        </div>
        <div className={`camera-viewport ${facingMode === 'user' ? 'camera-front' : ''}`}>
          <video ref={videoRef} playsInline muted aria-label="Live camera preview" />
          {phase === 'preview' && previewUrl && <img src={previewUrl} alt="Captured profile preview" />}
          {phase === 'idle' && <div className="camera-message"><CameraIcon /><strong>Camera access is required</strong><span>Use your front camera or webcam to take a live identity photo.</span></div>}
          {(phase === 'opening' || phase === 'processing') && <div className="camera-message"><Loader2 className="animate-spin" /><span>{status}</span>{phase === 'processing' && <progress max="100" value={progress} />}</div>}
          {phase === 'error' && <div className="camera-message camera-error"><CameraIcon /><strong>Camera unavailable</strong><span>{error}</span></div>}
          {phase === 'live' && <div className="camera-guide" aria-hidden="true" />}
        </div>
        {phase === 'live' && cameras.length > 1 && <label className="camera-selector">Camera<select value={deviceId} onChange={(event) => { setDeviceId(event.target.value); void startCamera(event.target.value, facingMode); }}>{cameras.map((camera, index) => <option value={camera.deviceId} key={camera.deviceId}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>}
        <p className={`camera-status ${phase === 'error' ? 'camera-error' : ''}`} aria-live="polite">{phase !== 'error' && status}</p>
        <div className="camera-actions">
          {phase === 'idle' && <><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" onClick={() => void startCamera()}><Camera size={17} /> Open Camera</button></>}
          {phase === 'live' && <><button type="button" className="btn-secondary" onClick={() => void switchCamera()}><RefreshCw size={17} /> Switch camera</button><button type="button" className="btn-primary" onClick={() => void takePhoto()}><Camera size={17} /> Capture Photo</button></>}
          {phase === 'preview' && <><button type="button" className="btn-secondary" onClick={() => void retake()}><RotateCcw size={17} /> Retake</button><button type="button" className="btn-primary" onClick={usePhoto}><Check size={17} /> Use Photo</button></>}
          {phase === 'error' && <><button type="button" className="btn-secondary" onClick={onClose}>Close</button><button type="button" className="btn-primary" onClick={() => void startCamera()}><RefreshCw size={17} /> Try again</button></>}
          {(phase === 'opening' || phase === 'processing') && <button type="button" className="btn-secondary camera-cancel-only" onClick={onClose}>Cancel</button>}
        </div>
        <p className="camera-help">A live camera photo is required. Gallery uploads and existing image files are not accepted.</p>
      </section>
    </div>
  );
}
