import { useReadContract, useReadContracts, useWriteContract, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { useMemo } from 'react';
import winzzersAbi from '../abi/winzzers.json';
import { Market, MarketOdds, Bet, CreateMarketParams, PlaceBetParams } from '../types/betting';

// Contract configuration
const WINZZERS_CONTRACT = {
  address: (process.env.NEXT_PUBLIC_WINZZERS_CONTRACT_ADDRESS || '0x6e2456c991fc5d2d0835d4d75558e7ddf28d6956') as `0x${string}`,
  abi: winzzersAbi.abi as any,
} as const;

// Base USDC contract address
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0xE4aB69C077896252FAFBD49EFD26B5D171A32410') as `0x${string}`;

export function useWinzzersContract() {
  const { writeContract } = useWriteContract();
  const publicClient = usePublicClient();

  // Get total number of markets
  const { data: marketCounter } = useReadContract({
    ...WINZZERS_CONTRACT,
    functionName: 'marketCounter',
  });

  // Create market function
  const createMarket = async (params: CreateMarketParams) => {
    const hash = await writeContract({
      ...WINZZERS_CONTRACT,
      functionName: 'createMarket',
      args: [params.outcomeNames, params.virtualLiquidityPerOutcome, params.creatorFeeBps],
    });
    const receipt = await publicClient!.waitForTransactionReceipt({ hash });
    return { hash, receipt } as const;
  };

  // Place bet function
  const placeBet = async (params: PlaceBetParams) => {
    return writeContract({
      ...WINZZERS_CONTRACT,
      functionName: 'placeBet',
      args: [params.marketId, params.outcomeId, params.amount, params.minOdds],
    });
  };

  // Approve USDC (ERC20) spending for the Winzzers contract
  const approveUSDCSpending = async (amount: bigint) => {
    return writeContract({
      address: USDC_ADDRESS,
      abi: [
        {
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
        },
      ],
      functionName: 'approve',
      args: [WINZZERS_CONTRACT.address, amount],
    });
  };

  // Claim winnings function
  const claimWinnings = async (ticketId: number) => {
    return writeContract({
      ...WINZZERS_CONTRACT,
      functionName: 'claim',
      args: [ticketId],
    });
  };

  return {
    marketCounter: marketCounter ? Number(marketCounter) : 0,
    createMarket,
    placeBet,
    claimWinnings,
    approveUSDCSpending,
    contractAddress: WINZZERS_CONTRACT.address,
    usdcAddress: USDC_ADDRESS,
  };
}

// Hook to get market summary
export function useMarketSummary(marketId: number) {
  const { data, isLoading, error } = useReadContract({
    ...WINZZERS_CONTRACT,
    functionName: 'getMarketSummary',
    args: [marketId],
    query: {
      enabled: marketId > 0,
    },
  });

  const market = useMemo((): Market | null => {
    if (!data || !Array.isArray(data)) return null;
    
    const [
      creator,
      state,
      creatorFee,
      virtualLiquidity,
      outcomeCount,
      outcomeNames,
      totalStaked,
      winningOutcome,
      distributable,
    ] = data as any[];

    return {
      id: marketId,
      creator: creator as string,
      state: Number(state),
      creatorFee: Number(creatorFee),
      virtualLiquidity: virtualLiquidity as bigint,
      outcomeCount: Number(outcomeCount),
      outcomeNames: outcomeNames as string[],
      totalStaked: totalStaked as bigint,
      winningOutcome: Number(winningOutcome),
      distributable: distributable as bigint,
    };
  }, [data, marketId]);

  return { market, isLoading, error };
}

// Hook to get market odds
export function useMarketOdds(marketId: number) {
  const { data, isLoading, error } = useReadContract({
    ...WINZZERS_CONTRACT,
    functionName: 'getMarketOdds',
    args: [marketId],
    query: {
      enabled: marketId > 0,
      refetchInterval: 10000, // Refetch every 10 seconds for updated odds
    },
  });

  const marketOdds = useMemo((): MarketOdds | null => {
    if (!data || !Array.isArray(data)) return null;
    
    const [odds, names] = data as [bigint[], string[]];
    return {
      marketId,
      odds,
      names,
    };
  }, [data, marketId]);

  return { marketOdds, isLoading, error };
}

// Hook to get multiple markets at once
export function useMarkets(marketIds: number[]) {
  const contracts = marketIds.map(id => ({
    address: WINZZERS_CONTRACT.address,
    abi: WINZZERS_CONTRACT.abi,
    functionName: 'getMarketSummary' as const,
    args: [id] as const,
  }));

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: marketIds.length > 0,
    },
  });

  const markets = useMemo((): Market[] => {
    if (!data) return [];
    
    return data.map((result, index) => {
      if (result.status !== 'success' || !result.result || !Array.isArray(result.result)) return null;
      
      const [
        creator,
        state,
        creatorFee,
        virtualLiquidity,
        outcomeCount,
        outcomeNames,
        totalStaked,
        winningOutcome,
        distributable,
      ] = result.result as any[];

      return {
        id: marketIds[index],
        creator: creator as string,
        state: Number(state),
        creatorFee: Number(creatorFee),
        virtualLiquidity: virtualLiquidity as bigint,
        outcomeCount: Number(outcomeCount),
        outcomeNames: outcomeNames as string[],
        totalStaked: totalStaked as bigint,
        winningOutcome: Number(winningOutcome),
        distributable: distributable as bigint,
      };
    }).filter(Boolean) as Market[];
  }, [data, marketIds]);

  return { markets, isLoading, error };
}

// Hook to get user's bet tickets
export function useUserBets(userAddress?: string) {
  const { address } = useAccount();
  const bettor = userAddress || address;

  // For MVP, we'll need to implement event filtering or indexing
  // For now, return empty array - this would need backend support or event logs
  return {
    bets: [] as Bet[],
    isLoading: false,
    error: null,
  };
}

// Hook to get USDC balance
export function useUSDCBalance() {
  const { address } = useAccount();
  
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return balance || BigInt(0);
}

// Hook to check USDC allowance
export function useUSDCAllowance() {
  const { address } = useAccount();
  
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: [
      {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }],
      },
    ],
    functionName: 'allowance',
    args: address ? [address, WINZZERS_CONTRACT.address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  return allowance || BigInt(0);
}