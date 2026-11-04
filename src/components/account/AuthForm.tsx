'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/Icon';
import { useApp } from '@/components/Providers';
import { PageShell } from '@/components/SiteChrome';
import { Notice, Spinner } from '@/components/ui';
import { getBrowserClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup' | 'reset';

const COPY: Record<Mode, { title: string; lead: string; action: string }> = {
  login: { title: 'Log in', lead: 'Open your saved boards on any device.', action: 'Log in' },
  signup: { title: 'Create your account', lead: 'Keep boards and photos privately in your own account.', action: 'Create account' },
  reset: { title: 'Reset your password', lead: 'We’ll email you a link. It opens Settings, where you can choose a new one.', action: 'Send reset link' },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const { accountsConfigured } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const copy = COPY[mode];

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = await getBrowserClient();
      if (!supabase) throw new Error('Accounts aren’t set up on this copy of DreamCanvas.');
      if (mode === 'login') {
        const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
        if (failure) throw failure;
        router.push('/dashboard');
      } else if (mode === 'signup') {
        const { data, error: failure } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/dashboard` } });
        if (failure) throw failure;
        if (data.session) router.push('/dashboard');
        else setSent(`Check ${email} for a link to confirm your account.`);
      } else {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/settings` });
        if (failure) throw failure;
        setSent(`If ${email} has an account, a reset link is on its way.`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const supabase = await getBrowserClient();
    const result = await supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } });
    if (result?.error) setError('Google sign-in isn’t set up on this project yet. Use your email instead.');
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-4xl font-extrabold">{copy.title}</h1>
        <p className="mt-2 text-ink-soft">{copy.lead}</p>
        {!accountsConfigured ? (
          <div className="mt-6 space-y-4">
            <Notice tone="warn" title="Accounts aren’t set up on this copy">
              Logging in needs a Supabase project, and none is connected, so this form is switched off. Your boards are saved in this browser instead.
            </Notice>
            <Link href="/create" className="btn btn-primary w-full">Continue in Local Demo Mode</Link>
          </div>
        ) : sent ? (
          <div className="mt-6"><Notice tone="ok" title="Check your email">{sent}</Notice></div>
        ) : (
          <form onSubmit={submit} className="panel panel-lift mt-6 space-y-4 p-5">
            {error && <Notice tone="error">{error}</Notice>}
            {mode === 'signup' && (
              <div>
                <label className="field-label" htmlFor="name">Name (optional)</label>
                <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input id="email" className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            {mode !== 'reset' && (
              <div>
                <label className="field-label" htmlFor="password">Password</label>
                <input id="password" className="field" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                {mode === 'signup' && <p className="field-hint">At least 8 characters.</p>}
              </div>
            )}
            <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner />}{copy.action}</button>
            {mode !== 'reset' && <button type="button" className="btn w-full" onClick={google}><Icon name="User" />Continue with Google</button>}
          </form>
        )}
        {accountsConfigured && (
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
            {mode === 'login' ? <Link className="underline" href="/signup">Create an account</Link> : <Link className="underline" href="/login">Log in instead</Link>}
            {mode === 'login' && <Link className="underline" href="/reset-password">Forgot your password?</Link>}
          </div>
        )}
      </div>
    </PageShell>
  );
}
