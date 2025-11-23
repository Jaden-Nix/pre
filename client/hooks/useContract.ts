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

export function useCreateMarketContract() {
  const { data, write, isLoading, error } = useContractWrite({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'createMarket',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  const createMarket = (
    title: string,
    description: string,
    resolutionTime: bigint,
    initialYesBnb: string = '0',
    initialNoBnb: string = '0',
    initialYesPred: string = '0',
    initialNoPred: string = '0'
  ) => {
    if (write) {
      write({
        args: [
          title,
          description,
          resolutionTime,
          parseEther(initialYesBnb),
          parseEther(initialNoBnb),
          parseEther(initialYesPred),
          parseEther(initialNoPred),
        ],
        value: parseEther((parseFloat(initialYesBnb) + parseFloat(initialNoBnb)).toString()),
      });
    }
  };

  return {
    createMarket,
    hash: data?.hash,
    isLoading: isLoading || isConfirming,
    isSuccess,
    error,
  };
}
