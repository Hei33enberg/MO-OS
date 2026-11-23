# mo-core

The `mo.core/v1` contract: one list of tool names for the whole frame, one name per action, and the aliases that keep today's names working. Data and checks only. Private, not published.

| File | What |
|---|---|
| `catalog.json` | the list: canonical name, module, status, one-sentence summary, aliases per surface |
| `validate.mjs` | `validateCatalog()`, `resolveName()`, `buildIndex()`: pure, no I/O except `loadCatalog()` |
| `drift.mjs` | pure comparison of the catalog with tool names read from code |
| `test/` | `node:test`, no network: conformance rules and one sabotage case per rule |

```bash
pnpm test                 # from the repository root: includes this package
pnpm check:mo-core        # compares the catalog with the sibling repositories (read-only, needs checkouts)
```

Rules: [docs/mo-core-naming.md](../../docs/mo-core-naming.md).

This package names legacy tool surfaces of other products on purpose: an alias is only useful if it says where the old name lives. That is why it is not public text and must not be published or copied into the public docs.
