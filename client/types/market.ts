export interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  resolutionDate: string;
  isResolved: boolean;
  winningOutcome?: 'YES' | 'NO';
  yesOdds: number;
  noOdds: number;
  totalVolume: number;
  createdAt: string;
  createdBy: string;
  tags?: string[];
}

export interface UserPosition {
  marketId: string;
  outcome: 'YES' | 'NO';
  amount: number;
  timestamp: string;
}

export interface UserProfile {
  walletAddress: string;
  username?: string;
  xp: number;
  level: number;
  winRate: number;
  totalPredictions: number;
  totalWins: number;
  totalEarnings: number;
}
