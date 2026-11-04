export interface User { id: string; email?: string; email_confirmed_at?: string; user_metadata?: Record<string, unknown> }
interface Result<T> { data: T; error: { message: string } | null }
/* eslint-disable */
export interface SupabaseClient {
  auth: any;
  from(table: string): any;
  storage: { from(bucket: string): any };
}
export function createClient(url: string, key: string, options?: unknown): SupabaseClient;
export type { Result };
