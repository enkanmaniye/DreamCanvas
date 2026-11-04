import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';
import * as account from '../../src/app/api/account/route';
import * as analyze from '../../src/app/api/analyze/route';
import * as file from '../../src/app/api/assets/file/route';
import * as proxy from '../../src/app/api/assets/proxy/route';
import * as search from '../../src/app/api/assets/search/route';
import * as upload from '../../src/app/api/assets/upload/route';
import * as boardById from '../../src/app/api/boards/[id]/route';
import * as boards from '../../src/app/api/boards/route';
import * as generate from '../../src/app/api/images/generate/route';
import * as quotes from '../../src/app/api/quotes/route';
import * as status from '../../src/app/api/status/route';

type Handler = (request: Request, context?: never) => Promise<Response> | Response;
type Route = Partial<Record<string, Handler>>;

const ROUTES: [RegExp, unknown][] = [
  [/^\/api\/status$/, status], [/^\/api\/analyze$/, analyze], [/^\/api\/quotes$/, quotes], [/^\/api\/assets\/search$/, search], [/^\/api\/assets\/proxy$/, proxy],
  [/^\/api\/assets\/upload$/, upload], [/^\/api\/assets\/file$/, file], [/^\/api\/boards$/, boards], [/^\/api\/boards\/([^/]+)$/, boardById], [/^\/api\/images\/generate$/, generate], [/^\/api\/account$/, account],
];

const root = join(import.meta.dirname, '..', '..');
const TYPES: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.jpg': 'image/jpeg', '.map': 'application/json' };
const port = Number(process.env.PORT ?? 3100);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
  const route = ROUTES.find(([pattern]) => pattern.test(url.pathname));
  if (route) {
    const handler = (route[1] as Route)[req.method ?? 'GET'];
    if (!handler) { res.writeHead(405).end(); return; }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers(Object.entries(req.headers).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : [])));
    const id = route[0].exec(url.pathname)?.[1];
    const response = await (handler as (r: Request, c: unknown) => Promise<Response>)(new Request(url, { method: req.method, headers, body }), id ? { params: Promise.resolve({ id }) } : undefined);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body as never).pipe(res); else res.end();
    return;
  }
  const asset = url.pathname.startsWith('/_dist/') ? join(root, 'tools/offline-preview/dist', url.pathname.slice(7)) : join(root, 'public', normalize(url.pathname));
  if (url.pathname !== '/' && existsSync(asset) && statSync(asset).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[extname(asset)] ?? 'application/octet-stream' });
    createReadStream(asset).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  createReadStream(join(root, 'tools/offline-preview/dist/index.html')).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`harness on http://127.0.0.1:${port}`));
