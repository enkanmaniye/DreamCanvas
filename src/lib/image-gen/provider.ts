export interface ImageGenerationResult {
  bytes: Uint8Array;
  contentType: string;
  provider: string;
}

/** Adapter boundary for optional image generation. The app works fully without one. */
export interface ImageGenerationProvider {
  readonly name: string;
  generate(prompt: string): Promise<ImageGenerationResult>;
}

type Env = Record<string, string | undefined>;

/**
 * FLUX.1 Schnell through an endpoint you run or rent. Text is added by the editor afterwards,
 * so this prompt asks for no lettering. The endpoint takes `{ prompt, width, height }` and returns image bytes.
 */
class FluxSchnellProvider implements ImageGenerationProvider {
  readonly name = 'flux.1-schnell';

  constructor(private readonly url: string, private readonly key: string | undefined, private readonly fetchImpl: typeof fetch) {}

  async generate(prompt: string): Promise<ImageGenerationResult> {
    const response = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.key ? { authorization: `Bearer ${this.key}` } : {}) },
      body: JSON.stringify({ prompt: `${prompt}. Photographic, no text, no lettering, no watermark.`, width: 1344, height: 768 }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`Image endpoint answered ${response.status}`);
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0];
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new Error('Image endpoint did not return an image');
    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType, provider: this.name };
  }
}

export function imageGenerationEnabled(env: Env): boolean {
  return env.ENABLE_AI_IMAGE_GENERATION === 'true' && Boolean(env.IMAGE_GENERATION_API_URL);
}

export function getImageProvider(env: Env, fetchImpl: typeof fetch = fetch): ImageGenerationProvider | null {
  if (!imageGenerationEnabled(env)) return null;
  return new FluxSchnellProvider(env.IMAGE_GENERATION_API_URL as string, env.IMAGE_GENERATION_API_KEY, fetchImpl);
}
