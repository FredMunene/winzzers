"use client";

import { type ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionError,
  TransactionResponse,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionStatus,
} from "@coinbase/onchainkit/transaction";
import { useNotification } from "@coinbase/onchainkit/minikit";
import { 
  useWinzzersContract, 
  useMarketSummary, 
  useMarketOdds, 
  useMarkets,
  useUSDCBalance,
  useUSDCAllowance 
} from "../hooks/useWinzzersContract";
import winzzersAbi from "../abi/winzzers.json";
import { decodeEventLog } from "viem";
import { 
  Market, 
  MarketState, 
  formatOdds, 
  formatUSDC, 
  parseUSDC, 
  calculatePayout 
} from "../types/betting";

// Reusable UI Components
type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  icon?: ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  icon,
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0052FF] disabled:opacity-50 disabled:pointer-events-none";

  const variantClasses = {
    primary:
      "bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white",
    secondary:
      "bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] text-[var(--app-foreground)]",
    outline:
      "border border-[var(--app-accent)] hover:bg-[var(--app-accent-light)] text-[var(--app-accent)]",
    ghost:
      "hover:bg-[var(--app-accent-light)] text-[var(--app-foreground-muted)]",
  };

  const sizeClasses = {
    sm: "text-xs px-2.5 py-1.5 rounded-md",
    md: "text-sm px-4 py-2 rounded-lg",
    lg: "text-base px-6 py-3 rounded-lg",
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="flex items-center mr-2">{icon}</span>}
      {children}
    </button>
  );
}

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function Card({
  title,
  children,
  className = "",
  onClick,
}: CardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--app-card-border)] overflow-hidden transition-all hover:shadow-xl ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
    >
      {title && (
        <div className="px-5 py-3 border-b border-[var(--app-card-border)]">
          <h3 className="text-lg font-medium text-[var(--app-foreground)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

type IconProps = {
  name: "heart" | "star" | "check" | "plus" | "arrow-right" | "trophy" | "clock" | "users";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className = "" }: IconProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const icons = {
    heart: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    star: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    check: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    plus: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    "arrow-right": (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
    trophy: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55.47.98.97 1.21C12.04 18.75 13 20.24 13 22" />
        <path d="M14 14.66V17c0 .55-.47.98-.97 1.21C11.96 18.75 11 20.24 11 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
    clock: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    users: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };

  return (
    <span className={`inline-block ${sizeClasses[size]} ${className}`}>
      {icons[name]}
    </span>
  );
}

// Betting Components
type HomeProps = {
  setActiveTab: (tab: string) => void;
};

export function Home({ setActiveTab }: HomeProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Winzers Betting">
        <p className="text-[var(--app-foreground-muted)] mb-4">
          Welcome to decentralized P2P betting on Base. Create markets, place bets, and win big!
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveTab("markets")}
            icon={<Icon name="trophy" size="sm" />}
          >
            View Markets
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab("create")}
            icon={<Icon name="plus" size="sm" />}
          >
            Create Market
          </Button>
        </div>
      </Card>

      <UserBalance />
      <QuickStats />
    </div>
  );
}

