import { useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { parseEther } from 'viem';

export function useMarketCounter() {
  return useContractRead({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCounter',
  });
}

export function useGetMarket(marketId?: bigint) {
  return useContractRead({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarket',
    args: marketId !== undefined ? [marketId] : undefined,
    enabled: marketId !== undefined,
  });
}

export function useGetMarketOdds(marketId?: bigint) {
  return useContractRead({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getMarketOdds',
    args: marketId !== undefined ? [marketId] : undefined,
    enabled: marketId !== undefined,
  });
}

export function useGetUserBets(address?: `0x${string}`) {
  return useContractRead({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'getUserBets',
    args: address ? [address] : undefined,
    enabled: !!address,
  });
}

export function usePlaceBet() {
  const { data, write, isLoading, error } = useContractWrite({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'placeBet',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const placeBet = (marketId: bigint, pick: boolean, amountInBNB: string) => {
    if (write) {
      write({
        args: [marketId, pick],
        value: parseEther(amountInBNB),
      });
    }
  };

  return {
    placeBet,
    hash: data?.hash,
    isLoading: isLoading || isConfirming,
    isSuccess,
    error,
  };
}

export function useClaimWinnings() {
  const { data, write, isLoading, error } = useContractWrite({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'claimWinnings',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const claimWinnings = (marketId: bigint) => {
    if (write) {
      write({
        args: [marketId],
      });
    }
  };

  return {
    claimWinnings,
    hash: data?.hash,
    isLoading: isLoading || isConfirming,
    isSuccess,
    error,
  };
}
