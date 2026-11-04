export function createClient(): never {
  throw new Error('Supabase is not available in the offline harness.');
}
