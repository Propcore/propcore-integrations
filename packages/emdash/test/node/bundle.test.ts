import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('bundle', () => {
  it('builds and validates under the registry limits', () => {
    execFileSync('pnpm', ['exec', 'emdash-plugin', 'build'], { stdio: 'pipe' });
    execFileSync('pnpm', ['exec', 'emdash-plugin', 'bundle', '--validate-only'], { stdio: 'pipe' });
    expect(statSync('dist/plugin.mjs').size).toBeLessThan(128 * 1024);
  });
});
