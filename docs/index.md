# mo-os docs

Client docs for [mo-os](../README.md): the tools, the key, the limits, the words.

**mo-os** is the system of mo, your main agent: one set of MCP tools with one identity (a tunnel), one memory (MOM) and one set of instructions (SHELL), in any model and any host. **mot3r** is the mother: the panel at [mot3r.com](https://mot3r.com/panel/) that holds your tunnels.

The gate is `https://mcp.mot3r.com/mcp`. The live tool list wins over any count here: `GET https://api.mot3r.com/v1/tools` (109 tools on 2026-11-23, no key).

Start: [mot3r.com/panel](https://mot3r.com/panel/) → key → `npx mot3r@0.3.4 install` → `line_attach`. The site at [mot3r.com/mo-os](https://mot3r.com/mo-os/) is [index.html](./index.html).

| Page | What |
|---|---|
| [quickstart.md](./quickstart.md) | key, wire a host, `line_attach` |
| [words.md](./words.md) | mo, mo-os, mot3r, tunnel, cable, and the words that are not those |
| [architecture.md](./architecture.md) | path of one call; what is in this repo |
| [tools.md](./tools.md) | how to call; the live list wins over any count printed here |
| [authentication.md](./authentication.md) | key kinds and headers |
| [limits.md](./limits.md) | caps and error codes |
| [realm.md](./realm.md) | contributor ladder |
| [faq.md](./faq.md) | short answers |

Hosted product docs: [mot3r.com/docs](https://mot3r.com/docs/).

### Versions (not the pitch)

| Surface | Version |
|---|---|
| Live gate and panel | **0.3.9** — `mot3r.com/panel/wersja.json`, 2026-11-23; **109** tools on `GET /v1/tools` the same day |
| npm client in this repo | **mot3r 0.3.4** — wires hosts; does not install the gate |
