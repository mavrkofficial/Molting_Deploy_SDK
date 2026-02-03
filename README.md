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
