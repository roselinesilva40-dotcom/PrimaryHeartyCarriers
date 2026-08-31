import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import paypalLogo from '@assets/file_0000000084d881f4a9614f1a00a0b98b_1788125687463.png';
import bankTransferLogo from '@assets/Screenshot_20260830-142955_1788125687016.jpg';
import {
  ArrowDownToLine, ArrowRight, BadgeCheck, BarChart3, Bell, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, Clock3, Copy, CreditCard, FileImage, Flame, Gift, History, Home as HomeIcon,
  Landmark, LayoutDashboard, LogOut, Menu, MessageCircle, Play, RefreshCw, ShieldCheck, Timer,
  TrendingUp, UserRound, Users, WalletCards, X, XCircle,
} from 'lucide-react';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const stripBase = (path: string) => basePath && path.startsWith(basePath)
  ? path.slice(basePath.length) || '/'
  : path;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#1A2980',
    colorForeground: '#182653',
    colorMutedForeground: '#718098',
    colorDanger: '#bd4545',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#182653',
    colorNeutral: '#dce4ee',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#182653] font-extrabold',
    headerSubtitle: 'text-[#718098]',
    socialButtonsBlockButtonText: 'text-[#3f4d67] font-bold',
    formFieldLabel: 'text-[#52617b] font-bold',
    footerActionLink: 'text-[#1a8f9e] font-bold',
    footerActionText: 'text-[#718098]',
    dividerText: 'text-[#718098]',
    identityPreviewEditButton: 'text-[#1a8f9e]',
    formFieldSuccessText: 'text-[#168d94]',
    alertText: 'text-[#bd4545]',
    logoBox: 'mb-5',
    logoImage: 'max-h-11',
    socialButtonsBlockButton: 'border-[#dce4ee] bg-white hover:bg-[#f5f8fb]',
    formButtonPrimary: 'bg-gradient-to-r from-[#1A2980] to-[#26bfc0] hover:opacity-95',
    formFieldInput: 'border-[#dce4ee] bg-white text-[#182653]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#dce4ee]',
    alert: 'bg-[#fff0ef] border-[#f0d4d1]',
    otpCodeFieldInput: 'border-[#dce4ee] text-[#182653]',
    formFieldRow: 'mb-4',
    main: 'px-2',
  },
};

type User = { id: string; name: string; email: string; password?: string; isAdmin: boolean; balance: number; videosWatched: number; referrals: number; referralCode: string; referredBy?: string; createdAt: string };
type PayoutDetails = { email: string; country?: string; city?: string; firstName?: string; lastName?: string; rib?: string };
type Withdrawal = { id: string; userId: string; amount: number; method: 'PayPal' | 'Virement'; status: 'pending' | 'approved' | 'rejected'; createdAt: string; kycImage?: string; voucherImage?: string; payoutDetails?: PayoutDetails };
type VoucherPayment = { id: string; userId: string; amount: 50; status: 'pending' | 'approved' | 'rejected'; createdAt: string; reviewedAt?: string; voucherImage: string };
type SupportReply = { id: string; author: 'user' | 'admin'; text: string; createdAt: string };
type SupportMessage = { id: string; userId: string; userName: string; userEmail: string; subject: string; message: string; status: 'open' | 'answered'; adminReply?: string; replies?: SupportReply[]; createdAt: string; repliedAt?: string };
type ActivityLog = { id: string; type: string; description: string; createdAt: string };
type Notice = { message: string; kind?: 'success' | 'error' };

const STORAGE = { users: 'gainease-users', withdrawals: 'gainease-withdrawals', vouchers: 'gainease-voucher-payments', support: 'gainease-support-messages', logs: 'gainease-logs', session: 'gainease-jwt', failed: 'gainease-failed-login' };
const PENDING_REFERRAL_KEY = 'gainease-pending-referral-code';
const defaultUsers: User[] = [{
  id: 'legacy-demo-user',
  name: 'Camille Martin',
  email: 'camille@gainease.fr',
  password: 'gainease2025',
  isAdmin: false,
  balance: 72.5,
  videosWatched: 14,
  referrals: 2,
  referralCode: 'GAIN-CAMI7',
  createdAt: '2025-01-10T08:00:00.000Z',
}];
const liveNames = ['Jean Dupont', 'Marie Martin', 'Pierre Durand', 'Sophie Lefèvre', 'Thomas Bernard', 'Émilie Petit', 'Nicolas Robert', 'Camille Richard', 'Alexandre Dubois', 'Julie Moreau', 'Antoine Simon', 'Laura Michel', 'David Laurent', 'Claire Martinez', 'Julien Legrand', 'Manon Fontaine', 'Quentin Rousseau', 'Chloé Girard', 'Mathieu Vincent', 'Élise Muller', 'Baptiste Morel', 'Léa Garnier', 'Maxime Chevalier', 'Inès Barbier', 'Adrien Fernandes', 'Lucie Fabre', 'Olivier Gaillard', 'Nina Pons', 'Sébastien Mercier', 'Audrey Brun', 'Romain Rey', 'Anaïs Vidal', 'Jérôme Lopez', 'Zoé Lemoine', 'Hugo Lefebvre', 'Sarah Herve', 'Fabien Perrin', 'Emma Lefort', 'Grégory Morin', 'Océane Martin'];
const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const ADMIN_EMAIL = 'senogi2445@slotbeer.com';
const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

type ClerkProfile = {
  id: string;
  fullName?: string | null;
  firstName?: string | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  primaryEmailAddress?: { emailAddress: string } | null;
};

function ensureLocalUser(profile: ClerkProfile): User {
  const users = read<User[]>(STORAGE.users, []);
  const email = profile.primaryEmailAddress?.emailAddress
    ?? profile.emailAddresses?.[0]?.emailAddress
    ?? `${profile.id}@gainease.local`;
  const existing = users.find((entry) => entry.id === profile.id || entry.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    localStorage.removeItem(PENDING_REFERRAL_KEY);
    if (!existing.isAdmin && email.toLowerCase() === ADMIN_EMAIL) {
      const promoted = { ...existing, isAdmin: true };
      write(STORAGE.users, users.map((entry) => entry.id === existing.id ? promoted : entry));
      return promoted;
    }
    return existing;
  }

  const name = profile.fullName || profile.firstName || email.split('@')[0];
  const pendingReferralCode = localStorage.getItem(PENDING_REFERRAL_KEY)?.trim().toUpperCase() || '';
  const referrer = pendingReferralCode ? users.find((entry) => entry.referralCode.toUpperCase() === pendingReferralCode && entry.id !== profile.id) : undefined;
  const now = new Date().toISOString();
  const newUser: User = {
    id: profile.id,
    name,
    email,
    isAdmin: users.length === 0 || email.toLowerCase() === ADMIN_EMAIL,
    balance: 0,
    videosWatched: 0,
    referrals: 0,
    referralCode: `GAIN-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    referredBy: referrer?.id,
    createdAt: now,
  };
  const updatedUsers = referrer
    ? users.map((entry) => entry.id === referrer.id ? { ...entry, balance: Math.round((entry.balance + 10) * 100) / 100, referrals: entry.referrals + 1 } : entry)
    : users;
  write(STORAGE.users, [...updatedUsers, newUser]);
  localStorage.removeItem(PENDING_REFERRAL_KEY);
  write(STORAGE.logs, [
    ...read<ActivityLog[]>(STORAGE.logs, []),
    { id: uid('log'), type: 'account', description: `Compte synchronisé pour ${name}`, createdAt: new Date().toISOString() },
    ...(referrer ? [{ id: uid('log'), type: 'referral', description: `${referrer.name} a gagné 10 € grâce au parrainage de ${name}`, createdAt: now }] : []),
  ]);
  return newUser;
}

function celebrate() {
  const w = window as Window & { confetti?: (options: Record<string, unknown>) => void };
  if (w.confetti) { w.confetti({ particleCount: 100, spread: 70, origin: { y: .65 }, colors: ['#1A2980', '#26D0CE', '#f8bd59'] }); return; }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
  script.onload = () => w.confetti?.({ particleCount: 100, spread: 70, origin: { y: .65 }, colors: ['#1A2980', '#26D0CE', '#f8bd59'] });
  document.body.appendChild(script);
}

function Logo({ light = false }: { light?: boolean }) {
  return <Link href="/home" className="flex items-center gap-2.5 no-underline" data-testid="link-logo">
    <span className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-white/15 text-[#26D0CE]' : 'bg-gradient-to-br from-[#1A2980] to-[#26D0CE] text-white'}`}><TrendingUp size={19} strokeWidth={2.8} /></span>
    <span className={`text-[17px] font-extrabold tracking-[-.04em] ${light ? 'text-white' : 'text-[#182653]'}`}>Gain<span className={light ? 'text-[#26D0CE]' : 'text-[#1faeb5]'}>Ease</span></span>
  </Link>;
}

function Toast({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  if (!notice) return null;
  return <div className={`fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl md:bottom-6 ${notice.kind === 'error' ? 'bg-[#bd4545]' : 'bg-[#182653]'}`} role="status" data-testid="status-toast">
    {notice.kind === 'error' ? <XCircle size={17} /> : <CheckCircle2 size={17} />} {notice.message}
    <button onClick={onClose} className="ml-2 text-white/70 hover:text-white" aria-label="Fermer" data-testid="button-close-toast"><X size={15} /></button>
  </div>;
}

function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return <div className="app-noise min-h-[100dvh] bg-[#f7fafc] text-[#182653]">
    <div className="grid min-h-[100dvh] lg:grid-cols-[.85fr_1.15fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#1A2980] via-[#1a378a] to-[#26D0CE] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 top-24 h-72 w-72 rounded-full border-[40px] border-white/10" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border-[55px] border-[#26D0CE]/25" />
        <Logo light />
        <div className="relative max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><ShieldCheck size={14} /> Des gains, sans zones grises</div>
          <h2 className="text-5xl font-extrabold leading-[1.04] tracking-[-.055em]">Votre temps mérite mieux qu’un écran de chargement.</h2>
          <p className="mt-6 max-w-sm text-[15px] leading-7 text-white/75">Suivez vos gains, regardez des vidéos courtes et retirez dès que votre solde atteint 100 €.</p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-2xl font-extrabold">5 €</p><p className="mt-1 text-xs text-white/65">par vidéo validée</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-2xl font-extrabold">10 €</p><p className="mt-1 text-xs text-white/65">par filleul actif</p></div>
          </div>
        </div>
        <p className="relative text-xs text-white/55">Une expérience pensée pour rester simple.</p>
      </aside>
      <main className="flex min-h-[100dvh] items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-[430px] animate-rise">
          <div className="mb-10 lg:hidden"><Logo /></div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#26aeb4]">L’espace qui avance avec vous</p>
          <h1 className="text-3xl font-extrabold tracking-[-.04em] text-[#182653] sm:text-[34px]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#718098]">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  </div>;
}

function Field({ label, type = 'text', value, onChange, placeholder, required = true, minLength, testId }: { label: string; type?: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; minLength?: number; testId: string }) {
  return <label className="block">
    <span className="mb-2 block text-xs font-bold text-[#52617b]">{label}</span>
    <input data-testid={testId} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} minLength={minLength} className="h-12 w-full rounded-xl border border-[#dce4ee] bg-white px-4 text-sm text-[#182653] outline-none transition placeholder:text-[#a4afbf] focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" />
  </label>;
}

