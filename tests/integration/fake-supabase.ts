import type { AuthedContext } from '../../src/lib/supabase/server';

type Row = Record<string, unknown>;

/**
 * In-memory stand-in that copies what Row Level Security does: each client only ever sees its own rows,
 * even when a query forgets to filter. It tests the API's behavior, not the SQL policies themselves.
 * The real policies are covered by rls.live.test.ts.
 */
export class FakeDatabase {
  tables: Record<string, Row[]> = { boards: [], board_assets: [], generations: [] };
  files = new Map<string, { body: Uint8Array; contentType: string }>();
  private counter = 0;

  contextFor(userId: string): AuthedContext {
    return { user: { id: userId, email: `${userId}@example.com` }, db: this.client(userId) as unknown as AuthedContext['db'] };
  }

  private client(userId: string) {
    const db = this;
    const visible = (path: string) => path.startsWith(`${userId}/`);
    return {
      from(table: string) {
        let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
        let values: Row | Row[] | null = null;
        const filters: [string, unknown][] = [];
        const rows = () => db.tables[table].filter((r) => r.user_id === userId && filters.every(([k, v]) => r[k] === v));
        const run = () => {
          if (op === 'insert') {
            const inserted = ([values].flat() as Row[]).map((v) => {
              if (v.user_id !== userId) throw new Error('RLS violation');
              db.counter += 1;
              const stamp = new Date(2026, 0, 1, 0, 0, db.counter).toISOString();
              return { id: `00000000-0000-4000-8000-${String(db.counter).padStart(12, '0')}`, created_at: stamp, updated_at: stamp, thumbnail_path: null, ...v };
            });
            db.tables[table].push(...inserted);
            return inserted;
          }
          if (op === 'update') { const hit = rows(); hit.forEach((r) => Object.assign(r, values)); return hit; }
          if (op === 'delete') { const hit = rows(); db.tables[table] = db.tables[table].filter((r) => !hit.includes(r)); return hit; }
          return rows();
        };
        const builder = {
          select() { return builder; },
          insert(v: Row | Row[]) { op = 'insert'; values = v; return builder; },
          update(v: Row) { op = 'update'; values = v; return builder; },
          delete() { op = 'delete'; return builder; },
          eq(k: string, v: unknown) { filters.push([k, v]); return builder; },
          order() { return builder; },
          async single() { return { data: run()[0], error: null }; },
          async maybeSingle() { return { data: run()[0] ?? null, error: null }; },
          then(resolve: (r: { data: Row[]; error: null }) => void) { resolve({ data: run(), error: null }); },
        };
        return builder;
      },
      storage: {
        from() {
          return {
            async upload(path: string, body: Uint8Array, options: { contentType: string }) {
              if (!visible(path)) return { error: { message: 'denied' } };
              db.files.set(path, { body, contentType: options.contentType });
              return { error: null };
            },
            async download(path: string) {
              const file = visible(path) ? db.files.get(path) : undefined;
              return file ? { data: new Blob([file.body as BlobPart], { type: file.contentType }), error: null } : { data: null, error: { message: 'not found' } };
            },
            async remove(paths: string[]) { paths.filter(visible).forEach((p) => db.files.delete(p)); return { error: null }; },
            async list(prefix: string) { return { data: [...db.files.keys()].filter((k) => k.startsWith(`${prefix}/`) && visible(k)).map((k) => ({ name: k.slice(prefix.length + 1) })) }; },
            async createSignedUrl(path: string) { return { data: { signedUrl: `https://signed.example/${path}` } }; },
          };
        },
      },
    };
  }
}
