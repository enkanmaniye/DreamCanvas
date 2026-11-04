import type { AiStatus, AnalyzeResult } from './ai/provider';
import { interpretWithRules } from './ai/rules';
import { AnalyzeRequestSchema, type AnalyzeRequest } from './ai/schema';

export type AnalyzeResultPayload = AnalyzeResult;

export interface AppStatus {
  ai: AiStatus;
  accounts: boolean;
  imageGeneration: boolean;
}

const RULES_ONLY: AppStatus = {
  ai: { provider: 'rules', model: null, sendsPhotosToThirdParty: false, freeTierDataUse: false },
  accounts: false,
  imageGeneration: false,
};

let statusPromise: Promise<AppStatus> | null = null;

export function getStatus(): Promise<AppStatus> {
  statusPromise ??= fetch('/api/status').then((r) => (r.ok ? (r.json() as Promise<AppStatus>) : RULES_ONLY)).catch(() => RULES_ONLY);
  return statusPromise;
}

/** Asks the server for suggestions. If the server can't be reached, the same keyword rules run here instead. */
export async function requestAnalysis(input: Partial<AnalyzeRequest>): Promise<AnalyzeResultPayload> {
  const parsed = AnalyzeRequestSchema.parse(input);
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed) });
    if (response.ok) return (await response.json()) as AnalyzeResultPayload;
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return { interpretation: interpretWithRules(parsed), provider: 'rules', model: null, notice: `${body?.error ?? 'The suggestion service failed.'} These suggestions come from simple keyword rules instead.` };
  } catch {
    return { interpretation: interpretWithRules(parsed), provider: 'rules', model: null, notice: 'The suggestion service couldn’t be reached. These suggestions come from simple keyword rules instead.' };
  }
}

export interface LicensedResult {
  id: string;
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  credit: { title: string; creator: string; license: string; licenseUrl: string; sourceUrl: string };
}

export async function searchImages(q: string): Promise<LicensedResult[]> {
  const response = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}`);
  const body = (await response.json().catch(() => null)) as { results?: LicensedResult[]; error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? 'Image search isn’t reachable right now.');
  return body?.results ?? [];
}

export async function requestQuotes(theme: string, summary: string, avoid: string[], offset: number): Promise<{ quotes: string[]; provider: string }> {
  const response = await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ theme, summary, avoid, offset }) });
  if (!response.ok) throw new Error('New quotes aren’t available right now. You can still write your own.');
  return (await response.json()) as { quotes: string[]; provider: string };
}
