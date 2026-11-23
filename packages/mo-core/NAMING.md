# mo.core/v1: names and the tool list

One list of tool names for the whole frame, one name per action. The list is `packages/mo-core/catalog.json`. This page is the short rulebook; the checks are in `packages/mo-core/test/`.

Status: **draft**. No gateway serves the canonical names yet. Every name that exists today is kept as an alias and keeps working.

## Rules

1. **One list.** `catalog.json` is the only list. A gateway builds its `tools/list` from it, or is checked against it. It does not matter which host or brand the client came through: the list is the same.
2. **Shape.** `<prefix>_<action>[_<object>]`. The prefix is the thing the tool acts on. After the prefix everything is lowercase snake_case. At most 64 characters, and always inside the MCP rule `^[a-zA-Z0-9_-]{1,64}$`.
3. **Prefixes are registered.** Every prefix used is described under `prefixes`, and a prefix nobody uses is removed. Brand prefixes keep their capitals because they are public names: `mDM_`, `mIRC_`, `mAYL_`, `mTALK_`, `mURL_`.
4. **Words.** `mot` is a tunnel (the old word is *line*). `mom` is memory (the old word is *mRAG*). Then `vault`, `wallet`, `skill`, `device`, `rider`, `master`. Do not invent a second word for a thing that has one.
5. **One name per action.** Two tools that do the same thing become one canonical name with two aliases. Prefer these verbs: `list` (many), `get` (one), `create`, `update`, `delete`, `search`, `send`, `attach`, `release`. Names that already existed under a brand prefix keep their verb.
6. **Module.** Every tool belongs to one module of the frame: `mots`, `mixer`, `ops`, `shells`, `devices`, `int-comm`, `ext-comm`, `setup`, `amplitun3r`, `vault-ledger`, `mom`, `mo`. The module says where the tool lives in the frame. It is not the same thing as the prefix.
7. **Aliases.** An alias is a name that exists today and still works. Each alias belongs to exactly one tool, never equals a canonical name and lists the surfaces that serve it. A gateway keeps accepting aliases in `tools/call`, and stops listing them in `tools/list` after a transition period. Never delete an alias while any surface still serves it.
8. **Summary.** One English sentence, at most 200 characters, ending with a full stop, plain ASCII. It names no other product and no legacy name, so a rename never makes it stale.
9. **Status.** `live`, `flagged`, `parked`, `internal`, `local` or `page`. The meanings are under `statuses`.

## Add a tool

1. Search the catalog for the action first. If a tool already does it, extend that tool or alias to it.
2. Pick the prefix and the module. A new prefix goes under `prefixes` in the same change, with one line saying what it is.
3. Add the entry inside its module block, in alphabetical order. Set `status`. Fill `as_is` with the surfaces that serve the canonical name unchanged, if any.
4. Run `pnpm test`. The counts in `test/catalog.test.mjs` are frozen on purpose, so a new tool changes a number in review.
5. Optional: `pnpm check:mo-core` compares the catalog with the code of the other repositories.

## Rename a tool

Move the old name into `aliases` with its surfaces and give the entry the new canonical name. The old name must not stay anywhere else as a canonical name or as the alias of another tool. If the summary named the old name, change it.

## Not decided here

The name of the repository and of the npm packages stays as it is. Renaming them is a separate decision.
