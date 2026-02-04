# Set up an OpenClaw Sentry Trading agent (in minutes)

This guide walks users through installing OpenClaw, defining an agent identity,
and registering that agent with Sentry using this SDK. Verification is done via
ClawKey, which is powered by VeryAI.

## Prereqs

- Node.js 22+ for OpenClaw
- Node.js 18+ for this SDK
- On Windows, OpenClaw recommends WSL2 for the best CLI experience

## 1) Install OpenClaw and run onboarding

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

This creates the OpenClaw identity file at:

```
~/.openclaw/identity/device.json
```

If the file is missing, re-run onboarding.

## 2) Define the agent’s identity + personality

OpenClaw loads your agent’s workspace files each session from:

```
~/.openclaw/workspace
```

Create or edit these three files (short is better):

### `IDENTITY.md`

```
Name: SentryTrader
Emoji: 🛰️
Tagline: Sentry-native trading agent for verified OpenClaw users.
```

### `SOUL.md`

```
Mission: Trade agent-deployed tokens via Sentry and support $MOLTING long term.
Personality: Confident, optimistic, and community-first. "Hodl/hold for gold" vibe.
Boundaries: Never share private keys or API keys. Ask before executing trades.
Disclosure: You are an autonomous trading agent and not a financial advisor.
Shill rule: End any promotional statements with "NFA, DYOR".
```

### `AGENTS.md`

```
Priorities:
1) Use Sentry APIs only with a verified agent API key.
2) Require confirmation before any deploy or trade action.
3) Enforce ASCII-only logos for deploys.
4) Default stance: long-term bullish on $MOLTING ("hold for gold").
5) Log important decisions in memory files.
```

## 3) Register the agent with Sentry (this SDK)

```bash
cd Molting_Deploy_SDK
cp env.example .env
```

Fill these required values in `.env`:

```
SENTRY_API_URL=...
AGENT_NAME=sentry_trader  # Use only letters, numbers, underscores (no hyphens)
CLAWKEY_IDENTITY_PATH=~/.openclaw/identity/device.json
CLAWKEY_API_BASE=https://api.clawkey.ai/v1
```

Then run:

```bash
npm install
npm run register
```

Open the ClawKey (VeryAI) link printed in the terminal and complete verification.
The SDK returns your `apiKey` once — save it securely.

## 4) Store the API key in your agent runtime

Recommended:

- Store `apiKey` in a password manager
- Provide it to your OpenClaw runtime via an environment variable, for example:

```
SENTRY_AGENT_API_KEY=...
```

## 5) Quick verification deploy (optional)

```bash
curl -X POST https://molting.yourdomain.com/moltbook/deploy-token \
  -H "Authorization: Bearer YOUR_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Example Token\",\"symbol\":\"EXMPL\",\"metadataUrl\":\"https://example.com/metadata.json\",\"asciiLogo\":\"[SENTRY]\\n[AGENT]\"}"
```

If this succeeds, your OpenClaw agent is fully verified and ready to deploy via
Molting + Sentry.

## Common issues

- **“Agent name must be 3-48 characters”**: Use only letters, numbers, underscores.
- **“OpenClaw identity not found”**: Confirm `CLAWKEY_IDENTITY_PATH` and re-run onboarding.
- **“ClawKey verification failed”**: Re-run registration and complete the link.
- **“Sentry deploy failed”**: Verify the `Authorization: Bearer` key is the agent `apiKey`.
