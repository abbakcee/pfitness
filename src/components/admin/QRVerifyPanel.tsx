import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';
import { Camera, CheckCircle2, Clock3, Loader2, Search, ShieldAlert, StopCircle, XCircle } from 'lucide-react';
import { MemberPhoto, StatusPill } from '../PortalUI';
import { scanMember } from '../../lib/membershipApi';
import { formatCalendarDate } from '../../lib/config';
import type { ScanResult } from '../../lib/types';
import './QRVerifyPanel.css';

const ID = 'pf-v1-scanner-reader';

export default function QRVerifyPanel() {
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  async function verify(identifier: string) {
    setBusy(true);
    setError('');
    try { setResult(await scanMember(identifier.trim())); }
    catch { setError('Could not verify this code. Check the connection and try again.'); }
    finally { setBusy(false); }
  }

  async function stop(updateState = true) {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try { if (scanner.isScanning) await scanner.stop(); } catch { /* Camera may already be stopped. */ }
      try { scanner.clear(); } catch { /* Reader may already be empty. */ }
    }
    if (updateState && mountedRef.current) setScanning(false);
  }

  async function openCamera(selected: string) {
    const scanner = new Html5Qrcode(ID, { verbose: false });
    scannerRef.current = scanner;
    setScanning(true);
    await scanner.start(
      selected,
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.333334 },
      async (text) => { await stop(); await verify(text); },
      () => undefined,
    );
  }

  async function start() {
    setError('');
    setResult(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera scanning requires a secure browser page. Use localhost on this laptop, or enter the member ID below.');
      return;
    }
    try {
      const available = await Html5Qrcode.getCameras();
      if (!available.length) {
        setError('No camera was found. Connect or enable a webcam, or enter the member ID below.');
        return;
      }
      setCameras(available);
      const selected = cameraId && available.some((camera) => camera.id === cameraId) ? cameraId : available[0].id;
      setCameraId(selected);
      await stop(false);
      await openCamera(selected);
    } catch (cameraError) {
      await stop();
      const denied = cameraError instanceof DOMException && cameraError.name === 'NotAllowedError';
      setError(denied
        ? 'Camera permission was blocked. Click the camera icon in the browser address bar, allow access, then try again.'
        : 'The webcam could not start. Close other apps using it, choose another camera, or enter the member ID below.');
    }
  }

  async function changeCamera(nextId: string) {
    setCameraId(nextId);
    if (!scanning) return;
    await stop();
    try { await openCamera(nextId); }
    catch { await stop(); setError('That camera could not start. Choose another camera or enter the member ID below.'); }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; void stop(false); };
  }, []);

  return <div className="scanner-grid">
    <section className="scanner-panel">
      <div className="section-heading"><p className="eyebrow">Camera</p><h2>Scan membership QR</h2><p>Active members are checked in immediately. Multiple scans per day are allowed.</p></div>
      <div className={`scanner-camera ${scanning ? 'on' : ''}`}>
        {!scanning && <div className="scanner-placeholder"><Camera size={48} /><span>Camera preview will appear here</span></div>}
        <div id={ID} className="scanner-reader" />
      </div>
      {cameras.length > 1 && <label className="scanner-camera-select">Camera<select value={cameraId} onChange={(event) => void changeCamera(event.target.value)}>{cameras.map((camera, index) => <option value={camera.id} key={camera.id}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>}
      <button className={scanning ? 'btn-secondary' : 'btn-primary'} onClick={() => void (scanning ? stop() : start())}>{scanning ? <><StopCircle />Stop camera</> : <><Camera />Start scanner</>}</button>
      <div className="manual-scan"><span>or enter member ID</span><div><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="PF-XXXXXXXX" onKeyDown={(event) => event.key === 'Enter' && value && void verify(value)} /><button onClick={() => value && void verify(value)} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Search />}</button></div></div>
      {error && <p className="form-error">{error}</p>}
    </section>
    <section className="scan-result-zone">{result ? <Result result={result} /> : <div className="scan-idle"><ShieldAlert /><h2>Waiting for a scan</h2><p>The member photo and access status will appear here.</p></div>}</section>
  </div>;
}

function Result({ result }: { result: ScanResult }) {
  if (result.result === 'not_found') return <div className="scan-result result-not_found"><XCircle /><p className="eyebrow">No match</p><h2>Member not found</h2><p>Check the QR or member ID and try again.</p></div>;
  const status = result.result;
  const Icon = status === 'active' ? CheckCircle2 : status === 'pending' ? Clock3 : XCircle;
  return <div className={`scan-result result-${status}`}><Icon /><p className="eyebrow">{status === 'active' ? 'Access approved' : status === 'pending' ? 'Payment required' : status === 'expired' ? 'Renewal required' : 'Access blocked'}</p><h2>{status === 'active' ? 'Active member' : status === 'pending' ? 'Payment pending' : status === 'expired' ? 'Membership expired' : 'Access deactivated'}</h2>{result.profile && <div className="scan-profile"><MemberPhoto profile={result.profile} /><div><strong>{result.profile.full_name}</strong><span>{result.profile.member_id}</span><StatusPill status={status} /></div></div>}{result.membership && <div className="scan-details"><p><span>Plan</span><strong>{result.membership.plan_name}</strong></p><p><span>Expiry</span><strong>{formatCalendarDate(result.membership.end_date, 'Not active')}</strong></p></div>}{result.check_in_recorded && <div className="checkin-success">Check-in recorded</div>}{status === 'expired' && <a className="btn-primary" href={`/admin/members?id=${result.profile?.id}`}>Open renewal actions</a>}</div>;
}
