import { ProviderError } from './errors';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { JSON_SCHEMA, type AnalyzeRequest } from './schema';

export interface OllamaOptions {
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Free and open-source route: your own machine runs Qwen3-VL through Ollama, so photos never leave it. */
export async function callOllama(input: AnalyzeRequest, options: OllamaOptions): Promise<{ raw: unknown; model: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const send = async (think: boolean) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 180_000);
    try {
      return await fetchImpl(`${options.baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: options.model,
          stream: false,
          ...(think ? {} : { think: false }),
          format: JSON_SCHEMA,
          options: { temperature: 0.5, num_predict: 1200 },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(input), images: input.images.map((i) => i.data) },
          ],
        }),
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'AbortError';
      throw new ProviderError(timedOut ? 'timeout' : 'network', timedOut ? 'Ollama took too long to answer.' : 'Could not reach Ollama. Is it running?');
    } finally {
      clearTimeout(timer);
    }
  };

  let response = await send(false);
  // Models without a thinking mode reject `think: false`.
  if (response.status === 400) response = await send(true);
  if (response.status === 404) throw new ProviderError('model_unavailable', `Ollama does not have ${options.model}. Run: ollama pull ${options.model}`);
  if (!response.ok) throw new ProviderError('upstream', `Ollama returned an error (${response.status}).`);
  const data = (await response.json()) as { message?: { content?: string } };
  try {
    return { raw: JSON.parse(data.message?.content ?? ''), model: options.model };
  } catch {
    throw new ProviderError('invalid', 'The local model returned something that was not valid JSON.');
  }
}
