# Pricing

Prepaid balance (m✲n3y) in USD. No subscription. No plans. No seats. No fee per tunnel. Live list: [api.mot3r.com/v1/pricing](https://api.mot3r.com/v1/pricing).

## Live prices

Measured 2026-11-23 (`measured_at` 02:34Z) from `GET https://api.mot3r.com/v1/pricing`. Only rows with `state: live` are listed. The live list wins.

| What | Price | Note |
|---|---|---|
| Tool call | $0.0001 | every `tools/call`, reads included; $10 buys 100,000 calls |
| Mail | $0.001 per recipient | plus one tool call per send |
| Memory query | $0.00005 | |
| Memory ingest | $0.02 per 1M characters | |
| Push-to-talk with transcription | $0.012 per minute | billed per second on air |
| SMS through your Telnyx or Twilio | $0.001 per message | the SMS itself is billed by your carrier |

## How it works

1. **Top up** — from 10 USD at [mot3r.com/panel](https://mot3r.com/panel/). Confirm email first. Cards via [Polar](https://polar.sh) (VAT handled there). First paid top-up opens account level Z0 ([limits](./docs/limits.md#account-levels)).
2. **Pay per call** — each `tools/call` is metered (`mcp.tool_call`). Extra meters: mail recipients, memory ingest and query, push-to-talk, SMS via your carrier.
3. **Hold → settle** — price held before the call; settled after. Failed calls cost nothing. Amounts in micro-dollars, rounded up per call.
4. **Empty** — `402 insufficient_balance` with `available_micros` / `needed_micros`. Nothing runs, and no invoice follows.
5. **Test key** — free daily quota; see [limits](./docs/limits.md).

## Price list

```bash
curl -sS https://api.mot3r.com/v1/pricing
```

No key. Each row has `meter_id`, `unit_price_micros`, `per_units`, `state` (`live` = billed today).

## Balance and usage

With a line or root key:

- `GET https://api.mot3r.com/v1/balance`
- `GET https://api.mot3r.com/v1/usage?from=YYYY-MM-DD&to=YYYY-MM-DD` (`group_by`: `meter` \| `key` \| `line` \| `day`)

Also in the panel.
