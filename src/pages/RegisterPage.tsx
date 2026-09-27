import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, ShieldCheck, Upload } from 'lucide-react';
import CameraCapture from '../components/CameraCapture';
import SimpleHeader from '../components/SimpleHeader';
import { MEMBERSHIP_PLANS, PLAN_ORDER, formatNaira, type PlanKey } from '../lib/config';
import { registerMember } from '../lib/membershipApi';
import { useAuth } from '../lib/AuthContext';

const steps = ['Account', 'Photo', 'Plan', 'Confirm'];
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const auth = useAuth();
  const uploadRef = useRef<HTMLInputElement>(null);
  const initial = PLAN_ORDER.includes(params.get('plan') as PlanKey) ? params.get('plan') as PlanKey : '3_months';
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', plan: initial });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  function next() {
    setError('');
    if (step === 0) {
      if (form.fullName.trim().length < 2) return setError('Enter your full name.');
      if (!emailRe.test(form.email)) return setError('Enter a valid email address.');
      if (form.phone.replace(/\D/g, '').length < 7) return setError('Enter a valid phone number.');
      if (form.password.length < 8) return setError('Use at least 8 characters for your password.');
    }
    if (step === 1 && !photo) return setError('Take or upload a clear front-facing photo for staff verification.');
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const profile = await registerMember({ ...form, photo, preview });
      if (auth.isDemo) auth.startDemoMemberSession(profile.id, form.email);
      if ('requiresEmailConfirmation' in profile && profile.requiresEmailConfirmation) {
        nav('/login', { replace: true, state: { registrationEmail: form.email } });
      } else {
        nav('/member');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create your membership.');
    } finally {
      setBusy(false);
    }
  }

  function choose(file: File) {
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.');
    if (file.size > 5_000_000) return setError('Please choose an image smaller than 5 MB.');
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setError('');
  }

  return (
    <div className="auth-page">
      <SimpleHeader subtitle="Membership registration" />
      <main className="registration-wrap">
        <div className="registration-intro">
          <p className="eyebrow">Join P-Fitness</p>
          <h1>Build your membership</h1>
          <p>Create your account now. Payment happens physically at the gym before activation.</p>
        </div>
        <ol className="stepper">
          {steps.map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'done' : ''}><span>{index < step ? <Check size={15} /> : index + 1}</span><b>{label}</b></li>)}
        </ol>
        <section className="registration-card">
          {step === 0 && <div className="form-card">
            <div className="section-heading"><p className="eyebrow">Step 1 of 4</p><h2>Your account</h2></div>
            <label>Full name<input autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Your full name" /></label>
            <div className="form-two">
              <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
              <label>Phone number<input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0700 000 0000" /></label>
            </div>
            <label>Password<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>
          </div>}

          {step === 1 && <div>
            <div className="section-heading"><p className="eyebrow">Step 2 of 4</p><h2>Verification photo</h2><p>Use a clear, front-facing photo. Staff will see it when your QR is scanned.</p></div>
            <div className={`photo-drop ${preview ? 'has-photo' : ''}`}>
              {preview ? <img src={preview} alt="Profile preview" /> : <><Camera size={38} /><strong>Add your verification photo</strong><span>Take a new photo or upload an existing one</span></>}
              <div className="photo-choice-actions">
                <button type="button" className="btn-primary" onClick={() => setCameraOpen(true)}><Camera size={17} />{preview ? 'Retake photo' : 'Use camera'}</button>
                <button type="button" className="btn-secondary" onClick={() => uploadRef.current?.click()}><Upload size={17} />{preview ? 'Upload another' : 'Upload photo'}</button>
              </div>
              <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => event.target.files?.[0] && choose(event.target.files[0])} />
              <small>JPG, PNG or WebP · Maximum 5 MB</small>
            </div>
          </div>}

          {step === 2 && <div>
            <div className="section-heading"><p className="eyebrow">Step 3 of 4</p><h2>Choose one plan</h2><p>Your plan stays pending until staff confirms your physical payment.</p></div>
            <div className="plan-choice-grid">{PLAN_ORDER.map((key) => {
              const plan = MEMBERSHIP_PLANS[key];
              return <button key={key} onClick={() => setForm({ ...form, plan: key })} className={`plan-choice ${form.plan === key ? 'selected' : ''}`}><span className="plan-check">{form.plan === key && <Check size={15} />}</span><strong>{plan.label}</strong><span>{formatNaira(plan.price)}</span><small>{plan.durationLabel}</small></button>;
            })}</div>
          </div>}

          {step === 3 && <div>
            <div className="section-heading"><p className="eyebrow">Step 4 of 4</p><h2>Confirm membership</h2></div>
            <div className="confirm-profile">{preview && <img src={preview} alt="Profile" />}<div><strong>{form.fullName}</strong><span>{form.email}</span><span>{form.phone}</span></div></div>
            <div className="confirm-plan"><span>Selected plan</span><strong>{MEMBERSHIP_PLANS[form.plan].label}</strong><b>{formatNaira(MEMBERSHIP_PLANS[form.plan].price)}</b></div>
            <div className="offline-note"><ShieldCheck /><p><strong>No online payment.</strong> Visit P-Fitness to pay. Your activation date becomes the plan start date.</p></div>
          </div>}

          {error && <p className="form-error">{error}</p>}
          <div className="registration-actions">
            {step > 0 ? <button className="btn-secondary" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} />Back</button> : <Link className="btn-secondary" to="/"><ArrowLeft size={17} />Home</Link>}
            <button className="btn-primary" disabled={busy} onClick={step === 3 ? submit : next}>{busy ? <Loader2 className="animate-spin" size={18} /> : step === 3 ? 'Create membership' : <>Continue<ArrowRight size={17} /></>}</button>
          </div>
        </section>
        <p className="auth-switch">Already registered? <Link to="/login">Member login</Link></p>
      </main>
      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={choose} />
    </div>
  );
}
