// mo.core/v1 conformance. node:test only, no dependencies, no network.
// The first group runs the rules on the shipped catalog. The second breaks one rule at a time on a copy and
// demands that exactly that rule goes red: a guard that never fails proves nothing.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTRACT, buildIndex, countCatalog, loadCatalog, resolveName, validateCatalog } from '../validate.mjs';

const catalog = loadCatalog();
const clone = () => structuredClone(catalog);
const find = (c, name) => c.tools.find((t) => t.name === name);
const codes = (c) => new Set(validateCatalog(c).map((m) => m.split(':')[0]));

describe('the shipped catalog', () => {
  test('conforms to every rule', () => {
    assert.deepEqual(validateCatalog(catalog), []);
  });

  test('is mo.core/v1', () => {
    assert.equal(catalog.contract, CONTRACT);
  });

  // Frozen on purpose: adding or dropping a tool is a decision, so it must show up in review as a changed number.
  test('counts are frozen', () => {
    assert.deepEqual(countCatalog(catalog), { tools: 142, aliases: 52, unchanged: 92 });
  });

  test('every canonical name and every alias is a different string (one name, one tool)', () => {
    const { byName } = buildIndex(catalog);
    const { tools, aliases } = countCatalog(catalog);
    assert.equal(byName.size, tools + aliases);
  });

  test('an old name resolves to its canonical tool, a canonical name to itself, an unknown name to nothing', () => {
    assert.equal(resolveName(catalog, 'line_attach').tool.name, 'mot_attach');
    assert.equal(resolveName(catalog, 'line_attach').via, 'alias');
    assert.equal(resolveName(catalog, 'mRAG_search').tool.name, 'mom_search');
    assert.equal(resolveName(catalog, 'memory_search').tool.name, 'mom_search');
    assert.equal(resolveName(catalog, 'rag.query').tool.name, 'mom_local_query');
    assert.equal(resolveName(catalog, 'brain_save_note').tool.name, 'mom_note_save');
    assert.equal(resolveName(catalog, 'remember_note').tool.name, 'mom_note_save');
    assert.equal(resolveName(catalog, 'mDM_send').via, 'canonical');
    assert.equal(resolveName(catalog, 'no_such_tool'), null);
  });

  test('every module of the frame list is present and the unbuilt ones are known', () => {
    const used = new Set(catalog.tools.map((t) => t.module));
    const unused = catalog.modules.map((m) => m.id).filter((id) => !used.has(id));
    // setup has no MCP tool yet (REST only) and mo has none (inner agent); anything else unused is a mistake.
    assert.deepEqual(unused.sort(), ['mo', 'setup']);
  });
});

describe('sabotage: each rule goes red when it is broken', () => {
  /** [rule code, what is broken, how] */
  const cases = [
    ['C1', 'wrong contract id', (c) => void (c.contract = 'mo.core/v2')],
    ['C2', 'duplicate module id', (c) => void c.modules.push({ ...c.modules[0] })],
    ['C2', 'duplicate surface id', (c) => void c.surfaces.push({ ...c.surfaces[0] })],
    ['N1', 'canonical name with a dash and capitals', (c) => void (find(c, 'mot_attach').name = 'Mot-Attach')],
    ['N1', 'canonical name with capitals after the prefix', (c) => void (find(c, 'mot_attach').name = 'mot_Attach')],
    ['N2', 'two tools with the same canonical name', (c) => void (c.tools[1].name = c.tools[0].name)],
    ['N2', 'canonical names that differ only in case', (c) => void (find(c, 'mIRC_get').name = 'mirc_list')],
    ['N3', 'prefix that is not registered', (c) => void (find(c, 'mot_attach').name = 'zzz_attach')],
    ['N4', 'registered prefix nobody uses', (c) => void (c.prefixes.zzz = 'unused')],
    ['T1', 'module outside the list', (c) => void (find(c, 'mot_attach').module = 'nowhere')],
    ['T2', 'status outside the list', (c) => void (find(c, 'mot_attach').status = 'maybe')],
    ['T3', 'empty summary', (c) => void (find(c, 'mot_attach').summary = '')],
    ['T3', 'summary without a full stop', (c) => void (find(c, 'mot_attach').summary = 'Plug a session in')],
    ['T3', 'summary of two sentences', (c) => void (find(c, 'mot_attach').summary = 'Plug a session in. Then wait.')],
    ['T3', 'summary longer than the limit', (c) => void (find(c, 'mot_attach').summary = 'Plug ' + 'a '.repeat(150) + 'session in.')],
    ['T3', 'summary that names a legacy name', (c) => void (find(c, 'mot_attach').summary = 'Same as line_send but for attaching.')],
    ['T4', 'summary with a Polish letter', (c) => void (find(c, 'mot_attach').summary = 'Podłącz sesję do tunelu.')],
    ['T4', 'summary that names another product', (c) => void (find(c, 'mot_attach').summary = 'Plug a session into mosADD.')],
    ['T4', 'non-ASCII note', (c) => void (find(c, 'mot_attach').note = 'Uwaga: zażółć.')],
    ['T5', 'unknown field on a tool', (c) => void (find(c, 'mot_attach').alias = 'line_attach')],
    ['S1', 'as_is names an unknown surface', (c) => void (find(c, 'mAYL_list').as_is = ['mosadd', 'nowhere'])],
    ['S2', 'tool that no surface serves', (c) => void delete find(c, 'mAYL_list').as_is],
    ['A1', 'alias without a name', (c) => void find(c, 'mot_attach').aliases.push({ surfaces: ['mot'] })],
    ['A2', 'alias equal to its own canonical name', (c) => void find(c, 'mot_attach').aliases.push({ name: 'mot_attach', surfaces: ['mot'] })],
    ['A3', 'the same alias under two tools', (c) => void find(c, 'mot_release').aliases.push({ name: 'line_attach', surfaces: ['mot'] })],
    ['A3', 'the same alias twice under one tool', (c) => void find(c, 'mot_attach').aliases.push({ name: 'line_attach', surfaces: ['mot'] })],
    ['A4', 'alias equal to the canonical name of another tool', (c) => void find(c, 'mot_attach').aliases.push({ name: 'mot_send', surfaces: ['mot'] })],
    ['A5', 'alias with no surface', (c) => void (find(c, 'mot_attach').aliases[0].surfaces = [])],
    ['A5', 'alias on an unknown surface', (c) => void (find(c, 'mot_attach').aliases[0].surfaces = ['nowhere'])],
  ];

  for (const [code, what, mutate] of cases) {
    test(`${code}: ${what}`, () => {
      const c = clone();
      mutate(c);
      const got = codes(c);
      assert.ok(got.has(code), `rule ${code} stayed green: ${what}; got ${[...got].join(', ') || 'nothing'}`);
    });
  }

  test('the unbroken copy is still green, so the cases above are not red by accident', () => {
    assert.deepEqual(validateCatalog(clone()), []);
  });
});
