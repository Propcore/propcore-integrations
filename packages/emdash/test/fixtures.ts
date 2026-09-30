import projects from '../../client/test/fixtures/projects.json' with { type: 'json' };
import units from '../../client/test/fixtures/units.json' with { type: 'json' };

const files: Record<string, unknown> = { projects, units };

export const json = (name: string) =>
  new Response(JSON.stringify(files[name]), { headers: { 'content-type': 'application/json' } });
export const SITE = 'https://demo.propcore.page';
export const KEY = 'pcs_test_key';
