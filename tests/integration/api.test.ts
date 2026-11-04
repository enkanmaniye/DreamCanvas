import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import sharp from 'sharp';
import * as account from '../../src/app/api/account/route';
import * as analyze from '../../src/app/api/analyze/route';
import * as file from '../../src/app/api/assets/file/route';
import * as upload from '../../src/app/api/assets/upload/route';
import * as boardById from '../../src/app/api/boards/[id]/route';
import * as boards from '../../src/app/api/boards/route';
import * as generate from '../../src/app/api/images/generate/route';
import * as status from '../../src/app/api/status/route';
import { setAuthResolverForTests } from '../../src/lib/supabase/server';
import { PALETTES } from '../../src/lib/scene/palettes';
import { compose } from '../../src/lib/scene/templates';
import { FakeDatabase } from './fake-supabase';

const URL_BASE = 'http://test.local';
const A = 'user-a';
const B = 'user-b';
let db: FakeDatabase;

function request(path: string, init: RequestInit & { as?: string } = {}) {
  const { as, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (as) headers.set('authorization', `Bearer ${as}`);
  if (typeof rest.body === 'string') headers.set('content-type', 'application/json');
  return new Request(`${URL_BASE}${path}`, { ...rest, headers });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

function payload(title = 'My board') {
  const { scene } = compose({ templateId: 'editorial-grid', shape: 'landscape', assets: [], title, quotes: ['A line'], stickerTags: [], palette: PALETTES[0], fontPairId: 'editorial', seed: 1 });
  return JSON.stringify({ title, scene, assets: [], theme: null, thumbnail: `data:image/webp;base64,${Buffer.from('thumb').toString('base64')}` });
}

async function createAs(user: string, title = 'My board') {
  const response = await boards.POST(request('/api/boards', { method: 'POST', body: payload(title), as: user }));
  assert.equal(response.status, 201);
  return ((await response.json()) as { board: { id: string } }).board;
}

beforeEach(() => {
  db = new FakeDatabase();
  setAuthResolverForTests(async (token) => ([A, B].includes(token) ? db.contextFor(token) : null));
});
afterEach(() => setAuthResolverForTests(null));

describe('owned board CRUD', () => {
  it('creates, lists, reads, updates and deletes with editable layers intact', async () => {
    const board = await createAs(A, 'Summer');
    const list = (await (await boards.GET(request('/api/boards', { as: A }))).json()) as { boards: { id: string; title: string; thumbnail: string }[] };
    assert.equal(list.boards[0].title, 'Summer');
    assert.match(list.boards[0].thumbnail, /signed/);
    const read = (await (await boardById.GET(request(`/api/boards/${board.id}`, { as: A }), params(board.id))).json()) as { board: { scene: { objects: { type: string }[] } } };
    assert.ok(read.board.scene.objects.some((o) => o.type === 'text'));
    const patched = await boardById.PATCH(request(`/api/boards/${board.id}`, { method: 'PATCH', body: JSON.stringify({ title: 'Renamed' }), as: A }), params(board.id));
    assert.equal(((await patched.json()) as { board: { title: string } }).board.title, 'Renamed');
    assert.equal((await boardById.DELETE(request(`/api/boards/${board.id}`, { method: 'DELETE', as: A }), params(board.id))).status, 204);
    assert.equal((await boardById.GET(request(`/api/boards/${board.id}`, { as: A }), params(board.id))).status, 404);
    assert.equal(db.files.size, 0, 'thumbnail removed with the board');
  });

  it('rejects malformed boards', async () => {
    const response = await boards.POST(request('/api/boards', { method: 'POST', body: JSON.stringify({ title: 'x', scene: { objects: 'nope' } }), as: A }));
    assert.equal(response.status, 400);
  });
});

describe('User A cannot reach User B’s data', () => {
  it('can’t read, edit, delete or list it, and gets 404 rather than a hint it exists', async () => {
    const board = await createAs(A, 'Private');
    assert.equal((await boardById.GET(request(`/api/boards/${board.id}`, { as: B }), params(board.id))).status, 404);
    assert.equal((await boardById.PATCH(request(`/api/boards/${board.id}`, { method: 'PATCH', body: JSON.stringify({ title: 'Hacked' }), as: B }), params(board.id))).status, 404);
    assert.equal((await boardById.DELETE(request(`/api/boards/${board.id}`, { method: 'DELETE', as: B }), params(board.id))).status, 404);
    const list = (await (await boards.GET(request('/api/boards', { as: B }))).json()) as { boards: unknown[] };
    assert.equal(list.boards.length, 0);
    assert.equal(db.tables.boards[0].title, 'Private');
  });

  it('can’t fetch or delete another person’s photo, even with path tricks', async () => {
    db.files.set(`${A}/uploads/x.webp`, { body: new Uint8Array([1]), contentType: 'image/webp' });
    for (const path of [`${A}/uploads/x.webp`, `${B}/../${A}/uploads/x.webp`]) {
      const q = encodeURIComponent(path);
      assert.equal((await file.GET(request(`/api/assets/file?path=${q}`, { as: B }))).status, 404, path);
      assert.equal((await file.DELETE(request(`/api/assets/file?path=${q}`, { method: 'DELETE', as: B }))).status, 404, path);
    }
    assert.equal((await file.GET(request(`/api/assets/file?path=${encodeURIComponent(`${A}/uploads/x.webp`)}`, { as: A }))).status, 200);
    assert.equal(db.files.size, 1);
  });
});

describe('authentication', () => {
  it('rejects missing and invalid tokens on every private route', async () => {
    for (const token of [undefined, 'forged-token']) {
      assert.equal((await boards.GET(request('/api/boards', { as: token }))).status, 401);
      assert.equal((await boards.POST(request('/api/boards', { method: 'POST', body: payload(), as: token }))).status, 401);
      assert.equal((await boardById.GET(request('/api/boards/x', { as: token }), params('x'))).status, 401);
      assert.equal((await file.GET(request('/api/assets/file?path=a', { as: token }))).status, 401);
      assert.equal((await upload.POST(request('/api/assets/upload', { method: 'POST', as: token }))).status, 401);
      assert.equal((await account.DELETE(request('/api/account', { method: 'DELETE', as: token }))).status, 401);
    }
  });

  it('says accounts are off instead of pretending when Supabase is not configured', async () => {
    setAuthResolverForTests(null);
    const response = await boards.GET(request('/api/boards', { as: A }));
    assert.equal(response.status, 503);
    assert.equal(((await response.json()) as { code: string }).code, 'supabase_unconfigured');
  });
});

describe('uploads', () => {
  const send = (bytes: Uint8Array, name: string, type: string) => {
    const form = new FormData();
    form.append('file', new File([bytes as BlobPart], name, { type }));
    return upload.POST(new Request(`${URL_BASE}/api/assets/upload`, { method: 'POST', body: form, headers: { authorization: `Bearer ${A}` } }));
  };

  it('stores a real image privately and strips EXIF such as location', async () => {
    const jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#FF72B5' } }).withExif({ IFD0: { ImageDescription: 'HOME-ADDRESS-MARKER' } }).jpeg().toBuffer();
    assert.ok(jpeg.includes('HOME-ADDRESS-MARKER'), 'fixture really has EXIF');
    const response = await send(jpeg, 'a.jpg', 'image/jpeg');
    assert.equal(response.status, 201);
    const { path } = (await response.json()) as { path: string };
    assert.ok(path.startsWith(`${A}/`));
    const stored = db.files.get(path)!;
    assert.ok(!Buffer.from(stored.body).includes('HOME-ADDRESS-MARKER'));
    assert.equal((await sharp(Buffer.from(stored.body)).metadata()).format, 'webp');
  });

  it('rejects a script renamed to .jpg, a truncated image and an unsupported type', async () => {
    assert.equal((await send(new TextEncoder().encode('<script>'), 'a.jpg', 'image/jpeg')).status, 415);
    assert.equal((await send(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1]), 'b.jpg', 'image/jpeg')).status, 415);
    assert.equal((await send(new TextEncoder().encode('<svg>'), 'c.svg', 'image/svg+xml')).status, 415);
    assert.equal(db.files.size, 0);
  });
});

