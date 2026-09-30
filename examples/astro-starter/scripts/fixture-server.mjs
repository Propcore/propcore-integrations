// A stand-in for https://<site>/ai/… built from the client package's fixtures, for CI builds.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const dir = new URL('../../../packages/client/test/fixtures/', import.meta.url);
const read = (name) => readFileSync(new URL(`${name}.json`, dir), 'utf8');

const routes = [
  [/^\/ai\/manifest\.json$/, 'manifest', false],
  [/^\/ai\/projects$/, 'projects', true],
  [/^\/ai\/projects\/[^/]+$/, 'project', true],
  [/^\/ai\/projects\/[^/]+\/stacking$/, 'stacking', true],
  [/^\/ai\/units$/, 'units', true],
  [/^\/ai\/units\/[^/]+$/, 'unit', true],
  [/^\/ai\/listings$/, 'listings', true],
  [/^\/ai\/promotions$/, 'promotions', true],
  [/^\/ai\/views\/[^/]+\/results$/, 'view-results', true],
];

export function startFixtureServer(port = 4877) {
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const match = routes.find(([re]) => re.test(path));
    if (!match)
      return res.writeHead(404, { 'content-type': 'application/json' }).end('{"code":"not_found"}');
    const [, name, auth] = match;
    if (auth && !/^Bearer pcs_/.test(req.headers.authorization ?? '')) {
      return res
        .writeHead(401, { 'content-type': 'application/json', 'www-authenticate': 'Bearer' })
        .end('{"code":"ai_source_key_invalid","message":"Missing or invalid source key"}');
    }
    res.writeHead(200, { 'content-type': 'application/json' }).end(read(name));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const port = Number(process.argv[2] ?? 4877);
  startFixtureServer(port).then(() =>
    console.log(`fixture server on http://127.0.0.1:${port}/ai/`),
  );
}
