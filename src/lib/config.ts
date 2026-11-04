export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const STORAGE_BUCKET = 'board-images';
export const MAX_PHOTOS = 20;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
