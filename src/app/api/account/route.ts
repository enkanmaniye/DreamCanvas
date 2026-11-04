import { STORAGE_BUCKET } from '@/lib/config';
import { json, problem } from '@/lib/server/http';
import { requireUser, serviceClient } from '@/lib/supabase/server';

/** Permanently removes the signed-in person's photos, boards and account. */
export async function DELETE(request: Request) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const admin = await serviceClient();
  if (!admin) return problem(503, 'Account deletion needs SUPABASE_SERVICE_ROLE_KEY on the server. Your boards were not changed.', 'service_key_missing');

  const bucket = admin.storage.from(STORAGE_BUCKET);
  const root = context.user.id;
  const { data: folders } = await bucket.list(root);
  for (const folder of folders ?? []) {
    const prefix = `${root}/${folder.name}`;
    const { data: files } = await bucket.list(prefix, { limit: 1000 });
    if (files?.length) await bucket.remove(files.map((f: { name: string }) => `${prefix}/${f.name}`));
  }
  // Row deletes cascade from the auth user: profiles, boards, board_assets, generations.
  const { error } = await admin.auth.admin.deleteUser(context.user.id);
  if (error) return problem(502, 'Your account couldn’t be deleted. Try again.');
  return json({ deleted: true });
}
