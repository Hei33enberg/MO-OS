// mo.core/v1: load the tool catalog, check it, resolve names. No dependencies, no network, no I/O except loadCatalog().
import { readFileSync } from 'node:fs';

export const CONTRACT = 'mo.core/v1';

// Canonical name: <prefix>_<word>[_<word>...]. The prefix may keep capitals (brand prefixes such as mDM);
// every word after it is lowercase. This is a subset of the MCP tool-name rule ^[a-zA-Z0-9_-]{1,64}$.
export const CANONICAL_RE = /^[A-Za-z][A-Za-z0-9]*(?:_[a-z0-9]+)+$/;
export const MCP_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;
// Legacy names may be anything a surface ever listed, including dots (for example rag.query).
export const ALIAS_RE = /^[A-Za-z0-9_.-]{1,64}$/;

export const SUMMARY_MAX = 200;
const TOOL_KEYS = new Set(['name', 'module', 'status', 'summary', 'note', 'as_is', 'aliases']);
const ALIAS_KEYS = new Set(['name', 'surfaces', 'note']);
// Text meant to be read by outsiders must not name the other products.
const BRAND_RE = /mosadd|3t3r|m0s/i;

export function loadCatalog(url = new URL('./catalog.json', import.meta.url)) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const prefixOf = (name) => name.slice(0, name.indexOf('_'));