function Login({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [captcha, setCaptcha] = useState(''); const [busy, setBusy] = useState(false);
  const failed = read<{ count: number; lockedUntil: number; captcha: boolean }>(STORAGE.failed, { count: 0, lockedUntil: 0, captcha: false });
  const locked = failed.lockedUntil > Date.now();
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (locked) return;
    if (failed.captcha && captcha.trim().toLowerCase() !== 'gain') { onNotice({ message: 'Entrez « gain » pour confirmer que vous êtes humain.', kind: 'error' }); return; }
    setBusy(true);
    setTimeout(() => {
      const users = read<User[]>(STORAGE.users, defaultUsers); const found = users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password);
      if (!found) {
        const nextCount = failed.count + 1; const next = { count: nextCount, lockedUntil: nextCount >= 10 ? Date.now() + 15 * 60 * 1000 : 0, captcha: nextCount >= 5 }; write(STORAGE.failed, next);
        onNotice({ message: nextCount >= 10 ? 'Trop de tentatives. Réessayez dans 15 minutes.' : 'Email ou mot de passe incorrect.', kind: 'error' }); setBusy(false); return;
      }
      write(STORAGE.failed, { count: 0, lockedUntil: 0, captcha: false }); write(STORAGE.session, btoa(JSON.stringify({ sub: found.id, exp: Date.now() + 7 * 86400000 }))); setLocation(found.isAdmin ? '/admin' : '/home');
    }, 420);
  };
  return <AuthLayout title="Ravi de vous revoir." subtitle="Connectez-vous pour retrouver votre solde et continuer à faire grandir vos gains.">
    <form onSubmit={submit} className="mt-8 space-y-5">
      <Field label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.fr" testId="input-login-email" />
      <Field label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="Votre mot de passe" testId="input-login-password" />
      {failed.captcha && !locked && <Field label="Vérification anti-robot — écrivez gain" value={captcha} onChange={setCaptcha} placeholder="gain" testId="input-captcha" />}
      <button disabled={busy || locked} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-login">{busy ? 'Connexion…' : locked ? 'Connexion bloquée' : 'Se connecter'} {!busy && !locked && <ArrowRight size={17} />}</button>
      <button type="button" onClick={() => { onNotice({ message: 'La connexion Google sera disponible prochainement.' }); }} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dce4ee] bg-white text-sm font-bold text-[#3f4d67] transition hover:bg-[#f5f8fb]" data-testid="button-google"><span className="grid h-5 w-5 place-items-center rounded-full border border-[#dce4ee] text-xs font-extrabold text-[#1A2980]">G</span> Continuer avec Google</button>
      <p className="pt-3 text-center text-sm text-[#718098]">Pas encore de compte ? <Link href="/register" className="font-bold text-[#1a8f9e] hover:underline" data-testid="link-register">Créer un compte</Link></p>
    </form>
  </AuthLayout>;
}

