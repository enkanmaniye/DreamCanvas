import { ProviderError } from './errors';
import { callGemini } from './gemini';
import { callOllama } from './ollama';
import { interpretWithRules } from './rules';
import { normalizeInterpretation, type AnalyzeRequest, type Interpretation } from './schema';

export type ProviderName = 'gemini' | 'ollama' | 'rules';

export interface AiStatus {
  provider: ProviderName;
  model: string | null;
  /** True when photos leave this computer and need the person's consent first. */
  sendsPhotosToThirdParty: boolean;
  /** True on Gemini's free tier, where Google may use submitted content to improve its products. */
  freeTierDataUse: boolean;
}

type Env = Record<string, string | undefined>;

export function resolveAiStatus(env: Env): AiStatus {
  const choice = (env.AI_PROVIDER ?? '').trim().toLowerCase();
  if (choice === 'none') return { provider: 'rules', model: null, sendsPhotosToThirdParty: false, freeTierDataUse: false };
  if (choice === 'ollama') return { provider: 'ollama', model: env.OLLAMA_MODEL || 'qwen3-vl:4b', sendsPhotosToThirdParty: false, freeTierDataUse: false };
  if (env.GEMINI_API_KEY) {
    return { provider: 'gemini', model: env.GEMINI_MODEL || 'gemini-3.1-flash-lite', sendsPhotosToThirdParty: true, freeTierDataUse: env.GEMINI_PAID_TIER !== 'true' };
  }
  return { provider: 'rules', model: null, sendsPhotosToThirdParty: false, freeTierDataUse: false };
}

export interface AnalyzeResult {
  interpretation: Interpretation;
  provider: ProviderName;
  model: string | null;
  /** Set when AI was expected but the board fell back to the rules. Shown to the person. */
  notice: string | null;
}

export async function analyze(input: AnalyzeRequest, env: Env, fetchImpl?: typeof fetch): Promise<AnalyzeResult> {
  const status = resolveAiStatus(env);
  const fallback = interpretWithRules(input);
  if (status.provider === 'rules') return { interpretation: fallback, provider: 'rules', model: null, notice: null };

  // Without consent no photo pixels are sent, whatever the browser posted.
  const request = status.sendsPhotosToThirdParty && !input.consent ? { ...input, images: [] } : input;
  try {
    const { raw, model } = status.provider === 'gemini'
      ? await callGemini(request, {
          apiKey: env.GEMINI_API_KEY as string,
          models: [status.model as string, ...(env.GEMINI_FALLBACK_MODELS ?? '').split(',').map((m) => m.trim()).filter(Boolean)],
          fetchImpl,
        })
      : await callOllama(request, { baseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434', model: status.model as string, fetchImpl });
    return { interpretation: normalizeInterpretation(raw, fallback), provider: status.provider, model, notice: null };
  } catch (error) {
    const message = error instanceof ProviderError ? error.message : 'The AI service failed.';
    if (!(error instanceof ProviderError)) console.error('AI provider failed', error instanceof Error ? error.name : 'unknown');
    return { interpretation: fallback, provider: 'rules', model: null, notice: `${message} These suggestions come from simple keyword rules instead.` };
  }
}