describe('secrets and switched-off features', () => {
  it('status reports capabilities and never secret values', async () => {
    process.env.GEMINI_API_KEY = 'super-secret-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-service';
    const text = await (await status.GET()).text();
    delete process.env.GEMINI_API_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(!text.includes('super-secret'));
    assert.match(text, /gemini/);
  });

  it('no browser code reads a server secret', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
    const client = [...walk('src/components'), 'src/lib/config.ts', 'src/lib/api.ts', 'src/lib/supabase/client.ts'];
    for (const path of client) {
      assert.doesNotMatch(readFileSync(path, 'utf8'), /GEMINI_API_KEY|SERVICE_ROLE|IMAGE_GENERATION_API_KEY/, path);
    }
  });

  it('image generation is off by default', async () => {
    const response = await generate.POST(request('/api/images/generate', { method: 'POST', body: '{}', as: A }));
    assert.equal(response.status, 503);
  });

  it('account deletion explains itself when the service key is missing', async () => {
    assert.equal((await account.DELETE(request('/api/account', { method: 'DELETE', as: A }))).status, 503);
  });

  it('analyze rejects empty input and oversized bodies', async () => {
    assert.equal((await analyze.POST(request('/api/analyze', { method: 'POST', body: '{}' }))).status, 400);
    assert.equal((await analyze.POST(request('/api/analyze', { method: 'POST', body: 'not json' }))).status, 400);
    assert.equal((await analyze.POST(request('/api/analyze', { method: 'POST', body: '{}', headers: { 'content-length': String(9 * 1024 * 1024) } }))).status, 413);
    const ok = await analyze.POST(request('/api/analyze', { method: 'POST', body: JSON.stringify({ text: 'A beach holiday' }) }));
    assert.equal(((await ok.json()) as { provider: string }).provider, 'rules');
  });
});
