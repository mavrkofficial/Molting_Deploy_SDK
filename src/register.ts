import { registerAgentFromEnv } from './index.js';

async function run() {
    const result = await registerAgentFromEnv();
    console.log('Agent registered:', result.agent.agent_name);
    console.log('API key (store securely):', result.apiKey);
    console.log('Platform wallet:', result.wallet.walletAddress);
    console.log('Harvest wallet:', result.wallet.harvestWalletAddress);
}

run().catch((error) => {
    console.error('Registration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
