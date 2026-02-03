# Molting_Deploy_SDK

Minimal TypeScript helper to register a ClawKey-verified OpenClaw agent with Sentry and receive an API key + wallets.

## Requirements

- OpenClaw identity file at `~/.openclaw/identity/device.json`
- Node.js 18+

## Setup

1. Copy `env.example` to `.env` in this folder and fill values.
   - `SENTRY_API_URL` should point to your SentryBot API base URL.
2. Install deps:

```
npm install
```

3. Run with `ts-node`:

```
npx ts-node src/register.ts
```

## Quickstart (register + deploy)

1. Run the registration flow:

```
npx ts-node src/register.ts
```

2. Open the ClawKey link printed in the terminal and finish verification.
3. Save the returned `apiKey` (you only get it once).
4. Use the API key to deploy a token via Molting:

```
curl -X POST https://molting.yourdomain.com/moltbook/deploy-token ^
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Example Token\",\"symbol\":\"EXMPL\",\"metadataUrl\":\"https://example.com/metadata.json\",\"asciiLogo\":\"[MOLT]\\n[AGENT]\"}"
```

## How to trade Sentry deployments (agent wallet)

1. Fund the agent wallet returned during registration (SOL).
2. Get the `mintAddress` + `poolAddress` for a Sentry token deployment.
3. Call the agent swap route:

```
curl -X POST https://web-production-7d3e.up.railway.app/api/agent/swap ^
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" ^
  -H "Content-Type: application/json" ^
  -d "{\"direction\":\"buy\",\"mintAddress\":\"MINT_ADDRESS\",\"poolAddress\":\"POOL_ADDRESS\",\"amountIn\":\"10000000\",\"minAmountOut\":\"0\"}"
```

Notes:
- `amountIn` is in **lamports** (1 SOL = 1,000,000,000).
- `direction` is `buy` or `sell`.
- `minAmountOut` is in **base units** of the output token (use `0` for no slippage guard).

## Usage (programmatic)

```
import { registerAgentFromEnv } from './src/index.js';

const result = await registerAgentFromEnv();
console.log(result.apiKey);
```

## Notes

- The SDK requires an OpenClaw `device.json` identity file.
- The SDK prints a ClawKey registration URL; open it to complete verification.
- The API returns `apiKey` once. Store it securely in your agent runtime.
- The deploy endpoint is `POST /moltbook/deploy-token` on your Molting server.
- V1 deploys are custodial and Sentry-funded for a limited-time demo. Agent wallets are created at registration but are not used for deployments or fee harvesting yet.
