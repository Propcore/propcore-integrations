import { readFileSync } from 'node:fs';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const doc = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));
const Ajv2020 = Ajv2020Module as unknown as typeof Ajv2020Module.default;
const ajv = new Ajv2020({ strict: false, allErrors: true });
const addFormats = addFormatsModule as unknown as typeof addFormatsModule.default;
addFormats(ajv);
ajv.addSchema({ $id: 'openapi', components: doc.components });

// fixture name -> the OpenAPI path whose 200 response it must satisfy
const FIXTURE_ROUTES: Record<string, string> = {
  projects: '/ai/projects',
  project: '/ai/projects/{id}',
  stacking: '/ai/projects/{id}/stacking',
  units: '/ai/units',
  unit: '/ai/units/{id}',
  listings: '/ai/listings',
  promotions: '/ai/promotions',
  'view-results': '/ai/views/{view_key}/results',
};

type Schema = Record<string, unknown>;

function deref(schema: Schema): Schema {
  const ref = schema.$ref;
  if (typeof ref !== 'string') return schema;
  return deref(doc.components.schemas[ref.replace('#/components/schemas/', '')] as Schema);
}

// The fragment is generated from zod intersections: each allOf member carries
// additionalProperties:false, which no object can satisfy across members. Read the
// intersection the way zod does: members lose their own closure, the whole object
// is closed once with unevaluatedProperties:false.
function intersect(schema: Schema): Schema {
  const target = deref(schema);
  if (!Array.isArray(target.allOf)) return schema;
  const members = (target.allOf as Schema[]).map((m) => {
    const { additionalProperties: _closed, ...open } = deref(m);
    return open;
  });
  return { allOf: members, unevaluatedProperties: false };
}

function responseSchema(path: string): object {
  const op = doc.paths[path]?.get;
  const schema = op?.responses?.['200']?.content?.['application/json']?.schema;
  if (!schema) throw new Error(`no 200 JSON schema for GET ${path}`);
  return intersect(schema);
}

function rewriteRefs(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([k, v]) =>
        k === '$ref' && typeof v === 'string'
          ? [k, v.replace('#/components', 'openapi#/components')]
          : [k, rewriteRefs(v)],
      ),
    );
  }
  return node;
}

describe('fixtures match the headless OpenAPI fragment', () => {
  for (const [name, path] of Object.entries(FIXTURE_ROUTES)) {
    it(`${name}.json satisfies GET ${path}`, () => {
      const data = JSON.parse(
        readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'),
      );
      const validate = ajv.compile(rewriteRefs(responseSchema(path)) as object);
      const ok = validate(data);
      expect(ok, JSON.stringify(validate.errors, null, 2)).toBe(true);
    });
  }

  it('manifest.json has the fields the client reads', () => {
    const m = JSON.parse(
      readFileSync(new URL('./fixtures/manifest.json', import.meta.url), 'utf8'),
    );
    expect(m).toMatchObject({
      schema_version: 1,
      name: expect.any(String),
      base_url: expect.any(String),
    });
    expect(Array.isArray(m.views)).toBe(true);
  });
});
