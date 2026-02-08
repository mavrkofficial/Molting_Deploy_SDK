import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

dotenv.config();

// -------------------------
// Registration (ClawKey)
// -------------------------

export type AgentRegistrationResponse = {
    success: boolean;
    agent: {
        id: number;
        agent_name: string;
        moltbook_handle: string | null;
    };
    apiKey: string;
    wallet: {
        walletAddress: string;
        harvestWalletAddress: string | null;
        agentId: number | null;
        agentName: string | null;
        moltbookHandle: string | null;
        createdAt: string | null;
        created: boolean;
    };
};

export type AgentRegistrationOptions = {
    apiUrl: string;
    agentName: string;
    clawkeyApiBase?: string;
    identityPath?: string;
    pollTimeoutMs?: number;
};

type ClawkeyChallenge = {
    deviceId: string;
    publicKey: string;
    message: string;
    signature: string;
    timestamp: number;
};

type ClawkeyRegisterInitResponse = {
    sessionId: string;
    registrationUrl: string;
    expiresAt: string;
};

type ClawkeyRegisterStatusResponse = {
    status: 'pending' | 'completed' | 'expired' | 'failed';
};

function getDefaultIdentityPath() {
    return path.join(os.homedir(), '.openclaw', 'identity', 'device.json');
}

function loadIdentity(identityPath?: string) {
    const resolvedPath = identityPath || getDefaultIdentityPath();
    if (!fs.existsSync(resolvedPath)) {
        throw new Error(
            `OpenClaw identity not found at ${resolvedPath}. ` +
            'This SDK requires a verified OpenClaw agent identity (device.json).'
        );
    }
    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const identity = JSON.parse(raw) as {
        deviceId: string;
        publicKeyPem: string;
        privateKeyPem: string;
    };
    if (!identity.deviceId || !identity.publicKeyPem || !identity.privateKeyPem) {
        throw new Error('OpenClaw identity file is missing required fields.');
    }
    return identity;
}

function buildClawkeyChallenge(identity: { deviceId: string; publicKeyPem: string; privateKeyPem: string }): ClawkeyChallenge {
    const message = `clawkey-register-${Date.now()}`;
    const privateKey = crypto.createPrivateKey(identity.privateKeyPem);
    const signature = crypto.sign(null, Buffer.from(message, 'utf8'), privateKey);
    const publicKeyDer = crypto
        .createPublicKey(identity.publicKeyPem)
        .export({ type: 'spki', format: 'der' });

    return {
        deviceId: identity.deviceId,
        publicKey: publicKeyDer.toString('base64'),
        message,
        signature: signature.toString('base64'),
        timestamp: Date.now()
    };
}

async function clawkeyRegisterInit(apiBase: string, challenge: ClawkeyChallenge): Promise<ClawkeyRegisterInitResponse | null> {
    const response = await fetch(`${apiBase}/agent/register/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challenge)
    });
    if (response.status === 409) {
        return null;
    }
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`ClawKey init failed: ${response.status} ${text}`);
    }
    return response.json() as Promise<ClawkeyRegisterInitResponse>;
}

async function clawkeyRegisterStatus(apiBase: string, sessionId: string): Promise<ClawkeyRegisterStatusResponse> {
    const response = await fetch(`${apiBase}/agent/register/${sessionId}/status`);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`ClawKey status failed: ${response.status} ${text}`);
    }
    return response.json() as Promise<ClawkeyRegisterStatusResponse>;
}

async function clawkeyVerifySignature(apiBase: string, challenge: ClawkeyChallenge) {
    const response = await fetch(`${apiBase}/agent/verify/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(challenge)
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`ClawKey verify failed: ${response.status} ${text}`);
    }
    const data = await response.json().catch(() => ({} as any)) as any;
    if (!data || data.verified !== true || data.registered !== true) {
        throw new Error('ClawKey verification failed');
    }
}

async function waitForClawkeyCompletion(apiBase: string, sessionId: string, timeoutMs: number) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const status = await clawkeyRegisterStatus(apiBase, sessionId);
        if (status.status === 'completed') {
            return;
        }
        if (status.status === 'expired' || status.status === 'failed') {
            throw new Error(`ClawKey registration ${status.status}`);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error('ClawKey registration timeout');
}

