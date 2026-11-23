// mo.core/v1 drift logic against fake code listings. node:test only, no network, no other repository.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../validate.mjs';
import { compareSurface, declaredNames, docsTableNames, expectedBySurface } from '../drift.mjs';

const catalog = loadCatalog();
const expected = expectedBySurface(catalog);

describe('expectedBySurface', () => {
  test('lists canonical names served as they are and aliases per surface', () => {
    const mot = expected.get('mot');
    assert.deepEqual(mot.get('mAYL_list'), { tool: 'mAYL_list', via: 'canonical' });
    assert.deepEqual(mot.get('line_attach'), { tool: 'mot_attach', via: 'alias' });
    assert.equal(mot.has('mot_attach'), false, 'no gateway serves the canonical name yet');
    assert.equal(mot.has('memory_search'), false, 'memory_search belongs to another surface');
    assert.deepEqual(expected.get('3t3r').get('memory_search'), { tool: 'mom_search', via: 'alias' });
    assert.deepEqual(expected.get('desktop-rag').get('rag.query'), { tool: 'mom_local_query', via: 'alias' });
  });

  test('every surface of the catalog has an entry, even an empty one', () => {
    for (const s of catalog.surfaces) assert.ok(expected.has(s.id), s.id);
  });
});

describe('compareSurface', () => {
  const mot = expected.get('mot');
  const motNames = () => new Set(mot.keys());

  test('no findings when the code declares everything the catalog expects', () => {
    assert.deepEqual(compareSurface({ surface: 'mot', expected: mot, present: motNames(), authoritative: motNames() }), []);
  });

  test('extra declarations in code are fine when the list is not authoritative', () => {
    const present = motNames().add('something_else');
    assert.deepEqual(compareSurface({ surface: 'mot', expected: mot, present }), []);
  });

  test('sabotage: a name the catalog expects disappears from code', () => {
    const present = motNames();
    present.delete('line_attach');
    const f = compareSurface({ surface: 'mot', expected: mot, present });
    assert.deepEqual(f, [{ kind: 'absent-in-code', surface: 'mot', name: 'line_attach', tool: 'mot_attach', via: 'alias' }]);
  });

  test('sabotage: the authoritative list grows a tool the catalog does not know', () => {
    const authoritative = motNames().add('line_brand_new');
    const f = compareSurface({ surface: 'mot', expected: mot, present: authoritative, authoritative });
    assert.deepEqual(f, [{ kind: 'absent-in-contract', surface: 'mot', name: 'line_brand_new' }]);
  });

  test('sabotage: a name is in the catalog for the wrong surface', () => {
    // mosadd does not serve line_attach in the catalog, so an authoritative mosadd list that has it is a gap.
    const present = new Set([...expected.get('mosadd').keys(), 'line_attach']);
    const f = compareSurface({ surface: 'mosadd', expected: expected.get('mosadd'), present, authoritative: present });
    assert.deepEqual(f.map((x) => x.name), ['line_attach']);
  });
});

describe('readers', () => {
  test('declaredNames finds tool definitions and ignores prose and nested keys', () => {
    const src = [
      'const a = {',
      '  name: "alpha_one",',
      "    name: 'beta.two',",
      '};',
      'const text = "name: not_a_tool";',
      'foo({ name: "inline_not_at_line_start" });',
    ].join('\n');
    assert.deepEqual([...declaredNames(src)].sort(), ['alpha_one', 'beta.two']);
  });

  test('docsTableNames reads tool rows and skips the family table', () => {
    const md = [
      '| Family | Prefix | Tools |',
      '| [Tunnel](#line) | `line_` | 12 |',
      '| Tool | What it does | Required parameters |',
      '| `line_attach` | Plug this session in. | none |',
      '| `line_handover` | Append an entry. | `text` |',
      '| `line_skip` | Mark as handled. | `message_id`, `reason` |',
    ].join('\r\n');
    assert.deepEqual([...docsTableNames(md)], ['line_attach', 'line_handover', 'line_skip']);
  });
});
