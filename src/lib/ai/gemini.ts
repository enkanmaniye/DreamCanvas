import { GEMINI_RESPONSE_SCHEMA, type AnalyzeRequest } from './schema';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { ProviderError } from './errors';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiOptions {
  apiKey: string;
  models: string[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** One request per board: images and text go in together, and one JSON object comes back. */
export async function callGemini(input: AnalyzeRequest, options: GeminiOptions): Promise<{ raw: unknown; model: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: buildUserPrompt(input) }, ...input.images.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.data } }))] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1200, responseMimeType: 'application/json', responseSchema: GEMINI_RESPONSE_SCHEMA },
  });

  let lastModel = options.models[0];
  for (const model of options.models) {
    lastModel = model;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
    let response: Response;
    try {
      response = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': options.apiKey },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new ProviderError(timedOut ? 'timeout' : 'network', timedOut ? 'Gemini took too long to answer.' : 'Could not reach Gemini.');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 404) continue;
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new ProviderError('auth', 'Gemini rejected the API key or request. Check GEMINI_API_KEY.');
    }
    if (response.status === 429) throw new ProviderError('rate_limited', 'Gemini’s usage limit was reached. Try again in a minute.');
    if (!response.ok) throw new ProviderError('upstream', `Gemini returned an error (${response.status}).`);

    const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new ProviderError('invalid', 'Gemini returned an empty answer. This can happen when a safety filter blocks a photo.');
    try {
      return { raw: JSON.parse(text), model };
    } catch {
      throw new ProviderError('invalid', 'Gemini returned something that was not valid JSON.');
    }
  }
  throw new ProviderError('model_unavailable', `None of the configured Gemini models are available to this key (last tried ${lastModel}). Update GEMINI_MODEL.`);
}
