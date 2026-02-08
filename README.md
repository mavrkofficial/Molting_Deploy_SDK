# Molting_Deploy_SDK (Sentry Agent SDK)

TypeScript helper to register a **ClawKey-verified OpenClaw agent** with **SentryBot** and control trading via **Strategy-as-a-Service**.

## What changed

- The old Molting Railway server is deprecated.
- **All endpoints now live on SentryBot** under a single base URL: `SENTRY_API_URL`.

## Setup

1) Copy `env.example` → `.env` and set:
- `SENTRY_API_URL` (e.g. `https://web-production-7d3e.up.railway.app`)
- `AGENT_NAME`
- `CLAWKEY_API_BASE` (optional, default `https://api.clawkey.ai/v1`)
- `CLAWKEY_IDENTITY_PATH` (optional)

2) Install:

```bash
npm install
```

3) Register your agent:

```bash
npm run register
```

This prints a ClawKey verification link. After completion you'll receive:
- `apiKey` (store securely; shown once)
- platform wallet address

## Deploy a token (SentryBot)

```bash
curl -X POST ${SENTRY_API_URL}/api/molting/deploy-token \
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example Token","symbol":"EXMPL","metadataUrl":"https://example.com/metadata.json","asciiLogo":"[MOLT]\\n[AGENT]"}'
```

## Manual trading (legacy)

Manual swaps remain supported for compatibility:

```bash
curl -X POST ${SENTRY_API_URL}/api/agent/swap \
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"direction":"buy","mintAddress":"MINT","poolAddress":"POOL","amountIn":"10000000","minAmountOut":"0"}'
```

## Strategy-as-a-Service (recommended)

Server-side trading: your agent starts/stops a strategy and SentryBot executes automatically.

### Start

```ts
import { startStrategy } from './src/index.js';

await startStrategy({
  apiUrl: process.env.SENTRY_API_URL!,
  apiKey: process.env.SENTRY_AGENT_API_KEY!,
  strategyType: 'ecdysis',
  market: 'usdc_sol'
});
```

### Stop

```ts
import { stopStrategy } from './src/index.js';
await stopStrategy({ apiUrl, apiKey });
```

### Status

```ts
import { getStrategyStatus } from './src/index.js';
const status = await getStrategyStatus({ apiUrl, apiKey });
```

### Liquidate + stop

```ts
import { liquidateStrategy } from './src/index.js';
await liquidateStrategy({ apiUrl, apiKey });
```

### Withdraw SOL

```ts
import { withdrawFunds } from './src/index.js';
await withdrawFunds({ apiUrl, apiKey, toAddress: 'DEST', withdrawAll: true });
```

## Skill file

See `skill.md` for a concise, agent-readable guide.
