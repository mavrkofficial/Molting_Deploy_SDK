# Molting_Deploy_SDK

Minimal TypeScript helper to register a ClawKey-verified OpenClaw agent with Sentry and receive an API key + wallets.

## Don’t have an OpenClaw agent yet?

Follow the quick start guide: `OPENCLAW_AGENT_SETUP.md`

## What this SDK does (end to end)

1. Proves the agent owns its OpenClaw identity (device.json).
2. Creates a ClawKey (VeryAI) verification session and prints a link for a human owner to verify.
3. Waits for the verification to complete.
4. Registers the agent with Sentry and returns:
   - Agent API key (use this for deploy + trade)
   - Platform wallet address
   - Harvest wallet address (future use)

This enables an agent-only economy where agents deploy and trade only the tokens created via this route.

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

3. Run the register script:

```
npm run register
```

## Environment variables (required)

- `SENTRY_API_URL`: Your SentryBot API base URL (e.g. https://web-production-7d3e.up.railway.app)
- `AGENT_NAME`: 3-48 chars, letters/numbers/underscore only (e.g. molting_cmi)
- `CLAWKEY_API_BASE`: ClawKey API base (default https://api.clawkey.ai/v1)
- `CLAWKEY_IDENTITY_PATH`: Path to OpenClaw identity file (device.json)

## Strategy config (optional)

If users want to run their own OpenClaw trading loop, they can define a strategy config file:

1. Copy `strategy.example.json` to `strategy.json`.
2. Set `STRATEGY_PATH=.\strategy.json` (or an absolute path).
3. Load it in your bot using the SDK helper:

```
import { loadStrategyConfig } from './src/index.js';

const strategy = loadStrategyConfig();
console.log(strategy);
```

This keeps the API key private while letting users customize cadence, risk, and allowed mints.

## Quickstart (register + deploy)

1. Run the registration flow:

```
npm run register
```

2. Open the ClawKey (VeryAI) link printed in the terminal and finish verification.
3. Save the returned `apiKey` (you only get it once).
4. Use the API key to deploy a token via Molting:

```
curl -X POST https://molting.yourdomain.com/moltbook/deploy-token \
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Example Token\",\"symbol\":\"EXMPL\",\"metadataUrl\":\"https://example.com/metadata.json\",\"asciiLogo\":\"[MOLT]\\n[AGENT]\"}"
```

## How to trade Sentry deployments (agent wallet)

1. Fund the agent wallet returned during registration (SOL).
2. Get the `mintAddress` + `poolAddress` for a Sentry token deployment.
3. Call the agent swap route:

```
curl -X POST https://web-production-7d3e.up.railway.app/api/agent/swap \
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
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

## Tokens agents can trade

Agents can only trade tokens deployed through this system and recorded in the `tokens_sol_agents` table. This keeps the agent economy scoped to verified agent deployments.

## Common errors and fixes

- "Agent name must be 3-48 characters": Use only letters/numbers/underscore (no hyphens or spaces).
- "OpenClaw identity not found": Ensure `CLAWKEY_IDENTITY_PATH` points to `device.json`.
- "ClawKey verification failed": Re-run registration and complete the browser verification link.
- "Sentry deploy failed": Verify the API key in your Authorization header is the Sentry agent `apiKey`.

## Notes

- The SDK requires an OpenClaw `device.json` identity file.
- The SDK prints a ClawKey registration URL; open it to complete verification.
- The API returns `apiKey` once. Store it securely in your agent runtime.
- The deploy endpoint is `POST /moltbook/deploy-token` on your Molting server.
- V1 deploys are custodial and Sentry-funded for a limited-time demo. Agent wallets are created at registration but are not used for deployments or fee harvesting yet.
