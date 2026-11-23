// Compare packages/mo-core/catalog.json with the tool names the other repositories serve today.
// Read-only: only `git show` and `git grep` on a ref (default origin/main). No checkout is touched, no fetch, no network.
// Not part of `pnpm test`, because it needs sibling checkouts. Run it with: pnpm check:mo-core
//
//   node scripts/check-mo-core-drift.mjs [--root <dir>] [--ref <ref> | --ref <repo>=<ref>]... [--json] [--no-fail]
//
// Findings:
//   absent-in-code      the catalog says a surface serves a name, the code at the ref does not declare it
//   absent-in-contract  a list that is known to be complete (MOT docs table, mosADD measured snapshot) has a name
//                       the catalog does not map for that surface
// Exit code: 0 no drift, 1 drift, 2 a required repository could not be read.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCatalog, validateCatalog, countCatalog } from '../packages/mo-core/validate.mjs';
import { compareSurface, declaredNames, docsTableNames, expectedBySurface } from '../packages/mo-core/drift.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// Sibling checkouts, by folder name under --root.
const REPOS = {
  mot: 'mot',
  mosadd: 'mosADD',
  'mosadd-os': 'mosADD-OS',
  '3t3r': '3T3R',
};

// Where each surface declares its tool names. `complete` is a list known to be the full served list.
const SURFACES = {
  mot: {
    required: true,
    repo: 'mot',
    declared: ['apps/gateway/src'],
    ignore: [{ re: /^mosADD$/, why: 'a brand-name object in the gateway source, not a tool' }],
    // The docs table is pinned to the live tools/list by a MOT test (W9); flagged tools are not in it.
    complete: { kind: 'docs-table', repo: 'mot', path: 'apps/www/docs/content/mcp/tools.md' },
  },
  mosadd: {
    required: true,
    repo: 'mosadd-os',
    declared: ['packages/mcp/src/tools'],
    ignore: [{ re: /^m(CALL|ROOM)_/, why: 'source kept but not registered (package README: mCALL carrier-pending, mROOM folded into mIRC)' }],
    // Snapshot of the live tools/list, dated inside the file; it can be older than the code.
    complete: { kind: 'json-names', repo: 'mosadd-os', path: 'distribution/hub-tools.json' },
  },
  '3t3r': { repo: '3t3r', declared: ['supabase/functions/cymru-mcp', 'supabase/functions/hermes-gateway'] },
  webmcp: { repo: 'mosadd', declared: ['apps/web/src/lib/webmcp.ts'] },
  'desktop-rag': { repo: 'mosadd', declared: ['apps/desktop/mcp/ragMcpServer.cjs'] },
  'desktop-agent': { repo: 'mosadd-os', declared: ['packages/agent/src/local-tools.ts'] },
  truthgate: { repo: 'mosadd', declared: ['services/voice-truthgate-mcp/index.mjs'] },
};

function parseArgs(argv) {
  const o = { root: resolve(HERE, '..', '..'), refs: {}, defaultRef: 'origin/main', json: false, noFail: false, catalog: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = resolve(argv[++i]);
    else if (a === '--catalog') o.catalog = resolve(argv[++i]);
    else if (a === '--ref') {
      const v = argv[++i] ?? '';
      const eq = v.indexOf('=');
      if (eq > 0) o.refs[v.slice(0, eq)] = v.slice(eq + 1);
      else o.defaultRef = v;
    } else if (a === '--json') o.json = true;
    else if (a === '--no-fail') o.noFail = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return o;
}

const HELP = `check-mo-core-drift: compare the mo.core/v1 catalog with the code of the sibling repositories (read-only).

  node scripts/check-mo-core-drift.mjs [--root <dir>] [--ref <ref>] [--ref <repo>=<ref>] [--json] [--no-fail]

  --root <dir>      folder with the checkouts (default: the parent of this repository)
  --ref <ref>       git ref read in every repository (default origin/main)
  --ref <repo>=<ref> override for one repository: ${Object.keys(REPOS).join(', ')}
  --catalog <file>  check another catalog file (to prove the check goes red on a broken copy)
  --json            machine-readable output
  --no-fail         always exit 0 (default: 1 on drift, 2 when a required repository cannot be read)
`;

function git(dir, args) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}