function Register({ onNotice }: { onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation(); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [terms, setTerms] = useState(false); const [busy, setBusy] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault(); const users = read<User[]>(STORAGE.users, []);
    if (password.length < 8) { onNotice({ message: 'Le mot de passe doit contenir 8 caractères minimum.', kind: 'error' }); return; }
    if (password !== confirm) { onNotice({ message: 'Les mots de passe ne correspondent pas.', kind: 'error' }); return; }
    if (!terms) { onNotice({ message: 'Acceptez les CGU pour continuer.', kind: 'error' }); return; }
    if (users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) { onNotice({ message: 'Cette adresse est déjà utilisée.', kind: 'error' }); return; }
    setBusy(true); const first = users.length === 0; const newUser: User = { id: uid('user'), name: name.trim(), email: email.trim(), password, isAdmin: first, balance: 0, videosWatched: 0, referrals: 0, referralCode: `GAIN-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, createdAt: new Date().toISOString() };
    write(STORAGE.users, [...users, newUser]); write(STORAGE.session, btoa(JSON.stringify({ sub: newUser.id, exp: Date.now() + 7 * 86400000 }))); write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'account', description: `Compte créé pour ${newUser.name}`, createdAt: new Date().toISOString() }]); setLocation(first ? '/admin' : '/home');
  };
  return <AuthLayout title="Commencez simplement." subtitle="Créez votre espace GainEase en moins d’une minute.">
    <form onSubmit={submit} className="mt-8 space-y-4">
      <Field label="Nom complet" value={name} onChange={setName} placeholder="Camille Martin" testId="input-register-name" />
      <Field label="Adresse email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.fr" testId="input-register-email" />
      <Field label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="8 caractères minimum" minLength={8} testId="input-register-password" />
      <Field label="Confirmer le mot de passe" type="password" value={confirm} onChange={setConfirm} placeholder="Retapez votre mot de passe" testId="input-register-confirm" />
      <label className="flex items-start gap-3 pt-1 text-xs leading-5 text-[#718098]"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} className="mt-1 accent-[#1A2980]" data-testid="input-terms" /> J’accepte les <button type="button" className="font-bold text-[#1a8f9e]" onClick={() => onNotice({ message: 'Les CGU sont disponibles auprès du support GainEase.' })} data-testid="button-terms">conditions générales d’utilisation</button>.</label>
      <button disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 transition hover:-translate-y-0.5 disabled:opacity-50" data-testid="button-register">{busy ? 'Création…' : 'Créer mon compte'} {!busy && <ArrowRight size={17} />}</button>
      <p className="pt-2 text-center text-sm text-[#718098]">Déjà membre ? <Link href="/login" className="font-bold text-[#1a8f9e]" data-testid="link-login">Se connecter</Link></p>
    </form>
  </AuthLayout>;
}

function SignInPage() {
  return <div className="min-h-[100dvh] bg-[#f7fafc] px-4 py-8 sm:px-6">
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[520px] items-center justify-center">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  </div>;
}

function SignUpPage() {
  const [referralCode, setReferralCode] = useState(() => localStorage.getItem(PENDING_REFERRAL_KEY) || '');
  const updateReferralCode = (value: string) => {
    const normalized = value.toUpperCase();
    setReferralCode(normalized);
    if (normalized.trim()) localStorage.setItem(PENDING_REFERRAL_KEY, normalized.trim());
    else localStorage.removeItem(PENDING_REFERRAL_KEY);
  };
  return <div className="min-h-[100dvh] bg-[#f7fafc] px-4 py-8 sm:px-6">
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[520px] items-center justify-center">
      <div className="w-full">
        <div className="mb-4 rounded-2xl border border-[#dce4ee] bg-white p-4 shadow-sm">
          <label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Code de parrainage <span className="font-normal text-[#94a1b3]">(facultatif)</span></span><input value={referralCode} onChange={(event) => updateReferralCode(event.target.value)} placeholder="Ex. GAIN-CAMI7" className="h-12 w-full rounded-xl border border-[#dce4ee] bg-white px-4 font-mono text-sm uppercase tracking-wide text-[#182653] outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-[#a4afbf] focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid="input-signup-referral-code" /></label>
          <p className="mt-2 text-xs leading-5 text-[#718098]">Le parrain reçoit 10 € lorsque votre inscription est terminée.</p>
        </div>
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  </div>;
}

function PublicHome() {
  return <div className="app-noise min-h-[100dvh] bg-[#f7fafc] text-[#182653]">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
      <Logo />
      <Link href="/sign-in" className="text-sm font-bold text-[#1a8f9e] hover:underline" data-testid="link-landing-login">Se connecter</Link>
    </header>
    <main className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-20">
      <div>
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[.18em] text-[#1a9ba4]">L’espace qui avance avec vous</p>
        <h1 className="max-w-xl text-5xl font-extrabold leading-[1.02] tracking-[-.06em] text-[#182653] sm:text-6xl">Votre temps mérite mieux qu’un écran de chargement.</h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-[#718098]">Regardez des vidéos courtes, invitez vos proches et suivez vos gains dans un espace pensé pour rester simple.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] px-5 text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 transition hover:-translate-y-0.5" data-testid="link-landing-signup">Créer mon compte <ArrowRight size={17} /></Link>
          <Link href="/sign-in" className="flex h-12 items-center justify-center rounded-xl border border-[#dce4ee] bg-white px-5 text-sm font-bold text-[#3f4d67] transition hover:bg-[#f5f8fb]" data-testid="link-landing-signin">J’ai déjà un compte</Link>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A2980] to-[#26D0CE] p-6 text-white shadow-2xl shadow-[#1A2980]/15 sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[42px] border-white/10" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full border-[55px] border-white/10" />
        <div className="relative">
          <div className="flex items-center justify-between text-sm font-semibold text-white/70"><span>Solde disponible</span><WalletCards size={20} /></div>
          <p className="mt-4 text-6xl font-extrabold tracking-[-.07em]">100,00 €</p>
          <div className="mt-8 flex items-center justify-between text-xs font-semibold text-white/70"><span>Objectif de retrait</span><span>100 / 100 €</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full w-full rounded-full bg-white" /></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-2xl font-extrabold">5 €</p><p className="mt-1 text-xs text-white/65">par vidéo validée</p></div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-2xl font-extrabold">10 €</p><p className="mt-1 text-xs text-white/65">par ami invité</p></div>
          </div>
        </div>
      </div>
    </main>
  </div>;
}

function Shell({ children, user, path }: { children: ReactNode; user: User; path: string }) {
  const [, setLocation] = useLocation(); const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const logout = () => { void signOut({ redirectUrl: basePath || '/' }); };
  const goToSupportComposer = () => {
    setMobileOpen(false);
    setLocation('/support');
    window.setTimeout(() => document.getElementById('support-compose')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };
  const links = [{ href: '/home', label: 'Accueil', icon: HomeIcon }, { href: '/live', label: 'Retraits en direct', icon: CircleDollarSign }, { href: '/support', label: 'Support', icon: MessageCircle }, { href: '/profile', label: 'Profil', icon: UserRound }];
  const openSupportCount = user.isAdmin ? read<SupportMessage[]>(STORAGE.support, []).filter((item) => item.status === 'open').length : 0;
  return <div className="app-noise min-h-[100dvh] bg-[#f6f9fc] text-[#182653]">
    <aside className={`fixed inset-y-0 left-0 z-30 w-[252px] bg-[#182653] px-4 py-6 text-white transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-12 px-3"><Logo light /></div>
      <nav className="space-y-1.5">
        {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${path === href ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/7 hover:text-white'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={18} strokeWidth={path === href ? 2.4 : 1.9} /><span>{label}</span>{path === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#26D0CE]" />}</Link>)}
        {user.isAdmin && <><Link href="/admin" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${path === '/admin' ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/7 hover:text-white'}`} data-testid="link-nav-admin"><LayoutDashboard size={18} /><span>Administration</span></Link><Link href="/admin/support" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${path === '/admin/support' ? 'bg-white/12 text-white' : 'text-white/55 hover:bg-white/7 hover:text-white'}`} data-testid="link-nav-admin-support"><MessageCircle size={18} /><span>Messages</span>{openSupportCount > 0 && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-[#26D0CE] px-1.5 py-0.5 text-[10px] font-extrabold text-[#182653]">{openSupportCount}</span>}</Link></>}
      </nav>
      <div className="absolute bottom-6 left-4 right-4">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/6 p-3.5"><p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Besoin d’aide ?</p><p className="mt-1 text-xs leading-5 text-white/70">Notre équipe vous répond sous 24 h.</p><button className="mt-3 text-xs font-bold text-[#26D0CE]" onClick={goToSupportComposer} data-testid="button-sidebar-support">Contacter le support</button></div>
        <button onClick={logout} className="flex w-full items-center gap-3 px-3.5 py-2 text-sm font-semibold text-white/50 hover:text-white" data-testid="button-logout"><LogOut size={17} /> Se déconnecter</button>
      </div>
    </aside>
    {mobileOpen && <button className="fixed inset-0 z-20 bg-[#182653]/30 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" data-testid="button-close-menu" />}
    <div className="md:pl-[252px]">
      <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-[#e5ebf2] bg-[#f6f9fc]/90 px-5 backdrop-blur md:px-10">
        <button className="text-[#182653] md:hidden" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu" data-testid="button-open-menu"><Menu size={22} /></button>
        <div className="hidden md:block"><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#94a1b3]">Espace personnel</p><p className="mt-0.5 text-sm font-bold">Tout est clair, tout avance.</p></div>
        <div className="ml-auto flex items-center gap-4"><button className="relative text-[#7a879b] hover:text-[#182653]" onClick={() => setLocation('/live')} aria-label="Voir les notifications" data-testid="button-notifications"><Bell size={19} /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#26bfc0]" /></button><Link href="/profile" className="flex items-center gap-2.5" data-testid="link-header-profile"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d9f4f1] text-xs font-extrabold text-[#137d88]">{initials(user.name)}</span><span className="hidden text-sm font-bold sm:block">{user.name.split(' ')[0]}</span></Link></div>
      </header>
      <main className="mx-auto max-w-[1240px] px-5 pb-28 pt-7 md:px-10 md:pb-10 md:pt-10">{children}</main>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-[70px] border-t border-[#e4eaf1] bg-white/95 px-1 backdrop-blur md:hidden">
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex h-full min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-hidden text-center text-[9px] font-bold leading-none sm:text-[10px] ${path === href ? 'text-[#1a8f9e]' : 'text-[#94a1b3]'}`} data-testid={`link-bottom-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={20} strokeWidth={path === href ? 2.5 : 1.8} className="shrink-0" /><span className="block max-w-full truncate whitespace-nowrap px-0.5">{label}</span></Link>)}
    </nav>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#1a9ba4]">{eyebrow}</p><h1 className="text-[29px] font-extrabold tracking-[-.05em] text-[#182653] md:text-[35px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718098]">{description}</p>}</div>{action}</div>;
}

function Home({ user, updateUser, onNotice }: { user: User; updateUser: (user: User) => void; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation(); const [videoOpen, setVideoOpen] = useState(false); const [seconds, setSeconds] = useState(30);
  const [clock, setClock] = useState(Date.now()); const lastVideo = Number(localStorage.getItem('gainease-last-video') || 0); const wait = Math.max(0, 5 - Math.floor((clock - lastVideo) / 1000)); const progress = Math.min(100, (user.balance / 100) * 100); const remaining = Math.max(0, 100 - user.balance);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (!videoOpen) return; setSeconds(30); const timer = window.setInterval(() => setSeconds((value) => { if (value <= 1) { window.clearInterval(timer); return 0; } return value - 1; }), 1000); return () => window.clearInterval(timer); }, [videoOpen]);
  const completeVideo = () => { const updated = { ...user, balance: Math.round((user.balance + 5) * 100) / 100, videosWatched: user.videosWatched + 1 }; updateUser(updated); localStorage.setItem('gainease-last-video', String(Date.now())); setVideoOpen(false); celebrate(); onNotice({ message: '5 € ajoutés à votre solde.' }); };
  return <Shell user={user} path="/home">
    <PageHeading eyebrow="Votre tableau de bord" title={`Bonjour ${user.name.split(' ')[0]} !`} description="Voici où vous en êtes aujourd’hui. Encore quelques pas et votre premier retrait sera débloqué." action={<button onClick={() => setLocation('/withdraw')} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#182653] px-4 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5" data-testid="button-withdraw-header"><ArrowDownToLine size={17} /> Demander un retrait</button>} />
    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A2980] to-[#26D0CE] p-6 text-white shadow-lg shadow-[#1A2980]/15 md:p-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[34px] border-white/10" /><div className="relative">
          <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-white/70">Solde disponible</p><p className="mt-2 text-5xl font-extrabold tracking-[-.06em]">{money.format(user.balance)}</p></div><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><WalletCards size={21} /></div></div>
          <div className="mt-8 flex items-center justify-between text-xs font-semibold text-white/70"><span>Objectif de retrait</span><span>{money.format(Math.min(100, user.balance))} / 100 €</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-5 flex items-center gap-2 text-xs text-white/75"><Clock3 size={14} /> {remaining > 0 ? `Encore ${money.format(remaining)} · environ ${Math.max(1, Math.ceil(remaining / 5) * 2)} min de vidéos` : 'Retrait débloqué · vous pouvez demander votre paiement'}</div>
        </div>
      </section>
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff3df] text-[#c77a1e]"><Gift size={19} /></div><span className="rounded-full bg-[#eaf9f7] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#168d94]">+10 € / ami</span></div><h2 className="mt-5 text-lg font-extrabold tracking-[-.03em]">Faites tourner le bon plan.</h2><p className="mt-2 text-xs leading-5 text-[#718098]">Invitez un ami. Quand il commence à gagner, vous gagnez aussi.</p><div className="mt-5 flex items-center justify-between rounded-xl border border-dashed border-[#bcdedb] bg-[#f2fbfa] px-3.5 py-3"><span className="font-mono text-sm font-bold tracking-wide text-[#167f89]" data-testid="text-referral-code">{user.referralCode}</span><button onClick={() => { navigator.clipboard?.writeText(user.referralCode); onNotice({ message: 'Code copié dans le presse-papiers.' }); }} className="text-[#168d94]" aria-label="Copier le code de parrainage" data-testid="button-copy-referral"><Copy size={16} /></button></div></section>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#94a1b3]">Gagnez plus vite</p><h2 className="mt-2 text-lg font-extrabold tracking-[-.03em]">Une vidéo, 5 €.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#718098]">30 secondes suffisent. Regardez, validez, le montant est ajouté automatiquement.</p></div><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7f8f6] text-[#15959e]"><Play size={19} fill="currentColor" /></div></div><button onClick={() => { if (wait > 0) { onNotice({ message: `Patientez encore ${wait} seconde${wait > 1 ? 's' : ''}.`, kind: 'error' }); } else setVideoOpen(true); }} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#edf9f7] text-sm font-bold text-[#168d94] transition hover:bg-[#dff4f0]" data-testid="button-watch-video"><Play size={16} fill="currentColor" /> {wait > 0 ? `Disponible dans ${wait}s` : 'Regarder une vidéo'} </button></section>
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e9edff] text-[#334ba0]"><BarChart3 size={20} /></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#94a1b3]">Votre activité</p><h2 className="mt-1 text-lg font-extrabold tracking-[-.03em]">Ça travaille bien.</h2></div></div><div className="mt-7 flex items-end gap-2"><span className="text-4xl font-extrabold tracking-[-.06em]">{user.videosWatched}</span><span className="mb-1 text-sm text-[#718098]">vidéos vues</span></div><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#168d94]"><TrendingUp size={15} /> +{money.format(user.videosWatched * 5)} générés depuis le début</div></section>
    </div>
    <section className="mt-5 rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#94a1b3]">Les dernières nouvelles</p><h2 className="mt-1 text-lg font-extrabold tracking-[-.03em]">Vos prochaines étapes</h2></div><button onClick={() => setLocation('/live')} className="flex items-center gap-1 text-xs font-bold text-[#168d94]" data-testid="button-see-live">Voir les retraits <ChevronRight size={15} /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-xl bg-[#f7fafc] p-3.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7f8f6] text-[#168d94]"><Check size={15} /></span><span className="text-xs font-semibold">Compte vérifié</span></div><div className="flex items-center gap-3 rounded-xl bg-[#f7fafc] p-3.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff3df] text-[#c77a1e]"><Timer size={15} /></span><span className="text-xs font-semibold">{remaining > 0 ? 'Atteignez 100 €' : 'Retrait prêt'}</span></div><div className="flex items-center gap-3 rounded-xl bg-[#f7fafc] p-3.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e9edff] text-[#334ba0]"><Users size={15} /></span><span className="text-xs font-semibold">{user.referrals} parrainage{user.referrals > 1 ? 's' : ''}</span></div></div></section>
    {videoOpen && <div className="fixed inset-0 z-40 grid place-items-center bg-[#13204a]/55 p-5 backdrop-blur-sm"><div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl animate-rise"><div className="flex items-start justify-between"><div><span className="inline-flex rounded-full bg-[#e7f8f6] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">Vidéo rémunérée</span><h2 className="mt-4 text-2xl font-extrabold tracking-[-.04em]">Votre prochaine minute utile.</h2></div><button onClick={() => setVideoOpen(false)} className="text-[#8b98aa]" aria-label="Fermer la vidéo" data-testid="button-close-video"><X size={20} /></button></div><div className="relative mt-5 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#182653] to-[#1e9da3]"><div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #fff 0 2px, transparent 3px), radial-gradient(circle at 75% 70%, #fff 0 1px, transparent 2px)', backgroundSize: '42px 42px' }} /><div className="relative text-center text-white"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/30 bg-white/15"><Play size={23} fill="currentColor" /></div><p className="mt-3 text-xs font-semibold text-white/75">Contenu partenaire</p></div><span className="absolute bottom-3 right-3 rounded-lg bg-black/25 px-2 py-1 font-mono text-xs text-white">{seconds}s</span></div>{seconds === 0 ? <button onClick={completeVideo} className="mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white" data-testid="button-claim-video">Valider et recevoir 5 €</button> : <p className="mt-4 text-center text-xs text-[#718098]">La validation apparaîtra à la fin de la vidéo.</p>}</div></div>}
  </Shell>;
}

function Live({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [tick, setTick] = useState(0); useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), 30000); return () => window.clearInterval(timer); }, []);
  const live = useMemo(() => liveNames.map((name, index) => ({ id: `${tick}-${index}`, name, amount: [240, 560, 120, 875, 340, 1000, 415, 690, 180, 520, 760, 295][index], method: index % 3 === 0 ? 'PayPal' : 'Virement', hot: index === 1 || index === 5 || index === 8, fresh: index === 0 || index === 3 })), [tick]);
  return <Shell user={user} path="/live"><PageHeading eyebrow="La communauté GainEase" title="Les retraits en direct" description="Des paiements réels, partagés en temps réel. La liste se rafraîchit automatiquement toutes les 30 secondes." action={<div className="flex items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-3.5 py-2.5 text-xs font-bold text-[#718098]"><RefreshCw size={14} className="text-[#1a9ba4]" /> Actualisé à l’instant</div>} /><div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#182653] p-5 text-white"><p className="text-xs font-semibold text-white/55">Retraits aujourd’hui</p><p className="mt-2 text-3xl font-extrabold">{money.format(12480)}</p><p className="mt-1 text-xs text-[#26D0CE]">+12,4 % cette semaine</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><p className="text-xs font-semibold text-[#94a1b3]">Paiement moyen</p><p className="mt-2 text-3xl font-extrabold text-[#182653]">{money.format(438.5)}</p><p className="mt-1 text-xs text-[#718098]">sur les 24 dernières heures</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><p className="text-xs font-semibold text-[#94a1b3]">Délai moyen</p><p className="mt-2 text-3xl font-extrabold text-[#182653]">2 h 18</p><p className="mt-1 text-xs text-[#718098]">après validation</p></div></div><div className="overflow-hidden rounded-2xl border border-[#e4eaf1] bg-white shadow-sm"><div className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] border-b border-[#edf1f5] px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#9aa6b7]"><span>Membre</span><span>Montant</span><span>Méthode</span><span>Statut</span></div>{live.map((item) => <div key={item.id} className="grid grid-cols-[1.3fr_.7fr_.8fr_.8fr] items-center border-b border-[#f0f3f6] px-5 py-4 last:border-0"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e9edff] text-xs font-extrabold text-[#334ba0]">{initials(item.name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{item.name}</p><div className="mt-1 flex gap-1.5">{item.fresh && <span className="rounded-full bg-[#e7f8f6] px-1.5 py-0.5 text-[9px] font-extrabold text-[#168d94]">Nouveau</span>}{item.hot && <span className="flex items-center gap-0.5 rounded-full bg-[#fff3df] px-1.5 py-0.5 text-[9px] font-extrabold text-[#c77a1e]"><Flame size={9} /> Chaud</span>}</div></div></div><span className="text-sm font-extrabold">{money.format(item.amount)}</span><span className="text-xs font-semibold text-[#718098]">{item.method}</span><span className="flex items-center gap-1.5 text-xs font-bold text-[#2b9a78]"><span className="h-1.5 w-1.5 rounded-full bg-[#2b9a78]" /> Payé</span></div>)}</div><p className="mt-4 text-center text-xs text-[#9aa6b7]">Les prénoms sont affichés avec l’accord des membres.</p><button onClick={() => onNotice({ message: 'Les retraits sont disponibles dès 100 € de solde.' })} className="mx-auto mt-5 flex items-center gap-2 text-sm font-bold text-[#168d94]" data-testid="button-live-info"><ShieldCheck size={16} /> Comment fonctionnent les retraits ?</button></Shell>;
}

function Withdraw({ user, updateUser, onNotice }: { user: User; updateUser: (user: User) => void; onNotice: (notice: Notice) => void }) {
  const [amount, setAmount] = useState(''); const [method, setMethod] = useState<'PayPal' | 'Virement'>('PayPal'); const [support, setSupport] = useState(''); const [voucher, setVoucher] = useState(''); const [kyc, setKyc] = useState(''); const [submitting, setSubmitting] = useState(false);
  const withdrawals = read<Withdrawal[]>(STORAGE.withdrawals, []).filter((item) => item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); const numericAmount = Number(amount); const unlocked = user.balance >= 100; const needsKyc = numericAmount > 50;
  const fileToData = (file: File | undefined, setter: (value: string) => void) => { if (!file) return; const reader = new FileReader(); reader.onload = () => setter(String(reader.result)); reader.readAsDataURL(file); };
  const submit = (event: FormEvent) => { event.preventDefault(); if (!unlocked) { onNotice({ message: 'Votre solde doit atteindre 100 € pour demander un retrait.', kind: 'error' }); return; } if (!numericAmount || numericAmount < 100 || numericAmount > user.balance) { onNotice({ message: 'Choisissez un montant entre 100 € et votre solde.', kind: 'error' }); return; } if (needsKyc && !kyc) { onNotice({ message: 'Une pièce d’identité est requise au-delà de 50 €.', kind: 'error' }); return; } setSubmitting(true); const item: Withdrawal = { id: uid('withdrawal'), userId: user.id, amount: numericAmount, method, status: 'pending', createdAt: new Date().toISOString(), kycImage: kyc || undefined, voucherImage: voucher || undefined }; write(STORAGE.withdrawals, [item, ...read<Withdrawal[]>(STORAGE.withdrawals, [])]); write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'withdrawal', description: `${user.name} a demandé ${money.format(numericAmount)}`, createdAt: new Date().toISOString() }]); updateUser({ ...user, balance: Math.round((user.balance - numericAmount) * 100) / 100 }); setSubmitting(false); setAmount(''); onNotice({ message: 'Votre demande est en attente de validation.' }); };
  return <Shell user={user} path="/home"><PageHeading eyebrow="Votre argent, votre rythme" title="Demander un retrait" description="Choisissez votre montant et votre méthode. Nous vérifions chaque demande avant paiement." /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className={`flex items-center gap-3 rounded-xl p-4 ${unlocked ? 'bg-[#e7f8f6] text-[#168d94]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{unlocked ? <BadgeCheck size={21} /> : <Clock3 size={21} />}<div><p className="text-sm font-extrabold">{unlocked ? 'Retrait disponible' : 'Retrait bientôt disponible'}</p><p className="mt-0.5 text-xs opacity-80">{unlocked ? `Vous pouvez retirer jusqu’à ${money.format(user.balance)}.` : `Il vous manque ${money.format(100 - user.balance)} pour atteindre 100 €.`}</p></div></div><form onSubmit={submit} className="mt-6 space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Montant du retrait</span><div className="relative"><input data-testid="input-withdraw-amount" type="number" min="100" max={user.balance} step=".01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100" className="h-14 w-full rounded-xl border border-[#dce4ee] bg-white px-4 pr-12 text-lg font-bold outline-none focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" /><span className="absolute right-4 top-4 font-bold text-[#94a1b3]">€</span></div></label><div><p className="mb-2 text-xs font-bold text-[#52617b]">Méthode de paiement</p><div className="grid grid-cols-2 gap-3">{(['PayPal', 'Virement'] as const).map((option) => <button type="button" key={option} onClick={() => setMethod(option)} className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${method === option ? 'border-[#26bfc0] bg-[#eaf9f7] text-[#168d94]' : 'border-[#e4eaf1] text-[#718098]'}`} data-testid={`button-method-${option.toLowerCase()}`}>{option === 'PayPal' ? <CreditCard size={17} /> : <Landmark size={17} />}{option}</button>)}</div></div>{method === 'PayPal' && <Field label="Email PayPal" type="email" value={support} onChange={setSupport} placeholder="paiement@exemple.fr" testId="input-paypal" />}{method === 'Virement' && <Field label="IBAN" value={support} onChange={setSupport} placeholder="FR76 •••• ••••" testId="input-iban" />}{needsKyc && <label className="block rounded-xl border border-dashed border-[#cdd8e5] bg-[#f8fafc] p-4"><span className="flex items-center gap-2 text-xs font-bold text-[#52617b]"><FileImage size={16} /> Pièce d’identité <span className="font-normal text-[#9aa6b7]">(obligatoire au-delà de 50 €)</span></span><input type="file" accept="image/*" onChange={(event) => fileToData(event.target.files?.[0], setKyc)} className="mt-3 block w-full text-xs text-[#718098]" data-testid="input-kyc" />{kyc && <img src={kyc} alt="Aperçu de la pièce d'identité" className="mt-3 h-20 w-28 rounded-lg object-cover" data-testid="img-kyc-preview" />}</label>}<button disabled={!unlocked || submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-withdraw">{submitting ? 'Envoi…' : 'Envoyer la demande'} <ArrowRight size={17} /></button></form></section><section className="space-y-5"><div className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff3df] text-[#c77a1e]"><CreditCard size={18} /></div><div><h2 className="font-extrabold">Voucher Transcash</h2><p className="text-xs text-[#718098]">Vous préférez cette option ?</p></div></div><p className="mt-4 text-sm leading-6 text-[#718098]">Achetez votre voucher directement sur dundle.com, puis joignez sa photo à votre demande.</p><a href="https://dundle.com" target="_blank" rel="noreferrer" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f5f8fb] text-sm font-bold text-[#334ba0]" data-testid="link-dundle">Acheter sur dundle.com <ArrowRight size={15} /></a><label className="mt-4 block"><span className="mb-2 flex items-center gap-2 text-xs font-bold text-[#52617b]"><FileImage size={15} /> Ajouter le voucher</span><input type="file" accept="image/*" onChange={(event) => fileToData(event.target.files?.[0], setVoucher)} className="block w-full text-xs text-[#718098]" data-testid="input-voucher" />{voucher && <img src={voucher} alt="Aperçu du voucher Transcash" className="mt-3 max-h-40 w-full rounded-lg object-contain" data-testid="img-voucher-preview" />}</label></div><div className="rounded-2xl bg-[#182653] p-6 text-white"><div className="flex items-center gap-2 text-[#26D0CE]"><ShieldCheck size={18} /><span className="text-xs font-extrabold uppercase tracking-wider">Un doute ?</span></div><h2 className="mt-3 text-lg font-extrabold">On est là pour vous.</h2><p className="mt-2 text-xs leading-5 text-white/60">Le support GainEase peut vous accompagner à chaque étape de votre retrait.</p><button onClick={() => onNotice({ message: 'Votre demande de support a bien été notée.' })} className="mt-4 text-xs font-bold text-[#26D0CE]" data-testid="button-contact-support">Contacter le support <ArrowRight className="ml-1 inline" size={14} /></button></div></section></div><section className="mt-5 rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><History size={18} className="text-[#1a9ba4]" /><h2 className="font-extrabold">Historique des demandes</h2></div>{withdrawals.length === 0 ? <div className="py-10 text-center"><p className="text-sm font-bold">Aucune demande pour le moment</p><p className="mt-1 text-xs text-[#94a1b3]">Votre historique apparaîtra ici.</p></div> : <div className="mt-4 divide-y divide-[#edf1f5]">{withdrawals.map((item) => <div key={item.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-bold">{money.format(item.amount)} · {item.method}</p><p className="mt-1 text-xs text-[#94a1b3]">{date(item.createdAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === 'approved' ? 'bg-[#e7f8f6] text-[#168d94]' : item.status === 'rejected' ? 'bg-[#fff0ef] text-[#bd4545]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{item.status === 'approved' ? 'Validé' : item.status === 'rejected' ? 'Rejeté' : 'En attente'}</span></div>)}</div>}</section></Shell>;
}

function VoucherWithdrawal({ user, updateUser, onNotice }: { user: User; updateUser: (user: User) => void; onNotice: (notice: Notice) => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'PayPal' | 'Virement' | null>(null);
  const [support, setSupport] = useState('');
  const [bankInfo, setBankInfo] = useState({ country: 'France', city: '', email: '', firstName: '', lastName: '', rib: '' });
  const [voucher, setVoucher] = useState('');
  const [kyc, setKyc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const vouchers = read<VoucherPayment[]>(STORAGE.vouchers, []).filter((item) => item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestVoucher = vouchers[0];
  const voucherApproved = latestVoucher?.status === 'approved';
  const voucherPending = latestVoucher?.status === 'pending';
  const balanceReady = user.balance >= 100;
  const withdrawals = read<Withdrawal[]>(STORAGE.withdrawals, []).filter((item) => item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const numericAmount = Number(amount);
  const needsKyc = numericAmount > 50;

  const fileToData = (file: File | undefined, setter: (value: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submitVoucher = (event: FormEvent) => {
    event.preventDefault();
    if (!voucher) {
      onNotice({ message: 'Ajoutez la photo de votre voucher Transcash.', kind: 'error' });
      return;
    }
    const item: VoucherPayment = { id: uid('voucher'), userId: user.id, amount: 50, status: 'pending', createdAt: new Date().toISOString(), voucherImage: voucher };
    write(STORAGE.vouchers, [item, ...read<VoucherPayment[]>(STORAGE.vouchers, [])]);
    write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'voucher', description: `${user.name} a envoyé un voucher Transcash de 50 €`, createdAt: new Date().toISOString() }]);
    setVoucher('');
    onNotice({ message: 'Votre voucher est en attente de vérification (24-48h).' });
  };

  const submitWithdrawal = (event: FormEvent) => {
    event.preventDefault();
    if (!voucherApproved) {
      onNotice({ message: 'Validez d’abord votre paiement Transcash de 50 €.', kind: 'error' });
      return;
    }
    if (!balanceReady) {
      onNotice({ message: 'Votre solde doit atteindre 100 € pour demander un retrait.', kind: 'error' });
      return;
    }
    if (!numericAmount || numericAmount < 100 || numericAmount > user.balance) {
      onNotice({ message: 'Choisissez un montant entre 100 € et votre solde.', kind: 'error' });
      return;
    }
    if (!method) {
      onNotice({ message: 'Choisissez PayPal ou Virement bancaire.', kind: 'error' });
      return;
    }
    if (method === 'PayPal' && !support.trim()) {
      onNotice({ message: 'Renseignez votre email PayPal.', kind: 'error' });
      return;
    }
    if (method === 'Virement' && (!bankInfo.email || !bankInfo.city || !bankInfo.firstName || !bankInfo.lastName || !bankInfo.rib)) {
      onNotice({ message: 'Complétez toutes les coordonnées bancaires.', kind: 'error' });
      return;
    }
    if (needsKyc && !kyc) {
      onNotice({ message: 'Une pièce d’identité est requise au-delà de 50 €.', kind: 'error' });
      return;
    }
    setSubmitting(true);
    const payoutDetails: PayoutDetails = method === 'PayPal'
      ? { email: support.trim() }
      : { email: bankInfo.email.trim(), country: bankInfo.country, city: bankInfo.city.trim(), firstName: bankInfo.firstName.trim(), lastName: bankInfo.lastName.trim(), rib: bankInfo.rib.trim() };
    const item: Withdrawal = { id: uid('withdrawal'), userId: user.id, amount: numericAmount, method, status: 'pending', createdAt: new Date().toISOString(), kycImage: kyc || undefined, payoutDetails };
    write(STORAGE.withdrawals, [item, ...read<Withdrawal[]>(STORAGE.withdrawals, [])]);
    write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'withdrawal', description: `${user.name} a demandé ${money.format(numericAmount)}`, createdAt: new Date().toISOString() }]);
    updateUser({ ...user, balance: Math.round((user.balance - numericAmount) * 100) / 100 });
    setSubmitting(false);
    setAmount('');
    onNotice({ message: 'Votre demande de retrait est en attente de validation.' });
  };

  if (!voucherApproved) {
    return <Shell user={user} path="/home">
      <PageHeading eyebrow="Votre argent, votre rythme" title="Débloquer votre retrait" description="Le paiement de 50 € est vérifié avant l’ouverture de l’espace de retrait." />
      <section className="mx-auto max-w-2xl rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm md:p-8">
        {voucherPending ? <div className="rounded-xl bg-[#fff3df] p-5 text-[#ac6c1e]">
          <div className="flex items-center gap-3"><Clock3 size={24} /><div><p className="text-base font-extrabold">⏳ Code en vérification</p><p className="mt-1 text-sm opacity-80">Votre voucher Transcash est en cours de vérification (24-48h).</p></div></div>
          {latestVoucher?.voucherImage && <div className="mt-5 border-t border-[#e8c98f] pt-5"><p className="mb-2 text-xs font-extrabold uppercase tracking-wider">Voucher envoyé</p><img src={latestVoucher.voucherImage} alt="Photo du voucher Transcash envoyé" className="max-h-[70vh] w-full rounded-xl border border-[#e8c98f] bg-white object-contain" data-testid="img-voucher-pending" /></div>}
        </div> : <form onSubmit={submitVoucher}>
          <div className="rounded-xl bg-[#fff3df] p-5 text-[#ac6c1e]"><div className="flex items-center gap-3"><ShieldCheck size={24} /><div><p className="text-base font-extrabold">🔒 Retrait bloqué - 50 € requis</p><p className="mt-1 text-sm opacity-80">{latestVoucher?.status === 'rejected' ? 'Le précédent voucher a été rejeté. Envoyez une nouvelle photo pour recommencer la vérification.' : 'Achetez votre voucher Transcash de 50 €, puis envoyez sa photo pour débloquer les retraits.'}</p></div></div></div>
          <a href="https://dundle.com" target="_blank" rel="noreferrer" className="mt-6 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#182653] text-sm font-bold text-white transition hover:-translate-y-0.5" data-testid="link-buy-voucher">💳 Acheter voucher Transcash <ArrowRight size={16} /></a>
          <label className="mt-5 block rounded-xl border border-dashed border-[#cdd8e5] bg-[#f8fafc] p-4"><span className="flex items-center gap-2 text-xs font-bold text-[#52617b]"><FileImage size={16} /> Upload photo du code Transcash</span><input type="file" accept="image/*" onChange={(event) => fileToData(event.target.files?.[0], setVoucher)} className="mt-3 block w-full text-xs text-[#718098]" data-testid="input-voucher-payment" />{voucher && <img src={voucher} alt="Aperçu du voucher Transcash" className="mt-4 max-h-[70vh] w-full rounded-xl border border-[#e4eaf1] bg-white object-contain" data-testid="img-voucher-payment-preview" />}</label>
          <button type="submit" className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15" data-testid="button-submit-voucher">📤 Soumettre <ArrowRight size={17} /></button>
        </form>}
        {voucherPending && <button onClick={() => onNotice({ message: 'Le support GainEase peut vous répondre sous 24 h.' })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce4ee] px-4 py-3 text-sm font-bold text-[#52617b]" data-testid="button-voucher-support">📧 Contacter le support <ArrowRight size={15} /></button>}
      </section>
    </Shell>;
  }

  return <Shell user={user} path="/home">
    <PageHeading eyebrow="Votre argent, votre rythme" title="Demander un retrait" description="Votre paiement est validé. Choisissez le montant et la méthode de versement." />
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm">
        <div className={`flex items-center gap-3 rounded-xl p-4 ${balanceReady ? 'bg-[#e7f8f6] text-[#168d94]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}><BadgeCheck size={21} /><div><p className="text-sm font-extrabold">✅ Retraits débloqués !</p><p className="mt-0.5 text-xs opacity-80">{balanceReady ? `Vous pouvez retirer jusqu’à ${money.format(user.balance)}.` : `Il vous manque ${money.format(100 - user.balance)} pour atteindre le seuil de 100 €.`}</p></div></div>
        <form onSubmit={submitWithdrawal} className="mt-6 space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Montant du retrait</span><div className="relative"><input data-testid="input-withdraw-amount" type="number" min="100" max={user.balance} step=".01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="100" disabled={!balanceReady} className="h-14 w-full rounded-xl border border-[#dce4ee] bg-white px-4 pr-12 text-lg font-bold outline-none focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10 disabled:cursor-not-allowed disabled:bg-[#f7fafc]" /><span className="absolute right-4 top-4 font-bold text-[#94a1b3]">€</span></div></label>
          <div><p className="mb-3 text-xs font-bold text-[#52617b]">Où voulez-vous recevoir vos gains ?</p><div className="grid gap-3 sm:grid-cols-2">
            {([{ value: 'PayPal', label: 'PayPal', image: paypalLogo }, { value: 'Virement', label: 'Virement bancaire', image: bankTransferLogo }] as const).map((option) => <button type="button" key={option.value} onClick={() => setMethod(option.value)} className={`group overflow-hidden rounded-2xl border-2 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${method === option.value ? 'border-[#26bfc0] bg-[#eaf9f7] shadow-md' : 'border-[#e4eaf1]'}`} data-testid={`button-method-${option.value.toLowerCase()}`}><div className="flex h-24 items-center justify-center rounded-xl bg-white"><img src={option.image} alt={`Logo ${option.label}`} className="max-h-20 w-full object-contain" /></div><div className="mt-3 flex items-center justify-between"><span className="text-sm font-extrabold text-[#182653]">{option.label}</span>{method === option.value && <CheckCircle2 size={18} className="text-[#168d94]" />}</div></button>)}
          </div></div>
          {method === 'PayPal' && <div className="rounded-2xl border border-[#dce4ee] bg-[#f8fafc] p-4"><p className="mb-3 text-sm font-extrabold text-[#182653]">Coordonnées PayPal</p><Field label="E-mail PayPal" type="email" value={support} onChange={setSupport} placeholder="paiement@exemple.fr" testId="input-paypal" /></div>}
          {method === 'Virement' && <div className="space-y-4 rounded-2xl border border-[#dce4ee] bg-[#f8fafc] p-4"><p className="text-sm font-extrabold text-[#182653]">Coordonnées bancaires</p><label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Montant</span><input value={amount || '100'} readOnly className="h-12 w-full rounded-xl border border-[#dce4ee] bg-white px-4 text-sm font-bold text-[#182653]" data-testid="input-bank-amount" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Pays</span><input value={bankInfo.country} onChange={(event) => setBankInfo((current) => ({ ...current, country: event.target.value }))} className="h-12 w-full rounded-xl border border-[#dce4ee] bg-white px-4 text-sm text-[#182653] outline-none focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid="input-bank-country" /></label><Field label="Ville" value={bankInfo.city} onChange={(value) => setBankInfo((current) => ({ ...current, city: value }))} placeholder="Votre ville" testId="input-bank-city" /></div><Field label="E-mail" type="email" value={bankInfo.email} onChange={(value) => setBankInfo((current) => ({ ...current, email: value }))} placeholder="vous@exemple.fr" testId="input-bank-email" /><div className="grid gap-4 sm:grid-cols-2"><Field label="Prénom" value={bankInfo.firstName} onChange={(value) => setBankInfo((current) => ({ ...current, firstName: value }))} placeholder="Votre prénom" testId="input-bank-first-name" /><Field label="Nom" value={bankInfo.lastName} onChange={(value) => setBankInfo((current) => ({ ...current, lastName: value }))} placeholder="Votre nom" testId="input-bank-last-name" /></div><Field label="RIB" value={bankInfo.rib} onChange={(value) => setBankInfo((current) => ({ ...current, rib: value }))} placeholder="FR76 1234 5678 9012 3456 7890 123" testId="input-bank-rib" /></div>}
          {needsKyc && <label className="block rounded-xl border border-dashed border-[#cdd8e5] bg-[#f8fafc] p-4"><span className="flex items-center gap-2 text-xs font-bold text-[#52617b]"><FileImage size={16} /> Pièce d’identité <span className="font-normal text-[#9aa6b7]">(obligatoire au-delà de 50 €)</span></span><input type="file" accept="image/*" onChange={(event) => fileToData(event.target.files?.[0], setKyc)} className="mt-3 block w-full text-xs text-[#718098]" data-testid="input-kyc" />{kyc && <img src={kyc} alt="Aperçu de la pièce d'identité" className="mt-3 max-h-48 w-full rounded-lg object-contain" data-testid="img-kyc-preview" />}</label>}
          <button disabled={!balanceReady || submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-submit-withdraw">{submitting ? 'Envoi…' : 'Demander le retrait'} <ArrowRight size={17} /></button>
        </form>
      </section>
      <section className="space-y-5"><div className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7f8f6] text-[#168d94]"><BadgeCheck size={18} /></div><div><h2 className="font-extrabold">Paiement validé</h2><p className="text-xs text-[#718098]">Votre paiement Transcash de 50 € a été accepté.</p></div></div><p className="mt-4 text-sm leading-6 text-[#718098]">Vous pouvez maintenant demander un retrait dès que votre solde atteint 100 €.</p></div><div className="rounded-2xl bg-[#182653] p-6 text-white"><div className="flex items-center gap-2 text-[#26D0CE]"><ShieldCheck size={18} /><span className="text-xs font-extrabold uppercase tracking-wider">Un doute ?</span></div><h2 className="mt-3 text-lg font-extrabold">On est là pour vous.</h2><p className="mt-2 text-xs leading-5 text-white/60">Le support GainEase peut vous accompagner à chaque étape de votre retrait.</p><button onClick={() => onNotice({ message: 'Votre demande de support a bien été notée.' })} className="mt-4 text-xs font-bold text-[#26D0CE]" data-testid="button-contact-support">Contacter le support <ArrowRight className="ml-1 inline" size={14} /></button></div></section>
    </div>
    <section className="mt-5 rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><History size={18} className="text-[#1a9ba4]" /><h2 className="font-extrabold">Historique des demandes</h2></div>{withdrawals.length === 0 ? <div className="py-10 text-center"><p className="text-sm font-bold">Aucune demande pour le moment</p><p className="mt-1 text-xs text-[#94a1b3]">Votre historique apparaîtra ici.</p></div> : <div className="mt-4 divide-y divide-[#edf1f5]">{withdrawals.map((item) => <div key={item.id} className="flex items-center justify-between py-3"><div><p className="text-sm font-bold">{money.format(item.amount)} · {item.method}</p><p className="mt-1 text-xs text-[#94a1b3]">{date(item.createdAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === 'approved' ? 'bg-[#e7f8f6] text-[#168d94]' : item.status === 'rejected' ? 'bg-[#fff0ef] text-[#bd4545]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{item.status === 'approved' ? 'Validé' : item.status === 'rejected' ? 'Rejeté' : 'En attente'}</span></div>)}</div>}</section>
  </Shell>;
}

function LegacySupportPage({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [, refresh] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => refresh((value) => value + 1), 2000); return () => window.clearInterval(timer); }, []);
  const messages = read<SupportMessage[]>(STORAGE.support, []).filter((item) => item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      onNotice({ message: 'Écrivez votre préoccupation avant d’envoyer le message.', kind: 'error' });
      return;
    }
    const item: SupportMessage = { id: uid('support'), userId: user.id, userName: user.name, userEmail: user.email, subject: subject.trim() || 'Question générale', message: message.trim(), status: 'open', createdAt: new Date().toISOString() };
    write(STORAGE.support, [item, ...read<SupportMessage[]>(STORAGE.support, [])]);
    write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'support', description: `${user.name} a envoyé une demande au support`, createdAt: new Date().toISOString() }]);
    setSubject('');
    setMessage('');
    onNotice({ message: 'Votre message a été envoyé à l’administration.' });
  };

  return <Shell user={user} path="/support">
    <PageHeading eyebrow="Une question ?" title="Contacter le support" description="Écrivez-nous votre préoccupation. L’administration pourra vous répondre directement ici." />
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf9f7] text-[#168d94]"><MessageCircle size={20} /></div><div><h2 className="font-extrabold">Nouvelle demande</h2><p className="text-xs text-[#718098]">Réponse dans votre espace personnel.</p></div></div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Sujet" value={subject} onChange={setSubject} placeholder="Ex. Question sur mon retrait" required={false} testId="input-support-subject" />
          <label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Votre préoccupation</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} placeholder="Écrivez votre message ici..." required className="w-full resize-y rounded-xl border border-[#dce4ee] bg-white px-4 py-3 text-sm text-[#182653] outline-none transition placeholder:text-[#a4afbf] focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid="textarea-support-message" /></label>
          <button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 transition hover:-translate-y-0.5" data-testid="button-send-support"><MessageCircle size={17} /> Envoyer au support</button>
        </form>
      </section>
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">Mes conversations</h2><p className="mt-1 text-xs text-[#94a1b3]">Retrouvez vos demandes et les réponses reçues.</p></div><span className="rounded-full bg-[#edf2f7] px-2.5 py-1 text-[10px] font-extrabold text-[#718098]">{messages.length} message{messages.length > 1 ? 's' : ''}</span></div>{messages.length === 0 ? <div className="py-14 text-center"><MessageCircle className="mx-auto text-[#c6d0dc]" size={30} /><p className="mt-3 text-sm font-bold">Aucune conversation</p><p className="mt-1 text-xs text-[#94a1b3]">Votre première demande apparaîtra ici.</p></div> : <div className="mt-5 space-y-4">{messages.map((item) => <article key={item.id} className="rounded-xl border border-[#edf1f5] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#182653]">{item.subject}</p><p className="mt-1 text-[10px] text-[#94a1b3]">{date(item.createdAt)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === 'answered' ? 'bg-[#e7f8f6] text-[#168d94]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{item.status === 'answered' ? 'Répondu' : 'En attente'}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.message}</p>{item.adminReply && <div className="mt-4 rounded-xl border-l-4 border-[#26bfc0] bg-[#f5f9fb] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">Réponse de l’administration</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.adminReply}</p><p className="mt-2 text-[10px] text-[#94a1b3]">{item.repliedAt ? date(item.repliedAt) : ''}</p></div>}</article>)}</div>}</section>
    </div>
  </Shell>;
}

function LegacyAdminSupport({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [, refresh] = useState(0);
  useEffect(() => { if (!user.isAdmin) setLocation('/home'); const timer = window.setInterval(() => refresh((value) => value + 1), 2000); return () => window.clearInterval(timer); }, [user.isAdmin, setLocation]);
  const messages = read<SupportMessage[]>(STORAGE.support, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const reply = (id: string) => {
    const text = replyDrafts[id]?.trim();
    if (!text) {
      onNotice({ message: 'Écrivez une réponse avant de l’envoyer.', kind: 'error' });
      return;
    }
    const updated = messages.map((item) => item.id === id ? { ...item, status: 'answered' as const, adminReply: text, repliedAt: new Date().toISOString() } : item);
    write(STORAGE.support, updated);
    write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'support-reply', description: `Réponse envoyée à ${messages.find((item) => item.id === id)?.userName || 'un membre'}`, createdAt: new Date().toISOString() }]);
    setReplyDrafts((current) => ({ ...current, [id]: '' }));
    refresh((value) => value + 1);
    onNotice({ message: 'Réponse envoyée au membre.' });
  };

  if (!user.isAdmin) return null;
  const openCount = messages.filter((item) => item.status === 'open').length;
  return <Shell user={user} path="/admin/support">
    <PageHeading eyebrow="Relation membres" title="Messages du support" description="Répondez aux préoccupations des utilisateurs depuis cet espace." action={<button onClick={() => refresh((value) => value + 1)} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-4 text-sm font-bold text-[#52617b]" data-testid="button-refresh-support"><RefreshCw size={16} /> Actualiser</button>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#182653] p-5 text-white"><MessageCircle size={18} className="text-[#26D0CE]" /><p className="mt-5 text-xs text-white/55">Toutes les demandes</p><p className="mt-1 text-3xl font-extrabold">{messages.length}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><Clock3 size={18} className="text-[#c77a1e]" /><p className="mt-5 text-xs text-[#94a1b3]">À traiter</p><p className="mt-1 text-3xl font-extrabold">{openCount}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><CheckCircle2 size={18} className="text-[#2b9a78]" /><p className="mt-5 text-xs text-[#94a1b3]">Répondues</p><p className="mt-1 text-3xl font-extrabold">{messages.length - openCount}</p></div></div>
    <section className="rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm">{messages.length === 0 ? <div className="py-16 text-center"><MessageCircle className="mx-auto text-[#c6d0dc]" size={32} /><p className="mt-3 text-sm font-bold">Aucun message reçu</p><p className="mt-1 text-xs text-[#94a1b3]">Les préoccupations des utilisateurs apparaîtront ici.</p></div> : <div className="space-y-4">{messages.map((item) => <article key={item.id} className="rounded-xl border border-[#edf1f5] p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9edff] text-xs font-extrabold text-[#334ba0]">{initials(item.userName)}</span><div><p className="text-sm font-extrabold">{item.userName}</p><p className="text-[10px] text-[#94a1b3]">{item.userEmail} · {date(item.createdAt)}</p></div></div><h2 className="mt-4 text-base font-extrabold text-[#182653]">{item.subject}</h2></div><span className={`self-start rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === 'answered' ? 'bg-[#e7f8f6] text-[#168d94]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{item.status === 'answered' ? 'Répondu' : 'À traiter'}</span></div><p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f8fafc] p-4 text-sm leading-6 text-[#52617b]">{item.message}</p>{item.adminReply ? <div className="mt-4 rounded-xl border-l-4 border-[#2b9a78] bg-[#edf9f7] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">Votre réponse</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.adminReply}</p></div> : <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1"><span className="mb-2 block text-xs font-bold text-[#52617b]">Répondre</span><textarea value={replyDrafts[item.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} placeholder="Écrivez votre réponse..." className="w-full resize-y rounded-xl border border-[#dce4ee] px-4 py-3 text-sm text-[#182653] outline-none focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid={`textarea-support-reply-${item.id}`} /></label><button onClick={() => reply(item.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#182653] px-4 text-sm font-bold text-white" data-testid={`button-support-reply-${item.id}`}><MessageCircle size={16} /> Répondre</button></div>}</article>)}</div>}</section>
  </Shell>;
}

function SupportPage({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [, refresh] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => refresh((value) => value + 1), 2000); return () => window.clearInterval(timer); }, []);
  const messages = read<SupportMessage[]>(STORAGE.support, []).filter((item) => item.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      onNotice({ message: 'Écrivez votre préoccupation avant d’envoyer le message.', kind: 'error' });
      return;
    }
    const item: SupportMessage = { id: uid('support'), userId: user.id, userName: user.name, userEmail: user.email, subject: subject.trim() || 'Question générale', message: message.trim(), status: 'open', createdAt: new Date().toISOString(), replies: [] };
    write(STORAGE.support, [item, ...read<SupportMessage[]>(STORAGE.support, [])]);
    write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'support', description: `${user.name} a envoyé une demande au support`, createdAt: new Date().toISOString() }]);
    setSubject('');
    setMessage('');
    onNotice({ message: 'Votre message a été envoyé à l’administration.' });
  };

  const sendReply = (id: string) => {
    const text = replyDrafts[id]?.trim();
    if (!text) {
      onNotice({ message: 'Écrivez votre message avant de l’envoyer.', kind: 'error' });
      return;
    }
    const allMessages = read<SupportMessage[]>(STORAGE.support, []);
    const updated = allMessages.map((item) => item.id === id ? { ...item, status: 'open' as const, replies: [...(item.replies || []), { id: uid('reply'), author: 'user' as const, text, createdAt: new Date().toISOString() }] } : item);
    write(STORAGE.support, updated);
    setReplyDrafts((current) => ({ ...current, [id]: '' }));
    refresh((value) => value + 1);
    onNotice({ message: 'Votre message a été envoyé au support.' });
  };

  return <Shell user={user} path="/support">
    <PageHeading eyebrow="Une question ?" title="Contacter le support" description="Écrivez votre préoccupation. Vous pourrez ensuite discuter directement avec l’administration." />
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <section id="support-compose" className="scroll-mt-24 rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf9f7] text-[#168d94]"><MessageCircle size={20} /></div><div><h2 className="font-extrabold">Nouvelle conversation</h2></div></div><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Sujet" value={subject} onChange={setSubject} placeholder="Ex. Question sur mon retrait" required={false} testId="input-support-subject" /><label className="block"><span className="mb-2 block text-xs font-bold text-[#52617b]">Votre message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} placeholder="Écrivez votre préoccupation ici..." required className="w-full resize-y rounded-xl border border-[#dce4ee] bg-white px-4 py-3 text-sm text-[#182653] outline-none transition placeholder:text-[#a4afbf] focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid="textarea-support-message" /></label><button type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1A2980] to-[#26bfc0] text-sm font-bold text-white shadow-lg shadow-[#1A2980]/15 transition hover:-translate-y-0.5" data-testid="button-send-support"><MessageCircle size={17} /> Envoyer au support</button></form></section>
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">Mes conversations</h2><p className="mt-1 text-xs text-[#94a1b3]">Discutez avec l’administration dans chaque conversation.</p></div><span className="rounded-full bg-[#edf2f7] px-2.5 py-1 text-[10px] font-extrabold text-[#718098]">{messages.length}</span></div>{messages.length === 0 ? <div className="py-14 text-center"><MessageCircle className="mx-auto text-[#c6d0dc]" size={30} /><p className="mt-3 text-sm font-bold">Aucune conversation</p><p className="mt-1 text-xs text-[#94a1b3]">Votre première demande apparaîtra ici.</p></div> : <div className="mt-5 space-y-4">{messages.map((item) => <article key={item.id} className="rounded-xl border border-[#edf1f5] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#182653]">{item.subject}</p><p className="mt-1 text-[10px] text-[#94a1b3]">{date(item.createdAt)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === 'answered' ? 'bg-[#e7f8f6] text-[#168d94]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{item.status === 'answered' ? 'Répondu' : 'En attente'}</span></div><div className="mt-4 space-y-3"><div className="rounded-xl bg-[#f8fafc] p-3"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94a1b3]">Vous</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.message}</p></div>{item.adminReply && <div className="rounded-xl border-l-4 border-[#26bfc0] bg-[#f5f9fb] p-3"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">Administration</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.adminReply}</p></div>}{(item.replies || []).map((reply) => <div key={reply.id} className={`rounded-xl p-3 ${reply.author === 'admin' ? 'border-l-4 border-[#26bfc0] bg-[#f5f9fb]' : 'ml-5 bg-[#edf9f7]'}`}><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">{reply.author === 'admin' ? 'Administration' : 'Vous'}</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{reply.text}</p><p className="mt-2 text-[10px] text-[#94a1b3]">{date(reply.createdAt)}</p></div>)}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1"><span className="mb-2 block text-xs font-bold text-[#52617b]">Écrire dans la conversation</span><textarea value={replyDrafts[item.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))} rows={2} placeholder="Votre réponse..." className="w-full resize-y rounded-xl border border-[#dce4ee] px-4 py-3 text-sm text-[#182653] outline-none focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid={`textarea-support-followup-${item.id}`} /></label><button onClick={() => sendReply(item.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#182653] px-4 text-sm font-bold text-white" data-testid={`button-support-followup-${item.id}`}><MessageCircle size={16} /> Envoyer</button></div></article>)}</div>}</section>
    </div>
  </Shell>;
}

function AdminSupport({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [, refresh] = useState(0);
  useEffect(() => { if (!user.isAdmin) setLocation('/home'); const timer = window.setInterval(() => refresh((value) => value + 1), 2000); return () => window.clearInterval(timer); }, [user.isAdmin, setLocation]);
  const messages = read<SupportMessage[]>(STORAGE.support, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const reply = (id: string) => {
    const text = replyDrafts[id]?.trim();
    if (!text) {
      onNotice({ message: 'Écrivez une réponse avant de l’envoyer.', kind: 'error' });
      return;
    }
    const updated = messages.map((item) => item.id === id ? { ...item, status: 'answered' as const, adminReply: item.adminReply, replies: [...(item.replies || []), { id: uid('reply'), author: 'admin' as const, text, createdAt: new Date().toISOString() }], repliedAt: new Date().toISOString() } : item);
    write(STORAGE.support, updated);
    write(STORAGE.logs, [...read<ActivityLog[]>(STORAGE.logs, []), { id: uid('log'), type: 'support-reply', description: `Réponse envoyée à ${messages.find((item) => item.id === id)?.userName || 'un membre'}`, createdAt: new Date().toISOString() }]);
    setReplyDrafts((current) => ({ ...current, [id]: '' }));
    refresh((value) => value + 1);
    onNotice({ message: 'Réponse envoyée au membre.' });
  };

  if (!user.isAdmin) return null;
  const openCount = messages.filter((item) => item.status === 'open').length;
  return <Shell user={user} path="/admin/support">
    <PageHeading eyebrow="Relation membres" title="Messages du support" description="Répondez aux préoccupations et poursuivez les conversations avec les utilisateurs." action={<button onClick={() => refresh((value) => value + 1)} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-4 text-sm font-bold text-[#52617b]" data-testid="button-refresh-support"><RefreshCw size={16} /> Actualiser</button>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-[#182653] p-5 text-white"><MessageCircle size={18} className="text-[#26D0CE]" /><p className="mt-5 text-xs text-white/55">Toutes les conversations</p><p className="mt-1 text-3xl font-extrabold">{messages.length}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><Clock3 size={18} className="text-[#c77a1e]" /><p className="mt-5 text-xs text-[#94a1b3]">À traiter</p><p className="mt-1 text-3xl font-extrabold">{openCount}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><CheckCircle2 size={18} className="text-[#2b9a78]" /><p className="mt-5 text-xs text-[#94a1b3]">Répondues</p><p className="mt-1 text-3xl font-extrabold">{messages.length - openCount}</p></div></div>
    <section className="rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm">{messages.length === 0 ? <div className="py-16 text-center"><MessageCircle className="mx-auto text-[#c6d0dc]" size={32} /><p className="mt-3 text-sm font-bold">Aucun message reçu</p><p className="mt-1 text-xs text-[#94a1b3]">Les préoccupations des utilisateurs apparaîtront ici.</p></div> : <div className="space-y-4">{messages.map((item) => <article key={item.id} className="rounded-xl border border-[#edf1f5] p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9edff] text-xs font-extrabold text-[#334ba0]">{initials(item.userName)}</span><div><p className="text-sm font-extrabold">{item.userName}</p><p className="text-[10px] text-[#94a1b3]">{item.userEmail} · {date(item.createdAt)}</p></div></div><h2 className="mt-4 text-base font-extrabold text-[#182653]">{item.subject}</h2></div><span className={`self-start rounded-full px-2.5 py-1 text-[10px] font-extrabold ${item.status === 'answered' ? 'bg-[#e7f8f6] text-[#168d94]' : 'bg-[#fff3df] text-[#ac6c1e]'}`}>{item.status === 'answered' ? 'Répondu' : 'À traiter'}</span></div><div className="mt-4 space-y-3"><div className="rounded-xl bg-[#f8fafc] p-4"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94a1b3]">Message de l’utilisateur</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.message}</p></div>{item.adminReply && <div className="rounded-xl border-l-4 border-[#2b9a78] bg-[#edf9f7] p-4"><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">Réponse précédente</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{item.adminReply}</p></div>}{(item.replies || []).map((reply) => <div key={reply.id} className={`rounded-xl p-4 ${reply.author === 'admin' ? 'border-l-4 border-[#2b9a78] bg-[#edf9f7]' : 'ml-5 bg-[#f8fafc]'}`}><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#168d94]">{reply.author === 'admin' ? 'Vous — administration' : item.userName}</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52617b]">{reply.text}</p><p className="mt-2 text-[10px] text-[#94a1b3]">{date(reply.createdAt)}</p></div>)}</div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><label className="block flex-1"><span className="mb-2 block text-xs font-bold text-[#52617b]">Écrire une réponse</span><textarea value={replyDrafts[item.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))} rows={3} placeholder="Répondez à l’utilisateur..." className="w-full resize-y rounded-xl border border-[#dce4ee] px-4 py-3 text-sm text-[#182653] outline-none focus:border-[#26bfc0] focus:ring-4 focus:ring-[#26bfc0]/10" data-testid={`textarea-support-reply-${item.id}`} /></label><button onClick={() => reply(item.id)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#182653] px-4 text-sm font-bold text-white" data-testid={`button-support-reply-${item.id}`}><MessageCircle size={16} /> Répondre</button></div></article>)}</div>}</section>
  </Shell>;
}

function Profile({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation(); const { signOut } = useClerk(); const logout = () => { void signOut({ redirectUrl: basePath || '/' }); };
  return <Shell user={user} path="/profile"><PageHeading eyebrow="Votre espace" title="Profil et sécurité" description="Vos informations, vos performances et les accès de votre compte." /><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><section className="rounded-2xl bg-gradient-to-br from-[#1A2980] to-[#26D0CE] p-7 text-white shadow-lg shadow-[#1A2980]/15"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-xl font-extrabold">{initials(user.name)}</span><h2 className="mt-5 text-2xl font-extrabold tracking-[-.04em]">{user.name}</h2><p className="mt-1 text-sm text-white/65">{user.email}</p><span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"><BadgeCheck size={13} /> {user.isAdmin ? 'Administrateur' : 'Membre vérifié'}</span><div className="mt-8 border-t border-white/15 pt-5"><p className="text-[10px] font-bold uppercase tracking-wider text-white/55">Membre depuis</p><p className="mt-1 text-sm font-bold">{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(user.createdAt))}</p></div></section><section className="rounded-2xl border border-[#e4eaf1] bg-white p-6 shadow-sm"><h2 className="font-extrabold">Vos chiffres</h2><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#f7fafc] p-4"><p className="text-xs text-[#718098]">Solde actuel</p><p className="mt-2 text-xl font-extrabold">{money.format(user.balance)}</p></div><div className="rounded-xl bg-[#f7fafc] p-4"><p className="text-xs text-[#718098]">Vidéos vues</p><p className="mt-2 text-xl font-extrabold">{user.videosWatched}</p></div><div className="rounded-xl bg-[#f7fafc] p-4"><p className="text-xs text-[#718098]">Gains totaux</p><p className="mt-2 text-xl font-extrabold">{money.format(user.videosWatched * 5 + user.referrals * 10)}</p></div></div><div className="mt-6 flex items-center justify-between border-t border-[#edf1f5] pt-5"><div className="flex items-center gap-3"><Gift size={18} className="text-[#c77a1e]" /><div><p className="text-sm font-bold">{user.referrals} parrainages</p><p className="text-xs text-[#94a1b3]">Code {user.referralCode}</p></div></div><button onClick={() => { navigator.clipboard?.writeText(user.referralCode); onNotice({ message: 'Code copié.' }); }} className="rounded-lg p-2 text-[#168d94] hover:bg-[#edf9f7]" aria-label="Copier le code" data-testid="button-profile-copy"><Copy size={16} /></button></div><div className="mt-6 flex flex-wrap gap-3"><button onClick={logout} className="flex items-center gap-2 rounded-xl border border-[#e4eaf1] px-4 py-2.5 text-sm font-bold text-[#718098] hover:bg-[#f7fafc]" data-testid="button-profile-logout"><LogOut size={16} /> Se déconnecter</button>{user.isAdmin && <button onClick={() => setLocation('/admin')} className="flex items-center gap-2 rounded-xl bg-[#182653] px-4 py-2.5 text-sm font-bold text-white" data-testid="button-open-admin"><LayoutDashboard size={16} /> Ouvrir l’administration</button>}</div></section></div></Shell>;
}

function LegacyAdmin({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation(); const [tab, setTab] = useState<'overview' | 'users' | 'logs'>('overview'); const [, refresh] = useState(0);
  useEffect(() => { if (!user.isAdmin) setLocation('/home'); }, [user.isAdmin, setLocation]);
  const users = read<User[]>(STORAGE.users, []); const withdrawals = read<Withdrawal[]>(STORAGE.withdrawals, []); const logs = read<ActivityLog[]>(STORAGE.logs, []); const pending = withdrawals.filter((item) => item.status === 'pending'); const revenue = users.reduce((sum, item) => sum + item.videosWatched * 5 + item.referrals * 10, 0);
  const act = (id: string, status: 'approved' | 'rejected') => { const updated = withdrawals.map((item) => item.id === id ? { ...item, status } : item); write(STORAGE.withdrawals, updated); const item = withdrawals.find((entry) => entry.id === id); write(STORAGE.logs, [{ id: uid('log'), type: status, description: `${status === 'approved' ? 'Retrait validé' : 'Retrait rejeté'} · ${money.format(item?.amount || 0)}`, createdAt: new Date().toISOString() }, ...logs]); refresh((value) => value + 1); onNotice({ message: status === 'approved' ? 'Retrait validé.' : 'Retrait rejeté.' }); };
  if (!user.isAdmin) return null;
  return <Shell user={user} path="/admin"><PageHeading eyebrow="Centre de contrôle" title="Administration" description="Supervisez les comptes, les paiements et les codes Transcash." action={<button onClick={() => { refresh((value) => value + 1); onNotice({ message: 'Données actualisées.' }); }} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-4 text-sm font-bold text-[#52617b]" data-testid="button-refresh-admin"><RefreshCw size={16} /> Actualiser</button>} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-[#182653] p-5 text-white"><Users size={18} className="text-[#26D0CE]" /><p className="mt-5 text-xs text-white/55">Utilisateurs</p><p className="mt-1 text-3xl font-extrabold">{users.length}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><CircleDollarSign size={18} className="text-[#168d94]" /><p className="mt-5 text-xs text-[#94a1b3]">Revenus générés</p><p className="mt-1 text-3xl font-extrabold">{money.format(revenue)}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><Clock3 size={18} className="text-[#c77a1e]" /><p className="mt-5 text-xs text-[#94a1b3]">Retraits en attente</p><p className="mt-1 text-3xl font-extrabold">{pending.length}</p></div><div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><ArrowDownToLine size={18} className="text-[#334ba0]" /><p className="mt-5 text-xs text-[#94a1b3]">Volume à payer</p><p className="mt-1 text-3xl font-extrabold">{money.format(pending.reduce((sum, item) => sum + item.amount, 0))}</p></div></div><div className="mt-7 flex gap-1 rounded-xl bg-[#edf2f7] p-1"><button onClick={() => setTab('overview')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'overview' ? 'bg-white text-[#182653] shadow-sm' : 'text-[#718098]'}`} data-testid="button-admin-overview">Retraits & vouchers</button><button onClick={() => setTab('users')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'users' ? 'bg-white text-[#182653] shadow-sm' : 'text-[#718098]'}`} data-testid="button-admin-users">Utilisateurs</button><button onClick={() => setTab('logs')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'logs' ? 'bg-white text-[#182653] shadow-sm' : 'text-[#718098]'}`} data-testid="button-admin-logs">Logs</button></div>{tab === 'overview' && <section className="mt-4 rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">Demandes à traiter</h2><p className="mt-1 text-xs text-[#94a1b3]">Vérifiez les pièces avant de valider le paiement.</p></div><ShieldCheck size={20} className="text-[#1a9ba4]" /></div>{pending.length === 0 ? <div className="py-12 text-center"><CheckCircle2 className="mx-auto text-[#2b9a78]" size={26} /><p className="mt-3 text-sm font-bold">Tout est à jour</p><p className="mt-1 text-xs text-[#94a1b3]">Aucun retrait en attente.</p></div> : <div className="mt-5 space-y-3">{pending.map((item) => { const owner = users.find((entry) => entry.id === item.userId); return <div key={item.id} className="rounded-xl border border-[#edf1f5] p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9edff] text-xs font-extrabold text-[#334ba0]">{initials(owner?.name || 'Membre')}</span><div><p className="text-sm font-bold">{owner?.name || 'Membre'} <span className="ml-1 font-normal text-[#94a1b3]">· {date(item.createdAt)}</span></p><p className="mt-1 text-xs text-[#718098]">{money.format(item.amount)} via {item.method}</p></div></div><div className="flex gap-2"><button onClick={() => act(item.id, 'rejected')} className="flex items-center gap-1.5 rounded-lg border border-[#f0d4d1] px-3 py-2 text-xs font-bold text-[#bd4545]" data-testid={`button-reject-${item.id}`}><XCircle size={14} /> Rejeter</button><button onClick={() => act(item.id, 'approved')} className="flex items-center gap-1.5 rounded-lg bg-[#2b9a78] px-3 py-2 text-xs font-bold text-white" data-testid={`button-approve-${item.id}`}><Check size={14} /> Valider</button></div></div>{(item.voucherImage || item.kycImage) && <div className="mt-4 grid gap-3 border-t border-[#edf1f5] pt-4 sm:grid-cols-2">{item.voucherImage && <div><p className="mb-2 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94a1b3]"><FileImage size={12} /> Voucher Transcash</p><img src={item.voucherImage} alt="Voucher Transcash envoyé" className="max-h-60 w-full rounded-lg border border-[#e4eaf1] object-contain" data-testid={`img-admin-voucher-${item.id}`} /></div>}{item.kycImage && <div><p className="mb-2 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94a1b3]"><FileImage size={12} /> Pièce d’identité</p><img src={item.kycImage} alt="Pièce d’identité envoyée" className="max-h-60 w-full rounded-lg border border-[#e4eaf1] object-contain" data-testid={`img-admin-kyc-${item.id}`} /></div>}</div>}</div>; })}</div>}</section>}{tab === 'users' && <section className="mt-4 overflow-hidden rounded-2xl border border-[#e4eaf1] bg-white shadow-sm"><div className="grid grid-cols-[1.5fr_1fr_.7fr_.7fr] border-b border-[#edf1f5] px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#9aa6b7]"><span>Utilisateur</span><span>Inscription</span><span>Solde</span><span>Rôle</span></div>{users.map((entry) => <div key={entry.id} className="grid grid-cols-[1.5fr_1fr_.7fr_.7fr] items-center border-b border-[#f0f3f6] px-5 py-4 last:border-0"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e9edff] text-[10px] font-extrabold text-[#334ba0]">{initials(entry.name)}</span><div><p className="text-xs font-bold">{entry.name}</p><p className="text-[10px] text-[#94a1b3]">{entry.email}</p></div></div><span className="text-xs text-[#718098]">{date(entry.createdAt)}</span><span className="text-xs font-bold">{money.format(entry.balance)}</span><span className="text-[10px] font-extrabold uppercase text-[#168d94]">{entry.isAdmin ? 'Admin' : 'Membre'}</span></div>)}</section>}{tab === 'logs' && <section className="mt-4 rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><History size={18} className="text-[#1a9ba4]" /><h2 className="font-extrabold">Journal d’activité</h2></div><div className="mt-4 divide-y divide-[#edf1f5]">{logs.length === 0 ? <p className="py-8 text-center text-sm text-[#94a1b3]">Aucun log enregistré.</p> : logs.slice(0, 20).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><p className="text-xs font-semibold">{item.description}</p><span className="shrink-0 text-[10px] text-[#94a1b3]">{date(item.createdAt)}</span></div>)}</div></section>}</Shell>;
}

function Admin({ user, onNotice }: { user: User; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'overview' | 'users' | 'logs'>('overview');
  const [, refresh] = useState(0);
  useEffect(() => { if (!user.isAdmin) setLocation('/home'); }, [user.isAdmin, setLocation]);
  const users = read<User[]>(STORAGE.users, []);
  const vouchers = read<VoucherPayment[]>(STORAGE.vouchers, []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const withdrawals = read<Withdrawal[]>(STORAGE.withdrawals, []);
  const logs = read<ActivityLog[]>(STORAGE.logs, []);
  const pendingVouchers = vouchers.filter((item) => item.status === 'pending');
  const pendingWithdrawals = withdrawals.filter((item) => item.status === 'pending');
  const revenue = users.reduce((sum, item) => sum + item.videosWatched * 5 + item.referrals * 10, 0) + vouchers.filter((item) => item.status === 'approved').length * 50;

  const actVoucher = (id: string, status: 'approved' | 'rejected') => {
    const updated = vouchers.map((item) => item.id === id ? { ...item, status, reviewedAt: new Date().toISOString() } : item);
    write(STORAGE.vouchers, updated);
    const item = vouchers.find((entry) => entry.id === id);
    write(STORAGE.logs, [{ id: uid('log'), type: `voucher-${status}`, description: `${status === 'approved' ? 'Voucher Transcash validé' : 'Voucher Transcash rejeté'} · ${money.format(item?.amount || 50)}`, createdAt: new Date().toISOString() }, ...logs]);
    refresh((value) => value + 1);
    onNotice({ message: status === 'approved' ? 'Voucher validé. Les retraits sont débloqués.' : 'Voucher rejeté.' });
  };

  const actWithdrawal = (id: string, status: 'approved' | 'rejected') => {
    write(STORAGE.withdrawals, withdrawals.map((item) => item.id === id ? { ...item, status } : item));
    const item = withdrawals.find((entry) => entry.id === id);
    write(STORAGE.logs, [{ id: uid('log'), type: status, description: `${status === 'approved' ? 'Retrait validé' : 'Retrait rejeté'} · ${money.format(item?.amount || 0)}`, createdAt: new Date().toISOString() }, ...logs]);
    refresh((value) => value + 1);
    onNotice({ message: status === 'approved' ? 'Retrait validé.' : 'Retrait rejeté.' });
  };

  if (!user.isAdmin) return null;
  return <Shell user={user} path="/admin">
    <PageHeading eyebrow="Centre de contrôle" title="Administration" description="Supervisez les comptes, les paiements et les codes Transcash." action={<button onClick={() => { refresh((value) => value + 1); onNotice({ message: 'Données actualisées.' }); }} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-4 text-sm font-bold text-[#52617b]" data-testid="button-refresh-admin"><RefreshCw size={16} /> Actualiser</button>} />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl bg-[#182653] p-5 text-white"><Users size={18} className="text-[#26D0CE]" /><p className="mt-5 text-xs text-white/55">Utilisateurs</p><p className="mt-1 text-3xl font-extrabold">{users.length}</p></div>
      <div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><CircleDollarSign size={18} className="text-[#168d94]" /><p className="mt-5 text-xs text-[#94a1b3]">Revenus générés</p><p className="mt-1 text-3xl font-extrabold">{money.format(revenue)}</p></div>
      <div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><Clock3 size={18} className="text-[#c77a1e]" /><p className="mt-5 text-xs text-[#94a1b3]">Retraits en attente</p><p className="mt-1 text-3xl font-extrabold">{pendingWithdrawals.length}</p></div>
      <div className="rounded-2xl border border-[#e4eaf1] bg-white p-5"><CreditCard size={18} className="text-[#334ba0]" /><p className="mt-5 text-xs text-[#94a1b3]">Vouchers à vérifier</p><p className="mt-1 text-3xl font-extrabold">{pendingVouchers.length}</p></div>
    </div>
    <div className="mt-7 flex gap-1 rounded-xl bg-[#edf2f7] p-1"><button onClick={() => setTab('overview')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'overview' ? 'bg-white text-[#182653] shadow-sm' : 'text-[#718098]'}`} data-testid="button-admin-overview">Retraits & vouchers</button><button onClick={() => setTab('users')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'users' ? 'bg-white text-[#182653] shadow-sm' : 'text-[#718098]'}`} data-testid="button-admin-users">Utilisateurs</button><button onClick={() => setTab('logs')} className={`rounded-lg px-4 py-2 text-xs font-bold ${tab === 'logs' ? 'bg-white text-[#182653] shadow-sm' : 'text-[#718098]'}`} data-testid="button-admin-logs">Logs</button></div>
    {tab === 'overview' && <div className="mt-4 space-y-5">
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">Codes Transcash à vérifier</h2><p className="mt-1 text-xs text-[#94a1b3]">Validez le paiement de 50 € avant d’autoriser le retrait.</p></div><ShieldCheck size={20} className="text-[#1a9ba4]" /></div>{pendingVouchers.length === 0 ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto text-[#2b9a78]" size={26} /><p className="mt-3 text-sm font-bold">Aucun voucher à vérifier</p></div> : <div className="mt-5 space-y-4">{pendingVouchers.map((item) => { const owner = users.find((entry) => entry.id === item.userId); return <div key={item.id} className="rounded-xl border border-[#edf1f5] p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><p className="text-sm font-bold">{owner?.name || 'Membre'} <span className="ml-1 font-normal text-[#94a1b3]">· {date(item.createdAt)}</span></p><p className="mt-1 text-xs text-[#718098]">{owner?.email || 'Email indisponible'} · Voucher de {money.format(item.amount)}</p></div><div className="flex gap-2"><button onClick={() => actVoucher(item.id, 'rejected')} className="flex items-center gap-1.5 rounded-lg border border-[#f0d4d1] px-3 py-2 text-xs font-bold text-[#bd4545]" data-testid={`button-reject-voucher-${item.id}`}><XCircle size={14} /> Rejeter</button><button onClick={() => actVoucher(item.id, 'approved')} className="flex items-center gap-1.5 rounded-lg bg-[#2b9a78] px-3 py-2 text-xs font-bold text-white" data-testid={`button-approve-voucher-${item.id}`}><Check size={14} /> Valider</button></div></div><div className="mt-4 border-t border-[#edf1f5] pt-4"><p className="mb-2 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94a1b3]"><FileImage size={12} /> Photo complète du code Transcash</p><img src={item.voucherImage} alt={`Photo du voucher Transcash de ${owner?.name || 'l’utilisateur'}`} className="max-h-[70vh] w-full rounded-xl border border-[#e4eaf1] bg-[#f8fafc] object-contain" data-testid={`img-admin-voucher-payment-${item.id}`} /></div></div>; })}</div>}</section>
      <section className="rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">Demandes de retrait à traiter</h2><p className="mt-1 text-xs text-[#94a1b3]">Vérifiez les pièces avant de valider le paiement.</p></div><ArrowDownToLine size={20} className="text-[#1a9ba4]" /></div>{pendingWithdrawals.length === 0 ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto text-[#2b9a78]" size={26} /><p className="mt-3 text-sm font-bold">Aucun retrait en attente</p></div> : <div className="mt-5 space-y-3">{pendingWithdrawals.map((item) => { const owner = users.find((entry) => entry.id === item.userId); return <div key={item.id} className="rounded-xl border border-[#edf1f5] p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><p className="text-sm font-bold">{owner?.name || 'Membre'} <span className="ml-1 font-normal text-[#94a1b3]">· {date(item.createdAt)}</span></p><p className="mt-1 text-xs text-[#718098]">{money.format(item.amount)} via {item.method}</p></div><div className="flex gap-2"><button onClick={() => actWithdrawal(item.id, 'rejected')} className="flex items-center gap-1.5 rounded-lg border border-[#f0d4d1] px-3 py-2 text-xs font-bold text-[#bd4545]" data-testid={`button-reject-withdrawal-${item.id}`}><XCircle size={14} /> Rejeter</button><button onClick={() => actWithdrawal(item.id, 'approved')} className="flex items-center gap-1.5 rounded-lg bg-[#2b9a78] px-3 py-2 text-xs font-bold text-white" data-testid={`button-approve-withdrawal-${item.id}`}><Check size={14} /> Valider</button></div></div>{item.kycImage && <div className="mt-4 border-t border-[#edf1f5] pt-4"><p className="mb-2 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#94a1b3]"><FileImage size={12} /> Pièce d’identité — photo complète</p><img src={item.kycImage} alt="Pièce d’identité envoyée" className="max-h-[70vh] w-full rounded-xl border border-[#e4eaf1] bg-[#f8fafc] object-contain" data-testid={`img-admin-kyc-${item.id}`} /></div>}</div>; })}</div>}</section>
    </div>}
    {tab === 'users' && <section className="mt-4 overflow-hidden rounded-2xl border border-[#e4eaf1] bg-white shadow-sm"><div className="grid grid-cols-[1.5fr_1fr_.7fr_.7fr] border-b border-[#edf1f5] px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#9aa6b7]"><span>Utilisateur</span><span>Inscription</span><span>Solde</span><span>Rôle</span></div>{users.map((entry) => <div key={entry.id} className="grid grid-cols-[1.5fr_1fr_.7fr_.7fr] items-center border-b border-[#f0f3f6] px-5 py-4 last:border-0"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e9edff] text-[10px] font-extrabold text-[#334ba0]">{initials(entry.name)}</span><div><p className="text-xs font-bold">{entry.name}</p><p className="text-[10px] text-[#94a1b3]">{entry.email}</p></div></div><span className="text-xs text-[#718098]">{date(entry.createdAt)}</span><span className="text-xs font-bold">{money.format(entry.balance)}</span><span className="text-[10px] font-extrabold uppercase text-[#168d94]">{entry.isAdmin ? 'Admin' : 'Membre'}</span></div>)}</section>}
    {tab === 'logs' && <section className="mt-4 rounded-2xl border border-[#e4eaf1] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><History size={18} className="text-[#1a9ba4]" /><h2 className="font-extrabold">Journal d’activité</h2></div><div className="mt-4 divide-y divide-[#edf1f5]">{logs.length === 0 ? <p className="py-8 text-center text-sm text-[#94a1b3]">Aucun log enregistré.</p> : logs.slice(0, 20).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><p className="text-xs font-semibold">{item.description}</p><span className="shrink-0 text-[10px] text-[#94a1b3]">{date(item.createdAt)}</span></div>)}</div></section>}
  </Shell>;
}

function AuthGuard({ children, onNotice }: { children: (user: User) => ReactNode; onNotice: (notice: Notice) => void }) {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const user = isLoaded && isSignedIn && clerkUser ? ensureLocalUser(clerkUser) : undefined;
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation('/');
      onNotice({ message: 'Connectez-vous pour accéder à cet espace.', kind: 'error' });
    }
  }, [isLoaded, isSignedIn, setLocation, onNotice]);
  return user ? <>{children(user)}</> : <div className="min-h-[100dvh] bg-[#f6f9fc]" />;
}

function RedirectHome() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      const user = ensureLocalUser(clerkUser);
      setLocation(user.isAdmin ? '/admin' : '/home');
    }
  }, [isLoaded, isSignedIn, clerkUser, setLocation]);
  if (isLoaded && !isSignedIn) return <PublicHome />;
  return <div className="grid min-h-[100dvh] place-items-center bg-[#f6f9fc]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#dce4ee] border-t-[#1a9ba4]" /></div>;
}

function AppRouter({ onNotice, bump }: { onNotice: (notice: Notice) => void; bump: () => void }) {
  const updateUser = (user: User) => { const users = read<User[]>(STORAGE.users, []).map((entry) => entry.id === user.id ? user : entry); write(STORAGE.users, users); bump(); };
  return <Switch>
    <Route path="/" component={RedirectHome} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/login"><SignInPage /></Route>
    <Route path="/register"><SignUpPage /></Route>
    <Route path="/home"><AuthGuard onNotice={onNotice}>{(user) => <Home user={user} updateUser={updateUser} onNotice={onNotice} />}</AuthGuard></Route>
    <Route path="/live"><AuthGuard onNotice={onNotice}>{(user) => <Live user={user} onNotice={onNotice} />}</AuthGuard></Route>
    <Route path="/withdraw"><AuthGuard onNotice={onNotice}>{(user) => <VoucherWithdrawal user={user} updateUser={updateUser} onNotice={onNotice} />}</AuthGuard></Route>
    <Route path="/support"><AuthGuard onNotice={onNotice}>{(user) => <SupportPage user={user} onNotice={onNotice} />}</AuthGuard></Route>
    <Route path="/profile"><AuthGuard onNotice={onNotice}>{(user) => <Profile user={user} onNotice={onNotice} />}</AuthGuard></Route>
    <Route path="/admin"><AuthGuard onNotice={onNotice}>{(user) => <Admin user={user} onNotice={onNotice} />}</AuthGuard></Route>
    <Route path="/admin/support"><AuthGuard onNotice={onNotice}>{(user) => <AdminSupport user={user} onNotice={onNotice} />}</AuthGuard></Route>
    <Route><RedirectHome /></Route>
  </Switch>;
}

function ClerkApp({ notice, onNotice, onClose, bump }: { notice: Notice | null; onNotice: (next: Notice) => void; onClose: () => void; bump: () => void }) {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  >
    <AppRouter onNotice={onNotice} bump={bump} />
    <Toast notice={notice} onClose={onClose} />
  </ClerkProvider>;
}

function App() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [, setVersion] = useState(0);
  const onNotice = (next: Notice) => { setNotice(next); window.setTimeout(() => setNotice(null), 3600); };
  return <WouterRouter base={basePath}>
    <ClerkApp notice={notice} onNotice={onNotice} onClose={() => setNotice(null)} bump={() => setVersion((value) => value + 1)} />
  </WouterRouter>;
}

export default App;