function UserBalance() {
  const { address } = useAccount();
  const usdcBalance = useUSDCBalance();
  const usdcAllowance = useUSDCAllowance();

  if (!address) {
    return (
      <Card title="Wallet Status">
        <p className="text-[var(--app-foreground-muted)]">
          Connect your wallet to start betting
        </p>
      </Card>
    );
  }

  return (
    <Card title="Your Balance">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[var(--app-foreground-muted)]">USDC Balance:</span>
          <span className="font-medium">${formatUSDC(usdcBalance)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--app-foreground-muted)]">Approved:</span>
          <span className="font-medium">${formatUSDC(usdcAllowance)}</span>
        </div>
        {usdcAllowance === BigInt(0) && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600">
              You need to approve USDC spending to place bets
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuickStats() {
  const { marketCounter } = useWinzzersContract();

  return (
    <Card title="Platform Stats">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-[var(--app-accent)]">
            {marketCounter}
          </div>
          <div className="text-sm text-[var(--app-foreground-muted)]">
            Total Markets
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[var(--app-accent)]">
            $0.00
          </div>
          <div className="text-sm text-[var(--app-foreground-muted)]">
            Total Volume
          </div>
        </div>
      </div>
    </Card>
  );
}

type MarketsProps = {
  setActiveTab: (tab: string) => void;
};

export function Markets({ setActiveTab }: MarketsProps) {
  const { marketCounter } = useWinzzersContract();
  
  // Generate array of market IDs to fetch
  const marketIds = useMemo(() => {
    if (marketCounter === 0) return [];
    return Array.from({ length: marketCounter }, (_, i) => i + 1);
  }, [marketCounter]);

  const { markets, isLoading } = useMarkets(marketIds);

  // Filter only open markets for MVP
  const openMarkets = markets.filter(market => market.state === MarketState.Open);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card title="Loading Markets...">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (openMarkets.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card title="No Active Markets">
          <p className="text-[var(--app-foreground-muted)] mb-4">
            No betting markets are currently available. Be the first to create one!
          </p>
          <Button
            onClick={() => setActiveTab("create")}
            icon={<Icon name="plus" size="sm" />}
          >
            Create First Market
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--app-foreground)]">
          Active Markets ({openMarkets.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveTab("create")}
          icon={<Icon name="plus" size="sm" />}
        >
          Create Market
        </Button>
      </div>

      {openMarkets.map((market) => (
        <BetCard key={market.id} market={market} />
      ))}
    </div>
  );
}

type BetCardProps = {
  market: Market;
};

function BetCard({ market }: BetCardProps) {
  const { marketOdds, isLoading: oddsLoading } = useMarketOdds(market.id);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const { placeBet } = useWinzzersContract();
  const usdcBalance = useUSDCBalance();
  const usdcAllowance = useUSDCAllowance();
  const sendNotification = useNotification();

  const stakeWei = useMemo(() => {
    try {
      return stakeAmount ? parseUSDC(stakeAmount) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [stakeAmount]);

  const potentialPayout = useMemo(() => {
    if (!marketOdds || selectedOutcome === null || stakeWei === BigInt(0)) {
      return BigInt(0);
    }
    return calculatePayout(stakeWei, marketOdds.odds[selectedOutcome]);
  }, [marketOdds, selectedOutcome, stakeWei]);

  const canPlaceBet = useMemo(() => {
    return (
      selectedOutcome !== null &&
      stakeWei > BigInt(0) &&
      stakeWei <= usdcBalance &&
      !oddsLoading
    );
  }, [selectedOutcome, stakeWei, usdcBalance, oddsLoading]);

  const needsApproval = useMemo(() => {
    return stakeWei > BigInt(0) && usdcAllowance < stakeWei;
  }, [stakeWei, usdcAllowance]);

  const handleBetSuccess = useCallback(async (response: TransactionResponse) => {
    const transactionHash = response.transactionReceipts[0].transactionHash;
    
    await sendNotification({
      title: "Bet Placed Successfully!",
      body: `Your bet of $${stakeAmount} has been placed. Transaction: ${transactionHash}`,
    });

    // Reset form
    setSelectedOutcome(null);
    setStakeAmount("");
  }, [sendNotification, stakeAmount]);

  const placeBetCalls = useMemo(() => {
    if (!canPlaceBet || selectedOutcome === null || !marketOdds) return [];

    const minOdds = marketOdds.odds[selectedOutcome] * BigInt(95) / BigInt(100); // 5% slippage tolerance

    return [
      {
        to: '0xe12ea483c8d43ebe82bc9840545baaf0a0e25546' as `0x${string}`, // TODO: Update with contract address
        data: '0x' as `0x${string}`,
        value: BigInt(0),
      }
    ];
  }, [canPlaceBet, selectedOutcome, marketOdds]);

  return (
    <Card>
      <div className="space-y-4">
        {/* Market Info */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-[var(--app-foreground)]">
              Market #{market.id}
            </h3>
            <p className="text-sm text-[var(--app-foreground-muted)]">
              Total Staked: ${formatUSDC(market.totalStaked)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
            <Icon name="users" size="sm" />
            <span>{market.outcomeCount} outcomes</span>
          </div>
        </div>

        {/* Outcomes */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--app-foreground)]">
            Select Outcome:
          </h4>
          {oddsLoading ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-300 rounded"></div>
            </div>
          ) : (
            <div className="grid gap-2">
              {market.outcomeNames.map((name, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedOutcome(index)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedOutcome === index
                      ? "border-[var(--app-accent)] bg-[var(--app-accent-light)]"
                      : "border-[var(--app-card-border)] hover:border-[var(--app-accent)]"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{name}</span>
                    <span className="text-[var(--app-accent)]">
                      {marketOdds ? formatOdds(marketOdds.odds[index]) : "-.--"}x
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Betting Interface */}
        {selectedOutcome !== null && (
          <div className="space-y-3 p-4 bg-[var(--app-accent-light)] rounded-lg">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Stake Amount (USDC):</label>
              <span className="text-xs text-[var(--app-foreground-muted)]">
                Balance: ${formatUSDC(usdcBalance)}
              </span>
            </div>
            
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            />

            {potentialPayout > BigInt(0) && (
              <div className="flex justify-between items-center text-sm">
                <span>Potential Payout:</span>
                <span className="font-medium text-[var(--app-accent)]">
                  ${formatUSDC(potentialPayout)}
                </span>
              </div>
            )}

            {needsApproval ? (
              <ApproveUSDCButton requiredAmount={stakeWei} />
            ) : (
              <Transaction
                calls={placeBetCalls}
                onSuccess={handleBetSuccess}
                onError={(error: TransactionError) =>
                  console.error("Bet failed:", error)
                }
              >
                <TransactionButton
                  className="w-full text-white text-md"
                  disabled={!canPlaceBet}
                  text="Place Bet"
                />
                <TransactionStatus>
                  <TransactionStatusAction />
                  <TransactionStatusLabel />
                </TransactionStatus>
                <TransactionToast>
                  <TransactionToastIcon />
                  <TransactionToastLabel />
                  <TransactionToastAction />
                </TransactionToast>
              </Transaction>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ApproveUSDCButton({ requiredAmount }: { requiredAmount: bigint }) {
  const { approveUSDCSpending } = useWinzzersContract();
  const [isApproving, setIsApproving] = useState(false);

  const handleApprove = useCallback(async () => {
    if (isApproving || requiredAmount <= BigInt(0)) return;
    setIsApproving(true);
    try {
      // Approve exactly the required amount (could switch to max uint for convenience)
      await approveUSDCSpending(requiredAmount);
    } catch (e) {
      console.error('Approval failed:', e);
    } finally {
      setIsApproving(false);
    }
  }, [approveUSDCSpending, isApproving, requiredAmount]);

  return (
    <Button
      className="w-full"
      onClick={handleApprove}
      disabled={isApproving || requiredAmount <= BigInt(0)}
    >
      {isApproving ? 'Approving…' : 'Approve USDC'}
    </Button>
  );
}

type CreateMarketProps = {
  setActiveTab: (tab: string) => void;
};

export function CreateMarket({ setActiveTab }: CreateMarketProps) {
  const [outcomes, setOutcomes] = useState<string[]>(["", ""]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { createMarket } = useWinzzersContract();
  const sendNotification = useNotification();

  const addOutcome = () => {
    if (outcomes.length < 20) {
      setOutcomes([...outcomes, ""]);
    }
  };

  const removeOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  const canCreate = (
    outcomes.length >= 2 &&
    outcomes.every(outcome => outcome.trim().length > 0) &&
    title.trim().length > 0 &&
    description.trim().length > 0
  );

  const handleCreateMarket = async () => {
    if (!canCreate) return;

    setIsCreating(true);
    try {
      const filteredOutcomes = outcomes.filter(o => o.trim().length > 0);
      const tx = await createMarket({
        outcomeNames: filteredOutcomes,
        virtualLiquidityPerOutcome: BigInt(1000 * 1e6), // 1000 USDC per outcome
        creatorFeeBps: 100, // 1% creator fee
      });

      // Decode MarketCreated event to extract marketId
      let marketId: number | null = null;
      try {
        for (const log of tx.receipt.logs) {
          try {
            const topics = log.topics as unknown as [`0x${string}`, ...`0x${string}`[]];
            const decoded: any = decodeEventLog({
              abi: (winzzersAbi as any).abi,
              data: log.data as `0x${string}`,
              topics,
            });
            if (decoded.eventName === 'MarketCreated') {
              const id = decoded.args?.marketId as bigint | undefined;
              if (typeof id === 'bigint') {
                marketId = Number(id);
                break;
              }
            }
          } catch {}
        }
      } catch {}

      // Save metadata via API (marketId optional; backend can reconcile later if null)
      await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: marketId ?? 0,
          title: title.trim(),
          description: description.trim(),
          tags: [],
        }),
      }).catch(() => {});

      await sendNotification({
        title: "Market Created!",
        body: `Your betting market with ${filteredOutcomes.length} outcomes has been created successfully.`,
      });

      // Reset form and go to markets
      setOutcomes(["", ""]);
      setTitle("");
      setDescription("");
      setActiveTab("markets");
    } catch (error) {
      console.error("Failed to create market:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Create New Market">
        <div className="space-y-4">
          <p className="text-[var(--app-foreground-muted)]">
            Create a new betting market with 2-20 possible outcomes.
          </p>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--app-foreground)]">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Who will win the championship?"
              className="w-full px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--app-foreground)]">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add rules, context, or criteria for resolution."
              className="w-full min-h-[96px] px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--app-foreground)]">
              Outcomes ({outcomes.length}/20):
            </label>
            
            {outcomes.map((outcome, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => updateOutcome(index, e.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                  className="flex-1 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
                />
                {outcomes.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOutcome(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}

            {outcomes.length < 20 && (
              <Button
                variant="outline"
                size="sm"
                onClick={addOutcome}
                icon={<Icon name="plus" size="sm" />}
              >
                Add Outcome
              </Button>
            )}
          </div>

          <div className="p-4 bg-[var(--app-accent-light)] rounded-lg">
            <h4 className="font-medium mb-2">Market Settings:</h4>
            <div className="space-y-2 text-sm text-[var(--app-foreground-muted)]">
              <div className="flex justify-between">
                <span>Virtual Liquidity per Outcome:</span>
                <span>1,000 USDC</span>
              </div>
              <div className="flex justify-between">
                <span>Creator Fee:</span>
                <span>1%</span>
              </div>
              <div className="flex justify-between">
                <span>Protocol Fee:</span>
                <span>2%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleCreateMarket}
              disabled={!canCreate || isCreating}
              className="flex-1"
            >
              {isCreating ? "Creating..." : "Create Market"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab("home")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

type FeaturesProps = {
  setActiveTab: (tab: string) => void;
};

export function Features({ setActiveTab }: FeaturesProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card title="Winzers Features">
        <ul className="space-y-3 mb-4">
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              Decentralized P2P betting on Base L2
            </span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              Create custom betting markets
            </span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              Real-time odds calculation
            </span>
          </li>
          <li className="flex items-start">
            <Icon name="check" className="text-[var(--app-accent)] mt-1 mr-2" />
            <span className="text-[var(--app-foreground-muted)]">
              USDC-based betting with low fees
            </span>
          </li>
        </ul>
        <Button variant="outline" onClick={() => setActiveTab("home")}>
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
