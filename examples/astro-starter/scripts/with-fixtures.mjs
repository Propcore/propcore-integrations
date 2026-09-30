// Runs a command with the fixture server up and the starter's env pointed at it.
import { spawn } from 'node:child_process';
import { startFixtureServer } from './fixture-server.mjs';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: with-fixtures.mjs <command…>');
  process.exit(2);
}
const port = 4877;
const server = await startFixtureServer(port);
const code = await new Promise((resolve) => {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: { ...process.env, PROPCORE_SITE: `http://127.0.0.1:${port}`, PROPCORE_KEY: 'pcs_fixture' },
  });
  child.on('error', (e) => {
    console.error(e);
    resolve(1);
  });
  child.on('exit', (c, sig) => resolve(c ?? (sig ? 1 : 0)));
});
server.close();
process.exit(code);
