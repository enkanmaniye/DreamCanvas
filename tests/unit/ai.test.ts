import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyze, resolveAiStatus } from '../../src/lib/ai/provider';
import { cleanQuote, filterQuotes } from '../../src/lib/ai/quotes';
import { interpretWithRules } from '../../src/lib/ai/rules';
import { AnalyzeRequestSchema, InterpretationSchema, normalizeInterpretation } from '../../src/lib/ai/schema';

const req = (over = {}) => AnalyzeRequestSchema.parse({ text: 'I want to spend a peaceful summer in Bali and the Maldives', ...over });
const base = interpretWithRules(req());
const valid = {
  boardTitle: 'Golden Summer Escape', themeCandidates: [{ name: 'tropical travel', confidence: 0.92 }], themeSummary: 'Warm travel scenes', mood: ['sunlit'],
  palette: ['#FF72B5', '#FFE36F', '#BEA4FF'], searchQueries: ['Bali sunset'], stickerTags: ['sunburst'],
  quotes: ['Make space for the days you dream about in full colour.', 'Your next chapter can feel like sunshine on the water.', 'A little closer to your own horizon every single week.'],
  recommendedLayout: 'editorial-grid', clarificationQuestion: null,
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const geminiOk = (obj: unknown) => json({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });

describe('AI JSON validation', () => {
  it('accepts the PRD example shape', () => {
    assert.equal(normalizeInterpretation(valid, base).boardTitle, 'Golden Summer Escape');
  });

  it('repairs a hallucinated layout, bad colors and clamps confidence', () => {
    const out = normalizeInterpretation({ ...valid, recommendedLayout: 'hyper-grid', palette: ['red', '#12', '#FF72B5'], themeCandidates: [{ name: 'x', confidence: 7 }] }, base);
    assert.equal(out.recommendedLayout, base.recommendedLayout);
    assert.deepEqual(out.palette, base.palette);
    assert.equal(out.themeCandidates[0].confidence, 1);
  });

  it('falls back fully on garbage and never throws', () => {
    for (const garbage of [null, 42, 'text', [], { boardTitle: 5 }]) {
      const out = normalizeInterpretation(garbage, base);
      assert.ok(InterpretationSchema.safeParse(out).success);
      assert.equal(out.boardTitle, base.boardTitle);
    }
  });

  it('caps oversize fields', () => {
    const out = normalizeInterpretation({ ...valid, boardTitle: 'x'.repeat(500), mood: Array(20).fill('calm') }, base);
    assert.equal(out.boardTitle.length, 60);
    assert.equal(out.mood.length, 6);
  });
});

describe('quote filtering', () => {
  it('strips made-up attribution and wrapping quotes', () => {
    assert.equal(cleanQuote('"Keep your eyes on the far shore." — Maya Stone'), 'Keep your eyes on the far shore.');
  });

  it('drops famous lines, lyric fragments, too-long text and duplicates', () => {
    assert.deepEqual(filterQuotes(['Be the change you wish to see', 'Stay hungry, stay foolish', 'Somewhere over the rainbow way up high']), []);
    assert.equal(filterQuotes(['word '.repeat(30)]).length, 0);
    assert.equal(filterQuotes(['Make room for the good days.', 'make room for the good days.']).length, 1);
  });

  it('keeps non-English quotes', () => {
    assert.equal(filterQuotes(['Haz espacio para los días que sueñas.', '夢に見た日々のために場所を空けよう']).length, 2);
  });
});

describe('local rules are not AI and stay honest', () => {
  it('reads a travel dream and finds the places', () => {
    const r = interpretWithRules(req());
    assert.equal(r.themeCandidates[0].name, 'Travel and escape');
    assert.ok(r.searchQueries.includes('Bali'));
    assert.ok(r.searchQueries.includes('Maldives'));
  });

  it('does not repeat a keyword in different cases', () => {
    const r = interpretWithRules(req());
    assert.equal(new Set(r.searchQueries.map((q) => q.toLowerCase())).size, r.searchQueries.length);
  });

  it('asks instead of guessing when themes conflict', () => {
    const r = interpretWithRules(req({ text: 'A promotion at work and a beach holiday' }));
    assert.ok(r.themeCandidates.length >= 2);
    assert.ok(r.clarificationQuestion);
  });

  it('gives a usable general board for unmatched text', () => {
    const r = interpretWithRules(req({ text: 'zzz qqq' }));
    assert.equal(r.themeCandidates[0].name, 'Personal vision');
    assert.equal(r.quotes.length, 3);
  });

  it('uses colors from photos when given and respects excluded words', () => {
    const r = interpretWithRules(req({ photoColors: ['#111111', '#222222', '#333333'], exclude: 'Bali' }));
    assert.equal(r.palette[0], '#111111');
    assert.ok(!r.searchQueries.includes('Bali'));
  });
});

describe('provider selection and failure handling', () => {
  it('defaults to rules with no keys, so no fake AI runs', async () => {
    const out = await analyze(req(), {}, () => { throw new Error('must not call'); });
    assert.equal(out.provider, 'rules');
    assert.equal(out.notice, null);
  });

  it('flags free-tier data use unless paid tier is declared', () => {
    assert.equal(resolveAiStatus({ GEMINI_API_KEY: 'k' }).freeTierDataUse, true);
    assert.equal(resolveAiStatus({ GEMINI_API_KEY: 'k', GEMINI_PAID_TIER: 'true' }).freeTierDataUse, false);
    assert.equal(resolveAiStatus({ GEMINI_API_KEY: 'k', AI_PROVIDER: 'none' }).provider, 'rules');
  });

  it('sends the model the key, JSON schema and images in one request', async () => {
    let url = ''; let init: RequestInit = {};
    const out = await analyze(req({ consent: true, images: [{ mimeType: 'image/jpeg', data: 'AAAA' }] }), { GEMINI_API_KEY: 'secret' }, (async (u: string, i: RequestInit) => { url = u; init = i; return geminiOk(valid); }) as typeof fetch);
    assert.equal(out.provider, 'gemini');
    assert.equal(out.model, 'gemini-3.1-flash-lite');
    assert.ok(url.endsWith('/models/gemini-3.1-flash-lite:generateContent'));
    assert.ok(!url.includes('secret'), 'key must be in a header, not the URL');
    assert.equal((init.headers as Record<string, string>)['x-goog-api-key'], 'secret');
    const body = JSON.parse(init.body as string);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.contents[0].parts[1].inlineData.data, 'AAAA');
  });

  it('never sends photos to a third party without consent', async () => {
    let body = '';
    await analyze(req({ consent: false, images: [{ mimeType: 'image/jpeg', data: 'SECRETPIXELS' }] }), { GEMINI_API_KEY: 'k' }, (async (_: string, i: RequestInit) => { body = i.body as string; return geminiOk(valid); }) as typeof fetch);
    assert.ok(!body.includes('SECRETPIXELS'));
  });

  it('moves to the next model when one is retired', async () => {
    const seen: string[] = [];
    const out = await analyze(req(), { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'old-model', GEMINI_FALLBACK_MODELS: 'new-model' }, (async (u: string) => {
      seen.push(u);
      return u.includes('old-model') ? json({}, 404) : geminiOk(valid);
    }) as typeof fetch);
    assert.equal(seen.length, 2);
    assert.equal(out.model, 'new-model');
  });

  for (const [name, status, expected] of [['rate limit', 429, /limit/], ['bad key', 403, /API key/], ['server error', 500, /error/]] as const) {
    it(`degrades to labeled rules on ${name}`, async () => {
      const out = await analyze(req(), { GEMINI_API_KEY: 'k' }, (async () => json({}, status)) as typeof fetch);
      assert.equal(out.provider, 'rules');
      assert.match(out.notice ?? '', expected);
      assert.match(out.notice ?? '', /keyword rules/);
    });
  }

  it('degrades on malformed model JSON and on network failure', async () => {
    const bad = await analyze(req(), { GEMINI_API_KEY: 'k' }, (async () => json({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] })) as typeof fetch);
    assert.equal(bad.provider, 'rules');
    const down = await analyze(req(), { GEMINI_API_KEY: 'k' }, (async () => { throw new TypeError('fetch failed'); }) as typeof fetch);
    assert.match(down.notice ?? '', /Could not reach/);
  });

  it('calls Ollama with the schema, thinking off and base64 images', async () => {
    let url = ''; let body: Record<string, unknown> = {};
    const out = await analyze(req({ images: [{ mimeType: 'image/jpeg', data: 'BBBB' }] }), { AI_PROVIDER: 'ollama' }, (async (u: string, i: RequestInit) => {
      url = u; body = JSON.parse(i.body as string);
      return json({ message: { content: JSON.stringify(valid) } });
    }) as typeof fetch);
    assert.equal(out.provider, 'ollama');
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(body.model, 'qwen3-vl:4b');
    assert.equal(body.think, false);
    assert.ok(body.format);
    assert.deepEqual((body.messages as { images?: string[] }[])[1].images, ['BBBB']);
  });

  it('tells the person how to fix a missing Ollama model', async () => {
    const out = await analyze(req(), { AI_PROVIDER: 'ollama' }, (async () => json({}, 404)) as typeof fetch);
    assert.match(out.notice ?? '', /ollama pull qwen3-vl:4b/);
  });
});
