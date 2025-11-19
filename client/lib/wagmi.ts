import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bscTestnet, bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Predora',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [bscTestnet, bsc],
  ssr: true,
});
