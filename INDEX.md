### Winzzers Project Index

**Purpose**: Betting markets dApp with a Solidity backend and Next.js frontend.

### Tech Stack
- **Contracts**: Solidity (OpenZeppelin), Foundry
- **Frontend**: Next.js 15, React 18, TailwindCSS
- **Web3**: wagmi, viem, Coinbase OnchainKit
- **Infra**: Upstash Redis (notifications)

### Directory Structure (high-level)
```
./
  architecture.md
  betting_app_plan.md
  DEPLOYMENT_GUIDE.md
  NETWORK_SETUP.md
  WALLET_SETUP.md
  contracts/
    lib/
    script/
    src/
      BetFactory.sol  (WinzzersMarket contract)
    test/
    broadcast/
  site/
    app/
      abi/
        winzzers.json
      api/
        notify/route.ts
        webhook/route.ts
      components/
      hooks/
      types/
      layout.tsx
      page.tsx
      providers.tsx
      globals.css, theme.css
    lib/
      notification-client.ts, notification.ts, redis.ts
    public/
    package.json, tsconfig.json, next.config.mjs, tailwind.config.ts
```

### Key Components
- **contracts/src/BetFactory.sol**: `WinzzersMarket` contract handling market creation, betting, resolution, fees, and payouts.
- **site/app/abi/winzzers.json**: Contract ABI for the frontend.
- **site/app/page.tsx**: Main UI with tabs for Home, Markets, Create Market, Features. Integrates Wallet, Network switcher, and MiniKit frame.
- **site/app/api/notify/route.ts**: POST endpoint to send frame notifications via `lib/notification-client`.
- **site/lib/**: Client helpers for notifications and Redis.
- **Guides**: `DEPLOYMENT_GUIDE.md`, `NETWORK_SETUP.md`, `WALLET_SETUP.md`, `architecture.md`, `betting_app_plan.md`.

### Notable Contract APIs (WinzzersMarket)
- Creation: `createMarket(outcomeNames, virtualLiquidityPerOutcome, creatorFeeBps)`
- Odds: `getMarketOdds(marketId)`, `getOutcomeOdds(marketId, outcomeId)`
- Betting: `placeBet(marketId, outcomeId, amount, minOdds)`
- Lifecycle: `lockMarket(marketId)`, `setOutcome(marketId, winningOutcome)`, `voidMarket(marketId)`
- Claims/Fees: `claim(ticketId)`, `withdrawProtocolFees(to)`, `withdrawCreatorFees(to)`

### Frontend Commands (from site/package.json)
- `npm run dev` — start Next.js dev server
- `npm run build` — build
- `npm start` — production start
- `npm run lint` — lint

### Where to Configure
- **Network/Wallet**: See `WALLET_SETUP.md` and `NETWORK_SETUP.md`.
- **Contract Address/ABI**: Update in `site/app/abi/winzzers.json` and any hooks using it (e.g., `site/app/hooks/useWinzzersContract.ts`).
- **Environment**: Copy `site/env.example` to `.env.local` as needed.

### Notes
- Large build artifacts exist under `site/.next/`; excluded from this high-level index.
- For deployment and environment details, follow the included guides.


