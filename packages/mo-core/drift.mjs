// mo.core/v1 drift: compare the catalog with the tool names a surface serves in code. Pure functions, no I/O.
// scripts/check-mo-core-drift.mjs reads the other repositories and feeds these.

/**
 * Names the catalog says each surface serves today.
 * Returns Map<surfaceId, Map<name, { tool, via: 'canonical' | 'alias' }>>.
 */
export function expectedBySurface(c) {
  const out = new Map(c.surfaces.map((s) => [s.id, new Map()]));
  for (const t of c.tools) {
    for (const sf of t.as_is ?? []) out.get(sf)?.set(t.name, { tool: t.name, via: 'canonical' });
    for (const a of t.aliases ?? []) for (const sf of a.surfaces) out.get(sf)?.set(a.name, { tool: t.name, via: 'alias' });
  }
  return out;
}

/**
 * One surface.
 *   expected      Map name -> { tool, via }   from expectedBySurface()
 *   present       Set of names found in the surface's code (declarations); a superset is fine
 *   authoritative Set of names the surface is known to serve in full (a docs table pinned to tools/list, a measured
 *                 snapshot) or null when only declarations are known; only an authoritative list can prove a gap
 *                 in the catalog.
 * Findings:
 *   absent-in-code      the catalog says the surface serves a name, the code does not declare it
 *   absent-in-contract  the authoritative list has a name the catalog does not map for this surface
 */
export function compareSurface({ surface, expected, present, authoritative = null }) {
  const findings = [];
  for (const [name, info] of expected) {
    if (!present.has(name)) findings.push({ kind: 'absent-in-code', surface, name, tool: info.tool, via: info.via });
  }
  if (authoritative) {
    for (const name of authoritative) {
      if (!expected.has(name)) findings.push({ kind: 'absent-in-contract', surface, name });
    }
  }
  return findings;
}

/** Tool names declared in source text: `name: "x"` at the start of a line (object literals of tool definitions). */
export function declaredNames(text) {
  const out = new Set();
  for (const m of text.matchAll(/^[ \t]*name:\s*["']([A-Za-z0-9_.-]+)["']/gm)) out.add(m[1]);
  return out;
}

/** Tool names in the markdown tables of a docs page: | `name` | description | required |. */
export function docsTableNames(md) {
  const out = new Set();
  for (const l of md.replace(/\r\n/g, '\n').split('\n')) {
    const m = /^\| `([A-Za-z0-9_]+)` \| (.+) \| (none|`[a-z0-9_]+`(?:, `[a-z0-9_]+`)*) \|$/.exec(l);
    if (m) out.add(m[1]);
  }
  return out;
}
