import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import { problem } from '../server/http';

export interface AuthedContext {
  user: Pick<User, 'id' | 'email'>;
  db: SupabaseClient;
}

type AuthResolver = (token: string) => Promise<AuthedContext | null>;

/** Test seam: integration tests swap in an in-memory database that mimics row ownership. */
let resolver: AuthResolver | null = null;
export function setAuthResolverForTests(next: AuthResolver | null): void {
  resolver = next;
}

async function defaultResolver(token: string): Promise<AuthedContext | null> {
  const { createClient } = await import('@supabase/supabase-js');
  // The person's token goes on every query, so Postgres Row Level Security applies to them, not to a superuser.
  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, db };
}

/** Returns the signed-in person's context, or the error Response to send back. */
export async function requireUser(request: Request): Promise<AuthedContext | Response> {
  if (!resolver && !isSupabaseConfigured) return problem(503, 'Accounts aren’t set up on this copy of DreamCanvas yet.', 'supabase_unconfigured');
  const header = request.headers.get('authorization') ?? '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return problem(401, 'Log in to do this.', 'unauthenticated');
  const context = await (resolver ?? defaultResolver)(token);
  return context ?? problem(401, 'Your session has ended. Log in again.', 'unauthenticated');
}

export async function serviceClient(): Promise<SupabaseClient | null> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
