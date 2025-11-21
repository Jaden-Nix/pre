import { http, createConfig } from 'wagmi';
import { bscTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Simple config without WalletConnect - just browser wallets (MetaMask, etc)
// This avoids 403 errors from WalletConnect API
export const config = createConfig({
  chains: [bscTestnet],
  connectors: [
    injected({ target: 'metaMask' }),
  ],
  transports: {
    [bscTestnet.id]: http(),
  },
  ssr: true,
});