function openRepo(o, key) {
  const dir = join(o.root, REPOS[key]);
  const ref = o.refs[key] ?? o.defaultRef;
  if (!existsSync(dir)) return { key, dir, ref, error: `no checkout at ${dir}` };
  const head = git(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
  if (head.status !== 0) return { key, dir, ref, error: `ref ${ref} not found in ${dir}` };
  return { key, dir, ref, sha: head.stdout.trim().slice(0, 9) };
}

const show = (repo, path) => {
  const r = git(repo.dir, ['show', `${repo.ref}:${path}`]);
  if (r.status !== 0) throw new Error(`cannot read ${repo.key}:${path} at ${repo.ref}`);
  return r.stdout;
};

function grepDeclared(repo, paths) {
  const pattern = '^[[:space:]]*name:[[:space:]]*["\'][A-Za-z0-9_.-]+["\']';
  const r = git(repo.dir, ['grep', '-h', '-I', '--no-color', '-E', pattern, repo.ref, '--', ...paths, ':!**/__tests__/**', ':!**/*.test.*']);
  if (r.status === 1) return new Set(); // no match
  if (r.status !== 0) throw new Error(`git grep failed in ${repo.key}: ${r.stderr.trim()}`);
  return declaredNames(r.stdout);
}

function readComplete(repos, spec) {
  const repo = repos[spec.repo];
  const text = show(repo, spec.path);
  if (spec.kind === 'docs-table') return { names: docsTableNames(text), note: 'docs table' };
  const j = JSON.parse(text);
  return { names: new Set(j.names), note: `snapshot ${j.measured_at ?? '?'} server ${j.server_version ?? '?'}` };
}

function run(o) {
  const catalog = o.catalog ? loadCatalog(pathToFileURL(o.catalog)) : loadCatalog();
  const own = validateCatalog(catalog);
  if (own.length) throw new Error(`the catalog itself is not conformant (run pnpm test):\n${own.join('\n')}`);
  const expected = expectedBySurface(catalog);

  const repos = Object.fromEntries(Object.keys(REPOS).map((k) => [k, openRepo(o, k)]));
  const result = { counts: countCatalog(catalog), repos: {}, surfaces: {}, findings: [], unchecked: [], unreadableRequired: [] };
  for (const r of Object.values(repos)) result.repos[r.key] = r.error ? { error: r.error } : { dir: r.dir, ref: r.ref, sha: r.sha };

  for (const [id, spec] of Object.entries(SURFACES)) {
    const repo = repos[spec.repo];
    const want = expected.get(id) ?? new Map();
    if (repo.error) {
      (spec.required ? result.unreadableRequired : result.unchecked).push({ surface: id, reason: repo.error });
      continue;
    }
    try {
      const present = grepDeclared(repo, spec.declared);
      let complete = null;
      let completeNote = null;
      if (spec.complete) {
        const c = readComplete(repos, spec.complete);
        complete = c.names;
        completeNote = c.note;
        for (const n of complete) present.add(n);
      }
      const findings = compareSurface({ surface: id, expected: want, present, authoritative: complete });
      // Info only: declared in code, mapped nowhere for this surface. May be internal, hidden or not a tool at all.
      const rest = [...present].filter((n) => !want.has(n)).sort();
      const ignored = rest.filter((n) => spec.ignore?.some((i) => i.re.test(n)));
      const unmapped = rest.filter((n) => !ignored.includes(n));
      const ignoredWhy = (spec.ignore ?? []).filter((i) => ignored.some((n) => i.re.test(n))).map((i) => i.why);
      result.surfaces[id] = {
        repo: spec.repo,
        expected: want.size,
        declared: present.size,
        complete: complete ? complete.size : null,
        completeNote,
        findings: findings.length,
        unmapped,
        ignored: ignored.length,
        ignoredWhy,
      };
      result.findings.push(...findings);
    } catch (e) {
      (spec.required ? result.unreadableRequired : result.unchecked).push({ surface: id, reason: e.message });
    }
  }
  return result;
}

function text(r) {
  const L = [];
  L.push(`mo.core/v1 drift check: ${r.counts.tools} tools, ${r.counts.aliases} aliases in packages/mo-core/catalog.json`);
  L.push('read-only: git show / git grep on a ref, no checkout touched');
  L.push('');
  L.push('SOURCES');
  for (const [k, v] of Object.entries(r.repos)) L.push(`  ${k.padEnd(10)} ${v.error ? 'UNREADABLE: ' + v.error : `${v.ref} @ ${v.sha}  (${v.dir})`}`);
  L.push('');
  L.push('SURFACES');
  for (const [id, s] of Object.entries(r.surfaces)) {
    const full = s.complete === null ? 'no complete list' : `complete list ${s.complete} names (${s.completeNote})`;
    L.push(`  ${id.padEnd(14)} catalog expects ${String(s.expected).padStart(3)}, code declares ${String(s.declared).padStart(3)}, ${full}, drift ${s.findings}`);
    if (s.ignored) L.push(`  ${''.padEnd(14)} ${s.ignored} declarations set aside: ${s.ignoredWhy.join('; ')}`);
  }
  for (const u of r.unchecked) L.push(`  ${u.surface.padEnd(14)} NOT CHECKED: ${u.reason}`);
  for (const u of r.unreadableRequired) L.push(`  ${u.surface.padEnd(14)} REQUIRED BUT UNREADABLE: ${u.reason}`);
  L.push('');
  if (r.findings.length === 0) L.push('DRIFT: none');
  else {
    L.push(`DRIFT: ${r.findings.length}`);
    for (const f of r.findings) {
      if (f.kind === 'absent-in-code') L.push(`  [absent-in-code]     ${f.surface}: "${f.name}" (${f.via === 'alias' ? 'alias of' : 'canonical'} ${f.tool}) is not declared in the code`);
      else L.push(`  [absent-in-contract] ${f.surface}: "${f.name}" is served but the catalog does not map it`);
    }
  }
  const info = Object.entries(r.surfaces).filter(([, s]) => s.unmapped.length);
  if (info.length) {
    L.push('');
    L.push('DECLARED IN CODE BUT NOT MAPPED BY THE CATALOG (info, not drift: may be internal, hidden or not a tool)');
    for (const [id, s] of info) L.push(`  ${id.padEnd(14)} ${s.unmapped.length}: ${s.unmapped.join(', ')}`);
  }
  return L.join('\n');
}

try {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    process.stdout.write(HELP);
    process.exit(0);
  }
  const r = run(o);
  process.stdout.write((o.json ? JSON.stringify(r, null, 2) : text(r)) + '\n');
  if (o.noFail) process.exit(0);
  process.exit(r.unreadableRequired.length ? 2 : r.findings.length ? 1 : 0);
} catch (e) {
  process.stderr.write(`check-mo-core-drift: ${e.message}\n`);
  process.exit(2);
}
