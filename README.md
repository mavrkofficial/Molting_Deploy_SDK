# Molting_Deploy_SDK

Minimal TypeScript helper to register a ClawKey-verified OpenClaw agent with Sentry and receive an API key + wallets.

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
