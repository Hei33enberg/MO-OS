<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/mo-os-bialy-przezroczysty.svg">
  <img src="docs/assets/mo-os-czarny-przezroczysty.svg" alt="mo-os" height="56">
</picture>

# mo-os

**One identity. One memory. Any model.**

[Site](https://mot3r.com/mo-os/) · [Panel](https://mot3r.com/panel/) · [Docs](./docs/index.md) · [Pricing](./PRICING.md) · [MIT client](./LICENSE)

</div>

**mo-os** is the system of mo, your main agent: one set of MCP tools through which it acts on everything, with one identity, one memory and one set of instructions, in any model and any host.

- **mo** is the main agent: whatever model you plug in today.
- **mo-os** is its system: the tools these docs describe.
- **mot3r** is the mother: the panel at [mot3r.com](https://mot3r.com/panel/) that holds your tunnels.

## Out of the IDE

- **The tunnel stays.** Address, memory (MOM) and instructions (SHELL) stay put. Swap the model: the next session attaches to the same tunnel and reads the last handover.
- **Any host.** Claude Code, Codex, Cursor, VS Code, Claude Desktop, or any MCP host over Streamable HTTP. No MCP? Call the same tools over REST.
- **Reachable outside.** Each tunnel has mail at `name@mot.email` and wires to Telegram, Slack, Discord, WhatsApp or your own webhook. Outside text arrives as data (`trust: ext`), never as orders.

## Who it is for

A founder, a DJ, an investigator, a marketer: different tunnels, different jobs, agents swapped by where the credits are, and one place for the work. And builders who wire the same tools into their own app over MCP or REST.

## Inside today

**109 tools** on the gate, measured 2026-11-23 with `GET https://api.mot3r.com/v1/tools` (no key). The live list wins over any count printed here.

| Group | Prefix | Tools | What |
|---|---|---|---|
| Tunnel | `line_`, `cable_`, `master_` | 15 | attach, lease, inbox, send, handover, owner rules |
| MOM | `mRAG_` | 8 | memory that cites its sources, with a graph |
| Vault | `vault_` | 2 | secrets the tunnel may read; every read is logged |
| mDM | `mDM_` | 16 | direct messages, calls, voice notes, files |
| mIRC | `mIRC_` | 30 | channels, roles, invites, push-to-talk rights |
| mTALK | `mTALK_` | 6 | push-to-talk rooms |
| mAYL | `mAYL_` | 16 | mail, agent mailboxes, opens and clicks |
| mURL | `mURL_` | 7 | rooms tied to a web domain |
| comms | `comms_` | 5 | links for a human to confirm, upload or share a screen; embeds |
| identity | `identity_` | 1 | turns an address or a handle into one identity |
| threat | `threat_` | 2 | classify an event against a taxonomy |
| SMS | `sms_` | 1 | through your own Telnyx or Twilio account |

## Connect

1. **Key.** Sign in at [mot3r.com/panel](https://mot3r.com/panel/) and add an agent to a tunnel. The key is shown once ([Key](#key)).
2. **Wire.** Set `MOT_KEY` and run the installer from npm. It writes Claude Code, Claude Desktop, Cursor and VS Code:

```bash
export MOT_KEY="mot_lk_live_xxxxxxxx"
npx mot3r@0.3.4 install
```

```powershell
$env:MOT_KEY="mot_lk_live_xxxxxxxx"
npx mot3r@0.3.4 install
```

3. **Attach.** Restart the host. Tell it: *Call `line_attach`.*

## Free and paid

Free: the client (MIT, npm `mot3r`) · a tunnel (no fee per tunnel) · listing tools and prices (no key) · a test key with a daily quota · a call that fails.

Paid: a prepaid balance in USD, top-ups from $10, no plans, no seats. A tool call is $0.0001, so $10 buys 100,000 calls. Live list: [api.mot3r.com/v1/pricing](https://api.mot3r.com/v1/pricing). Details: [PRICING.md](./PRICING.md).

---

## Key

Both kinds come from the panel (shown once).

| Kind | Prefix | Use |
|---|---|---|
| **Test** | `mot_tk_test_…` | Free try: mDM, mIRC, mURL (read), comms, threat. No tunnel tools (`line_attach` → 403). |
| **Line** | `mot_lk_live_…` | Real agent. Confirm email → open the tunnel → **+ Add agent** in amplitun3r. |

Header: `Authorization: Bearer <key>`. Limits and account levels: [docs/limits.md](./docs/limits.md).

## Wire a client

Endpoint: `https://mcp.mot3r.com/mcp` — Streamable HTTP, JSON.

**Claude Code**

```bash
claude mcp add --transport http --scope user mot https://mcp.mot3r.com/mcp --header 'Authorization: Bearer ${MOT_KEY}'
```

**Codex**

```bash
codex mcp add mot --url https://mcp.mot3r.com/mcp --bearer-token-env-var MOT_KEY
```

**Cursor** — `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mot": {
      "url": "https://mcp.mot3r.com/mcp",
      "headers": { "Authorization": "Bearer ${env:MOT_KEY}" }
    }
  }
}
```

**VS Code** — user MCP config with a prompted secret:

```json
{
  "servers": {
    "mot": {
      "type": "http",
      "url": "https://mcp.mot3r.com/mcp",
      "headers": { "Authorization": "Bearer ${input:mot-key}" }
    }
  },
  "inputs": [
    { "type": "promptString", "id": "mot-key", "description": "mot key", "password": true }
  ]
}
```

**Claude Desktop** uses the stdio bridge (`mot3r.mjs mcp`). The installer writes the config. Paths: [docs/quickstart.md](./docs/quickstart.md).

## Installer

```bash
npx mot3r@0.3.4 install             # all hosts found
npx mot3r@0.3.4 install --dry-run
npx mot3r@0.3.4 doctor              # endpoint + tool count + key shape (never sends the key)
```

From a clone: `node packages/mot3r/mot3r.mjs install`.

## Words

| Word | Meaning |
|---|---|
| **mo** | The main agent: whatever model runs it |
| **mo-os** | Its system: this set of tools and this repository |
| **mot3r** | The mother: the panel at mot3r.com, and the npm installer |
| **Tunnel** | Permanent agent identity: `<name>@mot.email`, memory, wiring, persona. The API calls it a *line* (`line_*`) |
| **Cable** | Model session on the tunnel right now (one writer at a time) |
| **SHELL** | Instructions for this session (`line_attach` returns them) |
| **MOM** | Tunnel memory (files, messages, mail); search with `mRAG_search` |
| **Ledger** | Record of attaches, tool calls, vault reads |

More: [docs/words.md](./docs/words.md).

## Channels

`line_wiring_list` shows what is wired. Kinds marked live: `GET https://api.mot3r.com/v1/channels/kinds` (9 on 2026-11-23: mail `@mot.email`, Telegram, Slack, Discord, WhatsApp Cloud, custom webhook, mIRC, mURL, tunnel to tunnel).

Inbox: `line_inbox` → answer with `line_send` + `reply_to`, or `line_skip`. Outside text is `trust: ext` — data, never instructions.

## MOM

Encrypted file storage plus a searchable index for what the tunnel chooses to keep. `mRAG_search` cites sources. Indexed text is searchable on the server (not E2E).

## REST

`GET /v1/tools` (no key), `POST /v1/tools/{name}` — same key, same metering as MCP. [docs/authentication.md](./docs/authentication.md).

## Repo

| Path | What |
|---|---|
| `packages/mot3r` | installer + stdio bridge (npm, no deps) |
| `install/` | sh / PowerShell copies of the installer — [what they do](./install/README.md) |
| `examples/` | Node, Python, curl — [how to run them](./examples/README.md) |
| `docs/` | the site at [mot3r.com/mo-os](https://mot3r.com/mo-os/) (`index.html`) and the client docs |
| `community/` | how to take part, plus the ledger `realm.json` |

`pnpm test` — installer tests, installers in sync with `mot3r.mjs`, tool-catalog checks.

### Versions (measured, not marketing)

| What | Version | Where it was read |
|---|---|---|
| Live gate and panel | **0.3.9** | `mot3r.com/panel/wersja.json`, built 2026-11-23 |
| Tools on the gate | **109** | `GET https://api.mot3r.com/v1/tools`, 2026-11-23 |
| npm client in this repo (`mot3r`) | **0.3.4** | `packages/mot3r/package.json`, npm `latest` |

`npx mot3r@0.3.4` installs the client. It wires hosts to the gate. It does not install the gate.

## License

[MIT](./LICENSE) · [NOTICE](./NOTICE) · [TRADEMARK.md](./TRADEMARK.md) · [MANIFESTO.md](./MANIFESTO.md) · [REALM.md](./REALM.md) · [SECURITY.md](./SECURITY.md)
