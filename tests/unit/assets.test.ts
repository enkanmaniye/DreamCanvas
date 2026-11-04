import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchLicensedImage, isSafeRemoteUrl, searchOpenverse } from '../../src/lib/assets/openverse';
import { DEMO_ASSETS, matchDemoAssets } from '../../src/lib/assets/demo-library';
import { exportFilename, sanitizeFilename } from '../../src/lib/filename';
import { checkFileMeta, sniffImageType } from '../../src/lib/images/validate';
import { rateLimit } from '../../src/lib/server/http';

const id = '11111111-2222-3333-4444-555555555555';
const record = (over = {}) => ({ id, title: 'Sea', creator: 'Ana', license: 'cc0', license_version: '1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', foreign_landing_url: 'https://example.org/sea', url: 'https://images.example.org/sea.jpg', thumbnail: 'https://api.openverse.org/thumb', width: 800, height: 600, ...over });
const json = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

describe('filenames', () => {
  it('follows the PRD pattern and strips unsafe characters', () => {
    assert.equal(exportFilename('Golden Summer!', 3840, 2160, 'png'), 'dreamcanvas-golden-summer-3840x2160.png');
    assert.equal(sanitizeFilename('../../etc/passwd'), 'etc-passwd');
    assert.equal(sanitizeFilename('  '), 'wallpaper');
    assert.equal(sanitizeFilename('Été à Paris'), 'ete-a-paris');
    assert.equal(sanitizeFilename('夢の家'), '夢の家');
    assert.ok(sanitizeFilename('x'.repeat(300)).length <= 60);
  });
});

describe('upload validation', () => {
  it('accepts the supported types and rejects the rest', () => {
    assert.equal(checkFileMeta('a.jpg', 'image/jpeg', 100), null);
    assert.equal(checkFileMeta('a.webp', 'image/webp', 100), null);
    assert.equal(checkFileMeta('a.gif', 'image/gif', 100), 'unsupported');
    assert.equal(checkFileMeta('a.svg', 'image/svg+xml', 100), 'unsupported');
    assert.equal(checkFileMeta('a.exe', '', 100), 'unsupported');
    assert.equal(checkFileMeta('a.heic', 'image/heic', 100), 'heic');
    assert.equal(checkFileMeta('a.jpg', 'image/jpeg', 11 * 1024 * 1024), 'too-large');
    assert.equal(checkFileMeta('a.jpg', 'image/jpeg', 0), 'empty');
  });

  it('checks real file bytes, not the name', () => {
    assert.equal(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
    assert.equal(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
    assert.equal(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
    assert.equal(sniffImageType(new TextEncoder().encode('<script>alert(1)</script>')), null);
  });
});

describe('license-aware sourcing', () => {
  it('asks only for CC0 and public domain, and drops results missing rights data', async () => {
    let url = '';
    const results = await searchOpenverse('sea', 'https://api.openverse.org/v1', (async (u: string) => {
      url = u;
      return json({ results: [record(), record({ license: 'by-nc' }), record({ license_url: null }), record({ foreign_landing_url: null }), record({ url: 'http://insecure.example.org/a.jpg' })] });
    }) as typeof fetch);
    assert.match(url, /license=cc0%2Cpdm/);
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].credit, { title: 'Sea', creator: 'Ana', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://example.org/sea' });
  });

  it('blocks private and non-https addresses', () => {
    for (const bad of ['http://example.org/a.jpg', 'https://localhost/a', 'https://127.0.0.1/a', 'https://10.0.0.8/a', 'https://192.168.1.1/a', 'https://172.16.0.1/a', 'https://169.254.169.254/latest/meta-data', 'https://[::1]/a', 'https://user:pw@example.org/a', 'file:///etc/passwd', 'nonsense']) {
      assert.equal(isSafeRemoteUrl(bad), false, bad);
    }
    assert.equal(isSafeRemoteUrl('https://images.example.org/a.jpg'), true);
  });

  it('refuses a bad id before making any request', async () => {
    await assert.rejects(fetchLicensedImage('http://evil', 'https://x', (async () => { throw new Error('must not fetch'); }) as typeof fetch), /Invalid image id/);
  });

  it('re-checks the license at download time', async () => {
    await assert.rejects(fetchLicensedImage(id, 'https://x', (async () => json(record({ license: 'by-nc' }))) as typeof fetch), /license/);
  });

  it('re-validates redirects, so one cannot reach a private address', async () => {
    const fake = (async (u: string) => (u.includes('/images/') && u.startsWith('https://x') ? json(record()) : new Response(null, { status: 302, headers: { location: 'https://169.254.169.254/secret' } }))) as typeof fetch;
    await assert.rejects(fetchLicensedImage(id, 'https://x', fake), /Blocked/);
  });

  it('rejects files that are not images', async () => {
    const fake = (async (u: string) => (u.startsWith('https://x') ? json(record()) : new Response('<html>', { headers: { 'content-type': 'text/html' } }))) as typeof fetch;
    await assert.rejects(fetchLicensedImage(id, 'https://x', fake), /Unsupported/);
  });
});

describe('bundled art matching', () => {
  it('finds relevant art and never returns nothing', () => {
    assert.ok(matchDemoAssets(['Bali', 'beach'], 3).some((a) => a.id === 'demo-beach-sunset'));
    assert.ok(matchDemoAssets(['career', 'skyline'], 3).some((a) => a.id === 'demo-city-dusk'));
    assert.equal(matchDemoAssets(['zzzz'], 6).length, 6);
  });

  it('honors excluded subjects', () => {
    assert.ok(!matchDemoAssets(['beach'], 20, 'beach').some((a) => a.id === 'demo-beach-sunset'));
  });

  it('every bundled image has dimensions and a same-origin path', () => {
    for (const a of DEMO_ASSETS) {
      assert.ok(a.src.startsWith('/demo/') && a.width > 0 && a.height > 0, a.id);
    }
  });
});

describe('rate limiting', () => {
  it('stops at the limit and resets after the window', () => {
    const key = `t${Math.random()}`;
    assert.equal(rateLimit(key, 2, 1000, 1), true);
    assert.equal(rateLimit(key, 2, 1000, 2), true);
    assert.equal(rateLimit(key, 2, 1000, 3), false);
    assert.equal(rateLimit(key, 2, 1000, 2000), true);
  });
});
