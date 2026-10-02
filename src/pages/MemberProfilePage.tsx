import { useState } from 'react';
import { Camera, Check, Loader2, LogOut, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CameraCapture from '../components/CameraCapture';
import { MemberPhoto, PageHeading } from '../components/PortalUI';
import { useMemberData } from '../lib/memberContext';
import { useAuth } from '../lib/AuthContext';
import { requestPhoto, updatePassword, updateProfile } from '../lib/membershipApi';
import { ensureCompressedProfilePhoto, formatPhotoSize } from '../lib/profilePhoto';

export default function MemberProfilePage() {
  const { data, refresh } = useMemberData();
  const auth = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(data.profile.full_name);
  const [phone, setPhone] = useState(data.profile.phone);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoStatus, setPhotoStatus] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await updateProfile(data.profile.id, { full_name: name, phone });
      await refresh();
      setNotice('Profile saved.');
    } catch {
      setError('Could not save your changes.');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      setPassword('');
      setNotice('Password updated.');
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  }

  async function photo(file: File) {
    setPhotoBusy(true);
    setPhotoProgress(0);
    setPhotoStatus('Preparing photo…');
    setNotice('');
    setError('');
    let preview = '';
    try {
      const prepared = await ensureCompressedProfilePhoto(file);
      setPhotoProgress(94);
      setPhotoStatus(`Uploading compressed photo (${formatPhotoSize(prepared.size)})…`);
      preview = URL.createObjectURL(prepared);
      await requestPhoto(data.profile.id, prepared, preview);
      setPhotoProgress(100);
      setPhotoStatus('Photo update uploaded');
      await refresh();
      setNotice('Photo update sent for staff approval. Your verified photo remains active.');
    } catch (photoError) {
      setPhotoStatus('');
      setError(photoError instanceof Error ? photoError.message : 'Could not process or upload that photo.');
    } finally {
      if (preview && !auth.isDemo) URL.revokeObjectURL(preview);
      setPhotoBusy(false);
    }
  }

  return <div>
    <PageHeading eyebrow="Account" title="Profile & security" copy="Update your details, password or verification photo." />
    <div className="profile-grid">
      <section className="app-card profile-photo-card">
        <MemberPhoto profile={data.profile} />
        <div><h2>{data.profile.full_name}</h2><p className="member-id">{data.profile.member_id}</p></div>
        <button className="btn-secondary" disabled={photoBusy || Boolean(data.photoRequest)} onClick={() => setCameraOpen(true)}>
          {photoBusy ? <Loader2 className="animate-spin" size={17} /> : <Camera size={17} />}
          {photoBusy ? 'Processing photo…' : 'Request new photo'}
        </button>
        <small className="photo-upload-help"><Camera size={14} />A new live camera photo is required. Gallery uploads are not accepted.</small>
        {photoBusy && <div className="photo-processing" role="status"><Loader2 className="animate-spin" size={17} /><span>{photoStatus}</span><progress max="100" value={photoProgress} /></div>}
        {!photoBusy && photoStatus && <p className="photo-ready"><Check size={15} />{photoStatus}</p>}
        {data.photoRequest && <p className="pending-note">Photo update pending staff approval.</p>}
      </section>
      <div className="space-y-4">
        <section className="app-card form-card">
          <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email<input value={data.profile.email} disabled /></label>
          <label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <button className="btn-primary" onClick={save} disabled={busy || photoBusy}>{busy ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}Save details</button>
        </section>
        <section className="app-card form-card">
          <div className="section-heading"><p className="eyebrow">Security</p><h2>Change password</h2></div>
          <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
          <button className="btn-secondary" onClick={changePassword} disabled={busy || photoBusy || password.length < 8}>Update password</button>
        </section>
        {notice && <p className="form-notice">{notice}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
    <button className="danger-link" onClick={async () => { await auth.signOut(); nav('/login', { replace: true }); }}><LogOut size={18} />Log out</button>
    <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={(file) => void photo(file)} />
  </div>;
}