export async function registerAgent(options: AgentRegistrationOptions): Promise<AgentRegistrationResponse> {
    const apiUrl = options.apiUrl.replace(/\/+$/, '');
    const clawkeyApiBase = (options.clawkeyApiBase || 'https://api.clawkey.ai/v1').replace(/\/+$/, '');
    const identity = loadIdentity(options.identityPath);
    const challenge = buildClawkeyChallenge(identity);

    const init = await clawkeyRegisterInit(clawkeyApiBase, challenge);
    if (init) {
        console.log(`Open this link to complete verification: ${init.registrationUrl}`);
        await waitForClawkeyCompletion(clawkeyApiBase, init.sessionId, options.pollTimeoutMs || 5 * 60 * 1000);
    }

    await clawkeyVerifySignature(clawkeyApiBase, challenge);

    const response = await fetch(`${apiUrl}/api/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agent_name: options.agentName,
            clawkey_challenge: challenge
        })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Agent registration failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<AgentRegistrationResponse>;
}

export async function registerAgentFromEnv(): Promise<AgentRegistrationResponse> {
    const apiUrl = process.env.SENTRY_API_URL || '';
    const agentName = process.env.AGENT_NAME || '';
    const clawkeyApiBase = process.env.CLAWKEY_API_BASE || '';
    const identityPath = process.env.CLAWKEY_IDENTITY_PATH || '';

    if (!apiUrl || !agentName) {
        throw new Error('Missing env vars: SENTRY_API_URL, AGENT_NAME');
    }

    return registerAgent({
        apiUrl,
        agentName,
        clawkeyApiBase: clawkeyApiBase || undefined,
        identityPath: identityPath || undefined
    });
}

// -------------------------
// Strategy-as-a-Service
// -------------------------

async function requestSentry<T>(options: {
    apiUrl: string;
    apiKey: string;
    path: string;
    method?: 'GET' | 'POST';
    body?: any;
}): Promise<T> {
    const base = options.apiUrl.replace(/\/+$/, '');
    const url = `${base}${options.path.startsWith('/') ? options.path : `/${options.path}`}`;

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
            'Authorization': `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: options.method === 'POST' ? JSON.stringify(options.body || {}) : undefined
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Sentry API error (${response.status}): ${text || response.statusText}`);
    }

    return response.json() as Promise<T>;
}

export async function startStrategy(options: {
    apiUrl: string;
    apiKey: string;
    strategyType: 'arb' | 'ecdysis';
    market?: 'molting_sol' | 'usdc_sol';
}): Promise<{ success: boolean; strategy: any }> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/agent/strategy/start',
        method: 'POST',
        body: { strategyType: options.strategyType, market: options.market }
    });
}

export async function stopStrategy(options: {
    apiUrl: string;
    apiKey: string;
}): Promise<{ success: boolean; strategy: any }> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/agent/strategy/stop',
        method: 'POST',
        body: {}
    });
}

export async function getStrategyStatus(options: {
    apiUrl: string;
    apiKey: string;
}): Promise<{ success: boolean; status: any }> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/agent/strategy/status',
        method: 'GET'
    });
}

export async function liquidateStrategy(options: {
    apiUrl: string;
    apiKey: string;
}): Promise<{ success: boolean; liquidated: boolean; strategy: any }> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/agent/strategy/liquidate',
        method: 'POST',
        body: {}
    });
}

export async function withdrawFunds(options: {
    apiUrl: string;
    apiKey: string;
    toAddress: string;
    amountSol?: number;
    withdrawAll?: boolean;
}): Promise<{ success: boolean; txSignature: string; amountSol: number }> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/agent/strategy/withdraw',
        method: 'POST',
        body: { toAddress: options.toAddress, amountSol: options.amountSol, withdrawAll: options.withdrawAll }
    });
}

// -------------------------
// Legacy (still supported)
// -------------------------

export async function deployToken(options: {
    apiUrl: string;
    apiKey: string;
    name: string;
    symbol: string;
    metadataUrl: string;
    asciiLogo?: string;
    logoUrl?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
}): Promise<any> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/molting/deploy-token',
        method: 'POST',
        body: {
            name: options.name,
            symbol: options.symbol,
            metadataUrl: options.metadataUrl,
            asciiLogo: options.asciiLogo,
            logoUrl: options.logoUrl,
            website: options.website,
            twitter: options.twitter,
            telegram: options.telegram,
        }
    });
}

export async function agentSwap(options: {
    apiUrl: string;
    apiKey: string;
    direction: 'buy' | 'sell';
    mintAddress: string;
    poolAddress: string;
    amountIn: string;
    minAmountOut?: string;
}): Promise<any> {
    return requestSentry({
        apiUrl: options.apiUrl,
        apiKey: options.apiKey,
        path: '/api/agent/swap',
        method: 'POST',
        body: {
            direction: options.direction,
            mintAddress: options.mintAddress,
            poolAddress: options.poolAddress,
            amountIn: options.amountIn,
            minAmountOut: options.minAmountOut || '0'
        }
    });
}
