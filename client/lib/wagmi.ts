import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Predora',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'c5e1e2f4d6b7c3a8d9e0f1a2b3c4d5e6',
  chains: [bscTestnet],
  ssr: true,
});
