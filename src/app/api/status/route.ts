import { resolveAiStatus } from '@/lib/ai/provider';
import { isSupabaseConfigured } from '@/lib/config';
import { imageGenerationEnabled } from '@/lib/image-gen/provider';
import { json } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

/** What this copy of the app can do. Reports capabilities only, never secret values. */
export async function GET() {
  return json({
    ai: resolveAiStatus(process.env),
    accounts: isSupabaseConfigured,
    imageGeneration: imageGenerationEnabled(process.env),
  });
}
