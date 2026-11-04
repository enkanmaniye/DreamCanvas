'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useApp } from '@/components/Providers';
import { PageShell } from '@/components/SiteChrome';
import { Modal, Notice, PageHeading } from '@/components/ui';
import { getStatus, type AppStatus } from '@/lib/api';
import { readDefaultExport, writeDefaultExport } from '@/lib/prefs';
import { EXPORT_SIZES } from '@/lib/scene/types';
import { localUsage, wipeLocalData } from '@/lib/store/local';
import { getBrowserClient } from '@/lib/supabase/client';

function aiDescription(status: AppStatus): string {
  if (status.ai.provider === 'gemini') return `Google Gemini (${status.ai.model}). Small copies of photos are sent only after you agree each time.${status.ai.freeTierDataUse ? ' This project uses the free tier, where Google may use what’s sent to improve its products.' : ''}`;
  if (status.ai.provider === 'ollama') return `${status.ai.model} on this computer through Ollama. Photos stay here.`;
  return 'No AI is connected. Suggestions come from simple keyword rules in Local Demo Mode.';
}

export function Settings() {
  const { user, accountsConfigured, getToken, toast } = useApp();
  const router = useRouter();
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [usage, setUsage] = useState<{ boards: number; photos: number } | null>(null);
  const [exportSize, setExportSize] = useState('uhd');
  const [confirm, setConfirm] = useState<'local' | 'account' | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    void getStatus().then(setStatus);
    setExportSize(readDefaultExport());
    localUsage().then(setUsage).catch(() => undefined);
  }, []);

  useEffect(() => setName(user?.displayName ?? ''), [user]);

  async function saveName() {
    const supabase = await getBrowserClient();
    const result = await supabase?.auth.updateUser({ data: { display_name: name } });
    toast(result?.error ? 'Your name couldn’t be saved.' : 'Name saved.', result?.error ? 'error' : 'ok');
  }

  /** Also finishes a password reset: the emailed link signs the person in and lands here. */
  async function savePassword() {
    const supabase = await getBrowserClient();
    const result = await supabase?.auth.updateUser({ password });
    if (result?.error) {
      toast(result.error.message, 'error');
      return;
    }
    setPassword('');
    toast('Password changed.');
  }

  async function signOut() {
    const supabase = await getBrowserClient();
    await supabase?.auth.signOut();
    router.push('/');
  }

  async function deleteAccount() {
    setConfirm(null);
    const token = await getToken();
    const response = await fetch('/api/account', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast(body?.error ?? 'Your account couldn’t be deleted.', 'error');
      return;
    }
    await wipeLocalData().catch(() => undefined);
    await signOut();
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <PageHeading title="Settings" />

        <section className="panel space-y-3 p-5" aria-labelledby="s-account">
          <h2 id="s-account" className="text-2xl font-bold">Account</h2>
          {user ? (
            <>
              <p>Logged in as <strong>{user.email}</strong>{user.verified ? '' : ' (email not confirmed yet)'}</p>
              <div>
                <label className="field-label" htmlFor="display">Display name</label>
                <div className="flex gap-2">
                  <input id="display" className="field" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                  <button type="button" className="btn btn-sm flex-none" onClick={() => void saveName()}>Save name</button>
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="new-password">New password</label>
                <div className="flex gap-2">
                  <input id="new-password" className="field" type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="btn btn-sm flex-none" disabled={password.length < 8} onClick={() => void savePassword()}>Change password</button>
                </div>
                <p className="field-hint">At least 8 characters.</p>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => void signOut()}><Icon name="LogOut" size={16} />Log out</button>
            </>
          ) : accountsConfigured ? (
            <Notice action={<Link className="btn btn-sm" href="/login">Log in</Link>}>You’re in guest mode, so boards stay in this browser.</Notice>
          ) : (
            <Notice>Accounts aren’t set up on this copy. You’re in Local Demo Mode, so boards are saved in this browser and nowhere else.</Notice>
          )}
        </section>

        <section className="panel space-y-3 p-5" aria-labelledby="s-export">
          <h2 id="s-export" className="text-2xl font-bold">Download size</h2>
          <div>
            <label className="field-label" htmlFor="default-size">Default size for desktop boards</label>
            <select id="default-size" className="field" value={exportSize} onChange={(e) => { setExportSize(e.target.value); writeDefaultExport(e.target.value); toast('Default size saved.'); }}>
              {EXPORT_SIZES.filter((s) => s.width > s.height).map((s) => <option key={s.id} value={s.id}>{s.label} ({s.width}×{s.height})</option>)}
            </select>
          </div>
        </section>

        <section className="panel space-y-3 p-5" aria-labelledby="s-privacy">
          <h2 id="s-privacy" className="text-2xl font-bold">Privacy</h2>
          <p><strong>AI on this copy:</strong> {status ? aiDescription(status) : 'Checking…'}</p>
          <p><Link className="underline" href="/privacy">Read how your photos are handled</Link></p>
        </section>

        <section className="panel space-y-3 border-pink-deep p-5" aria-labelledby="s-delete">
          <h2 id="s-delete" className="text-2xl font-bold">Delete your data</h2>
          <p className="text-ink-soft">{usage ? `This browser holds ${usage.boards} boards and ${usage.photos} photos.` : 'Checking this browser’s storage…'}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-sm" onClick={() => setConfirm('local')}><Icon name="Trash" size={16} />Delete everything in this browser</button>
            {user && <button type="button" className="btn btn-sm btn-primary" onClick={() => setConfirm('account')}><Icon name="Trash" size={16} />Delete my account</button>}
          </div>
        </section>
      </div>

      {confirm === 'local' && (
        <Modal title="Delete everything in this browser?" onClose={() => setConfirm(null)}>
          <p>All boards, photos and drafts saved in this browser will be removed. This can’t be undone.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-primary" onClick={async () => { setConfirm(null); await wipeLocalData(); setUsage({ boards: 0, photos: 0 }); toast('Everything in this browser was deleted.'); }}>Delete everything</button>
            <button type="button" className="btn" onClick={() => setConfirm(null)}>Keep my data</button>
          </div>
        </Modal>
      )}
      {confirm === 'account' && (
        <Modal title="Delete your account?" onClose={() => setConfirm(null)}>
          <p>Your account, boards and uploaded photos will be permanently deleted. This can’t be undone.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-primary" onClick={() => void deleteAccount()}>Delete my account</button>
            <button type="button" className="btn" onClick={() => setConfirm(null)}>Keep my account</button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
