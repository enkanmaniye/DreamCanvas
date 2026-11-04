import { z } from 'zod';

const SceneSchema = z.object({
  version: z.number().int(),
  width: z.number().int().min(100).max(4000),
  height: z.number().int().min(100).max(4000),
  background: z.object({ kind: z.enum(['solid', 'mesh', 'tiles']), base: z.string().max(20), colors: z.array(z.string().max(20)).max(8), seed: z.number() }),
  objects: z.array(z.object({ id: z.string().max(40), type: z.enum(['image', 'text', 'sticker', 'shape']) }).passthrough()).max(200),
  meta: z.object({ title: z.string().max(120) }).passthrough(),
});

const AssetSchema = z.object({
  id: z.string().max(80),
  kind: z.enum(['upload', 'demo', 'openverse', 'generated']),
  src: z.string().max(400),
  name: z.string().max(200),
  width: z.number(),
  height: z.number(),
  focus: z.object({ x: z.number(), y: z.number() }),
  credit: z.object({ title: z.string(), creator: z.string(), license: z.string(), licenseUrl: z.string(), sourceUrl: z.string() }).optional(),
});

export const BoardWriteSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  scene: SceneSchema,
  assets: z.array(AssetSchema).max(60),
  theme: z.record(z.unknown()).nullable().default(null),
  thumbnail: z.string().startsWith('data:image/').max(400_000).nullable().default(null),
});

export const BoardPatchSchema = BoardWriteSchema.partial();
export type BoardWrite = z.infer<typeof BoardWriteSchema>;