/** All problems of a catalog, as strings that start with a rule code (C1...). Empty array = conformant. */
export function validateCatalog(c) {
  const p = [];
  const bad = (code, msg) => p.push(`${code}: ${msg}`);

  // C1 header
  if (!isObj(c)) return ['C1: catalog is not an object'];
  if (c.contract !== CONTRACT) bad('C1', `contract must be ${CONTRACT}, got ${JSON.stringify(c.contract)}`);
  for (const k of ['modules', 'surfaces']) if (!Array.isArray(c[k]) || c[k].length === 0) bad('C1', `${k} must be a non-empty array`);
  for (const k of ['statuses', 'prefixes']) if (!isObj(c[k]) || Object.keys(c[k]).length === 0) bad('C1', `${k} must be a non-empty object`);
  if (!Array.isArray(c.tools) || c.tools.length === 0) {
    bad('C1', 'tools must be a non-empty array');
    return p;
  }
  if (p.length) return p;

  // C2 registries: ids unique and well formed
  const moduleIds = new Set();
  for (const m of c.modules) {
    if (!isObj(m) || typeof m.id !== 'string' || !/^[a-z0-9-]+$/.test(m.id)) bad('C2', `module id invalid: ${JSON.stringify(m)}`);
    else if (moduleIds.has(m.id)) bad('C2', `duplicate module id: ${m.id}`);
    else moduleIds.add(m.id);
  }
  const surfaceIds = new Set();
  for (const s of c.surfaces) {
    if (!isObj(s) || typeof s.id !== 'string' || !/^[a-z0-9-]+$/.test(s.id)) bad('C2', `surface id invalid: ${JSON.stringify(s)}`);
    else if (surfaceIds.has(s.id)) bad('C2', `duplicate surface id: ${s.id}`);
    else surfaceIds.add(s.id);
  }

  // Index first: aliases and canonical names are checked against each other.
  const canonical = new Map(); // lower-case name -> tool
  for (const t of c.tools) if (isObj(t) && typeof t.name === 'string') canonical.set(t.name.toLowerCase(), t);
  const aliasOwner = new Map(); // alias -> tool name
  const usedPrefixes = new Set();

  for (const t of c.tools) {
    if (!isObj(t) || typeof t.name !== 'string') {
      bad('N1', `tool without a name: ${JSON.stringify(t)}`);
      continue;
    }
    const n = t.name;

    // N1..N4 canonical name
    if (!CANONICAL_RE.test(n) || !MCP_NAME_RE.test(n)) bad('N1', `canonical name has the wrong shape: ${n}`);
    else {
      const pre = prefixOf(n);
      usedPrefixes.add(pre);
      if (!Object.hasOwn(c.prefixes, pre)) bad('N3', `${n}: prefix "${pre}" is not registered in prefixes`);
    }
    if (canonical.get(n.toLowerCase()) !== t) bad('N2', `duplicate canonical name (case-insensitive): ${n}`);

    // T1..T5 fields
    for (const k of Object.keys(t)) if (!TOOL_KEYS.has(k)) bad('T5', `${n}: unknown field "${k}"`);
    if (!moduleIds.has(t.module)) bad('T1', `${n}: module "${t.module}" is not in the module list`);
    if (!Object.hasOwn(c.statuses, t.status)) bad('T2', `${n}: status "${t.status}" is not in statuses`);
    const s = t.summary;
    if (typeof s !== 'string' || s.trim() === '') bad('T3', `${n}: summary is missing`);
    else {
      if (s.length > SUMMARY_MAX) bad('T3', `${n}: summary is longer than ${SUMMARY_MAX} characters`);
      if (!/[.!?]$/.test(s)) bad('T3', `${n}: summary must end with a full stop`);
      if (/[.!?]\s+[A-Z]/.test(s) || /\n/.test(s)) bad('T3', `${n}: summary must be one sentence`);
      if (/[^\x20-\x7e]/.test(s)) bad('T4', `${n}: summary must be plain ASCII English`);
      if (BRAND_RE.test(s)) bad('T4', `${n}: summary names another product`);
    }
    if (t.note !== undefined && (typeof t.note !== 'string' || /[^\x20-\x7e]/.test(t.note))) bad('T4', `${n}: note must be plain ASCII text`);

    // S1/S2 surfaces
    const known = new Set();
    if (t.as_is !== undefined) {
      if (!Array.isArray(t.as_is) || t.as_is.length === 0) bad('S1', `${n}: as_is must be a non-empty array when present`);
      else
        for (const sf of t.as_is) {
          if (!surfaceIds.has(sf)) bad('S1', `${n}: as_is names unknown surface "${sf}"`);
          if (known.has(sf)) bad('S1', `${n}: as_is repeats surface "${sf}"`);
          known.add(sf);
        }
    }

    // A1..A5 aliases
    if (t.aliases !== undefined && (!Array.isArray(t.aliases) || t.aliases.length === 0)) bad('A1', `${n}: aliases must be a non-empty array when present`);
    for (const a of Array.isArray(t.aliases) ? t.aliases : []) {
      if (!isObj(a) || typeof a.name !== 'string' || !ALIAS_RE.test(a.name)) {
        bad('A1', `${n}: alias has the wrong shape: ${JSON.stringify(a)}`);
        continue;
      }
      for (const k of Object.keys(a)) if (!ALIAS_KEYS.has(k)) bad('A1', `${n}: alias ${a.name} has unknown field "${k}"`);
      if (a.name === n) bad('A2', `${n}: alias repeats its own canonical name`);
      if (aliasOwner.has(a.name)) bad('A3', `alias "${a.name}" appears under both ${aliasOwner.get(a.name)} and ${n}`);
      else aliasOwner.set(a.name, n);
      const other = canonical.get(a.name.toLowerCase());
      if (other && other !== t) bad('A4', `alias "${a.name}" of ${n} is the canonical name of ${other.name}`);
      if (!Array.isArray(a.surfaces) || a.surfaces.length === 0) bad('A5', `${n}: alias ${a.name} must list the surfaces that serve it`);
      else {
        const seen = new Set();
        for (const sf of a.surfaces) {
          if (!surfaceIds.has(sf)) bad('A5', `${n}: alias ${a.name} names unknown surface "${sf}"`);
          if (seen.has(sf)) bad('A5', `${n}: alias ${a.name} repeats surface "${sf}"`);
          seen.add(sf);
          known.add(sf);
        }
      }
      if (a.note !== undefined && (typeof a.note !== 'string' || /[^\x20-\x7e]/.test(a.note))) bad('T4', `${n}: alias ${a.name} note must be plain ASCII text`);
    }

    if (known.size === 0) bad('S2', `${n}: no surface serves this tool today (no as_is, no alias)`);
  }

  // N4 a registered prefix nobody uses is registry drift
  for (const pre of Object.keys(c.prefixes)) if (!usedPrefixes.has(pre)) bad('N4', `prefix "${pre}" is registered but no tool uses it`);

  // T3 a summary must not point at a legacy name: it would go stale on the first rename
  if (aliasOwner.size) {
    const re = new RegExp(`(?<![A-Za-z0-9_.])(?:${[...aliasOwner.keys()].map(esc).join('|')})(?![A-Za-z0-9_])`);
    for (const t of c.tools) {
      const m = typeof t?.summary === 'string' ? re.exec(t.summary) : null;
      if (m) bad('T3', `${t.name}: summary mentions legacy name "${m[0]}"; use ${aliasOwner.get(m[0])}`);
    }
  }
  return p;
}

/**
 * Name tables of a catalog:
 *   byName: canonical name or alias -> { tool, via: 'canonical' | 'alias' }
 * Use it to accept an old name and answer with the canonical tool (aliases keep working in tools/call).
 */
export function buildIndex(c) {
  const byName = new Map();
  for (const t of c.tools) {
    byName.set(t.name, { tool: t, via: 'canonical' });
    for (const a of t.aliases ?? []) byName.set(a.name, { tool: t, via: 'alias' });
  }
  return { byName };
}

export function resolveName(c, name) {
  return buildIndex(c).byName.get(name) ?? null;
}

export function countCatalog(c) {
  return {
    tools: c.tools.length,
    aliases: c.tools.reduce((n, t) => n + (t.aliases?.length ?? 0), 0),
    unchanged: c.tools.filter((t) => t.as_is?.length).length,
  };
}
