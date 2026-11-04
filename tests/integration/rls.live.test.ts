// Runs the negative access tests against a REAL Supabase project, so the actual SQL policies are exercised.
// Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. Skipped without them.
// It creates two throwaway users and deletes them afterwards. Use a test project.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('Row Level Security on a live project', { skip: !(url && anon && service) ? 'Supabase keys not set' : false }, () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let admin: any; let a: any; let b: any; let idA: string; let idB: string; let boardId: string;
  const password = `Test-${crypto.randomUUID()}`;
  const scene = { objects: [] };

  before(async () => {
    const { createClient } = await import('@supabase/supabase-js');
    admin = createClient(url!, service!, { auth: { persistSession: false } });
    const make = async () => {
      const email = `rls-${crypto.randomUUID()}@example.com`;
      const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      const client = createClient(url!, anon!, { auth: { persistSession: false } });
      await client.auth.signInWithPassword({ email, password });
      return { client, id: data.user.id as string };
    };
    ({ client: a, id: idA } = await make());
    ({ client: b, id: idB } = await make());
    const { data, error } = await a.from('boards').insert({ user_id: idA, title: 'Private', canvas_json: { scene }, width: 1920, height: 1080 }).select().single();
    assert.equal(error, null);
    boardId = data.id;
  });

  after(async () => {
    await admin?.auth.admin.deleteUser(idA);
    await admin?.auth.admin.deleteUser(idB);
  });

  it('B can’t read A’s board', async () => {
    const { data } = await b.from('boards').select('*').eq('id', boardId);
    assert.deepEqual(data, []);
  });

  it('B can’t update or delete A’s board', async () => {
    await b.from('boards').update({ title: 'Hacked' }).eq('id', boardId);
    await b.from('boards').delete().eq('id', boardId);
    const { data } = await a.from('boards').select('title').eq('id', boardId).single();
    assert.equal(data.title, 'Private');
  });

  it('B can’t create a board in A’s name', async () => {
    const { error } = await b.from('boards').insert({ user_id: idA, title: 'Forged', canvas_json: { scene }, width: 1, height: 1 });
    assert.ok(error);
  });

  it('B can’t attach an asset to A’s board', async () => {
    const { error } = await b.from('board_assets').insert({ board_id: boardId, user_id: idB, source_type: 'upload' });
    assert.ok(error);
  });

  it('B can’t read or write in A’s storage folder', async () => {
    const path = `${idA}/uploads/rls.webp`;
    const body = new Blob(['x'], { type: 'image/webp' });
    assert.equal((await a.storage.from('board-images').upload(path, body)).error, null);
    assert.equal((await b.storage.from('board-images').download(path)).data, null);
    assert.ok((await b.storage.from('board-images').upload(`${idA}/uploads/evil.webp`, body)).error);
    await a.storage.from('board-images').remove([path]);
  });

  it('logged-out visitors see nothing', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { data } = await createClient(url!, anon!).from('boards').select('*');
    assert.deepEqual(data, []);
  });
});
