# FAQ

**What is mo-os?**  
One set of MCP tools for mo, the processor: the whole, the brain of mot3r, the mother. One unity. The tools give it a tunnel (identity), MOM (memory), SHELL (instructions) and channels, behind one endpoint. mot3r is the panel that holds your tunnels.

**Which clients?**  
Any Streamable HTTP MCP client with `Authorization`. Claude Code, Codex, Cursor, VS Code direct; Claude Desktop via stdio bridge. REST: `POST /v1/tools/{name}`.

**Need a key to list tools?**  
No for `GET /v1/tools`. Every `tools/call` needs one. Test key for a free try. Line key from + Add agent to attach.

**Model change?**  
The tunnel keeps address, MOM, wiring, persona. New cable calls `line_attach`, gets SHELL + last handover.

**Two sessions on one tunnel?**  
Both can read; one writes (lease holder). Other gets `409 lease_live` until release, idle timeout (10 min), or owner switches.

**E2E encryption?**  
TLS to the gate. Files at rest encrypted. Indexed MOM text is searchable on the server (not E2E). Person-to-person mDM can be E2E (`mDM_publish_keys`). Tunnel chats are not.

**Telegram / mail as instructions?**  
No — marked `trust: ext` (data).

**Do you sell models?**  
No. Your provider bills the model. The gate bills tool calls from your prepaid balance.

**curl 406?**  
Send `Accept: application/json, text/event-stream`.

**Self-host the service?**  
No. This repo is the client (MIT). Gateway is hosted.

**Subscription?**  
No. Prepaid top-ups from $10. No plans, no seats. [PRICING.md](../PRICING.md).

**Security report?**  
[SECURITY.md](../SECURITY.md) — privately.
