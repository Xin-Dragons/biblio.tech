# PRD: Dandies Staking Integration

## Overview
Integrate the existing Dandies staking program into the biblio.tech platform, enabling users to stake/unstake their Dandies NFTs and claim rewards directly from the app. This requires generating a modern Solana Kit SDK from the legacy Anchor IDL using Codama.

## Problem Statement
Dandies NFTs can be staked via an existing on-chain program, but users currently need to use a separate legacy application. By integrating staking into biblio.tech:
- Users get a unified experience for managing their NFT portfolio including staking
- The platform extends beyond portfolio viewing to active NFT utility
- Staked NFTs can be visually distinguished in the user's collection

## Goals
- Generate a type-safe Solana Kit SDK for the stake program using Codama
- Build a dedicated stake page showing staked Dandies and available-to-stake NFTs
- Allow users to stake, unstake, and claim rewards
- Display staking rewards and emission status

### Success Metrics
- Users can successfully stake/unstake NFTs
- Staked NFTs are clearly identified in the portfolio
- Reward claiming works reliably

## User Stories
- As a Dandies holder, I want to stake my NFTs so that I can earn rewards
- As a staker, I want to see my pending rewards so I know what I've earned
- As a staker, I want to unstake my NFTs when I need liquidity
- As a user, I want to see which of my NFTs are staked at a glance

## Technical Requirements

### Architecture

The integration follows the existing codebase patterns:

```
packages/solana-programs/
├── idls/
│   └── stake.json              # Copied from legacy app
├── scripts/
│   ├── fetch-idls.ts           # Updated to include stake
│   └── generate.ts             # Updated to include stake
└── src/
    └── generated/
        └── stake/              # Generated Codama SDK
            ├── accounts/
            ├── instructions/
            ├── types/
            └── index.ts

apps/web/src/
├── routes/
│   └── stake.tsx               # New stake page
├── stores/
│   └── stake.ts                # Staking state management
├── hooks/
│   └── use-staking.ts          # Staking transaction hooks
└── components/
    └── stake/                  # Staking UI components
```

### Data Models

**Existing on-chain accounts (from IDL):**

```typescript
// Staker - The main staking pool account
interface Staker {
  authority: PublicKey
  slug: string
  name: string
  isActive: boolean
  collections: PublicKey[]
  tokenMint: PublicKey | null
  numberStaked: number
}

// Collection - A stakeable collection within a staker
interface Collection {
  staker: PublicKey
  collectionMint: PublicKey
  custodial: boolean
  isActive: boolean
  maxStakersCount: bigint
  currentStakersCount: bigint
  tokenEmission: PublicKey | null
  pointsEmission: PublicKey | null
}

// StakeRecord - Individual NFT stake record
interface StakeRecord {
  staker: PublicKey
  owner: PublicKey
  nftMint: PublicKey
  emissions: PublicKey[]
  pendingClaim: bigint
  canClaimAt: bigint
  stakedAt: bigint
}

// Emission - Reward emission configuration
interface Emission {
  collection: PublicKey
  rewardType: RewardType
  reward: bigint[]
  startTime: bigint
  endTime: bigint | null
  stakedWeight: bigint
  currentBalance: bigint
  active: boolean
}
```

**Frontend state:**

```typescript
// apps/web/src/stores/stake.ts
interface StakeState {
  stakerAccount: Staker | null
  collections: Collection[]
  userStakeRecords: StakeRecord[]
  emissions: Map<string, Emission>
  isLoading: boolean
  error: string | null
}
```

### API Endpoints

**Backend (apps/api):**

```typescript
// GET /api/stake/dandies - Get Dandies staker info
// Response: { staker: Staker, collections: Collection[], emissions: Emission[] }

// GET /api/stake/records/:wallet - Get user's stake records
// Response: { records: StakeRecord[] }

// GET /api/stake/pending/:wallet - Calculate pending rewards
// Response: { pending: { emission: string, amount: bigint }[] }
```

### Frontend Components

**Route: `/stake`**

```typescript
// apps/web/src/routes/stake.tsx
- StakePage
  ├── StakeHeader (stats: total staked, pending rewards)
  ├── StakedNftsGrid (user's currently staked NFTs)
  ├── AvailableToStakeGrid (user's unstaked Dandies)
  └── ClaimRewardsButton
```

**Components:**

```typescript
// apps/web/src/components/stake/
├── StakeNftCard.tsx      // NFT card with stake/unstake button
├── StakeStats.tsx        // Staking statistics display
├── ClaimDialog.tsx       // Reward claiming dialog
├── StakeDialog.tsx       // Confirmation before staking
└── UnstakeDialog.tsx     // Confirmation before unstaking
```

### Dependencies

**Package additions:**

```json
// packages/solana-programs/package.json
{
  "dependencies": {
    "codama": "^1.0.0",
    "@codama/nodes-from-anchor": "^1.0.0",
    "@codama/renderers-js": "^1.0.0"
  }
}
```

No new frontend dependencies required - existing `@solana/wallet-adapter-react` and `@biblio/solana-programs` patterns apply.

## Implementation Plan

### Phase 1: SDK Generation
1. Copy stake IDL from `apps/legacy/src/apps/stake/idl/stake.json` to `packages/solana-programs/idls/`
2. Update `packages/solana-programs/scripts/generate.ts` to include "stake" in PROGRAMS array
3. Run generation: `pnpm generate`
4. Export stake SDK from `packages/solana-programs/src/index.ts`
5. Verify types are correctly generated

### Phase 2: Backend Integration
1. Create `apps/api/src/services/stake.ts` with account fetching logic
2. Add routes in `apps/api/src/routes/stake.ts`:
   - GET staker/collection info
   - GET user stake records
   - Calculate pending rewards
3. Use existing Solana client from `apps/api/src/lib/solana-client.ts`

### Phase 3: Frontend State
1. Create `apps/web/src/stores/stake.ts` with Jotai atoms:
   - `stakerAtom` - cached staker account
   - `userStakeRecordsAtom` - user's stakes
   - `pendingRewardsAtom` - calculated rewards
   - `fetchStakeDataAtom` - fetch action
2. Add stake detection to NFT grid (badge for staked NFTs)

### Phase 4: Transaction Building
1. Create `apps/web/src/hooks/use-staking.ts` following `use-solana-actions.ts` patterns
2. Implement instruction builders:
   - `buildStakeCoreInstructions()` - for Core assets (Dandies)
   - `buildUnstakeCoreInstructions()`
   - `buildClaimInstructions()`
3. Handle account derivation (PDAs for stake records, etc.)

### Phase 5: UI Implementation
1. Add route `/stake` to `apps/web/src/App.tsx`
2. Create `StakePage` component with:
   - Stats header (total staked, pending rewards)
   - Staked NFTs grid with unstake buttons
   - Available NFTs grid with stake buttons
3. Add stake/unstake dialogs with confirmation
4. Add claim rewards functionality

### Phase 6: Polish
1. Add "Staked" badge to NFTs in main grid
2. Add staking link to sidebar navigation
3. Handle edge cases (emission ended, minimum period, etc.)
4. Error handling and loading states

## Security Considerations
- All transactions are client-side signed - no private keys on backend
- Backend only provides read data from on-chain accounts
- Stake program has its own on-chain validation for authorization
- Fee wallet payments handled by the program (not user-controllable)

## Testing Strategy

**Unit Tests:**
- SDK generation output validation
- PDA derivation functions
- Reward calculation logic

**Integration Tests:**
- Backend API endpoints return correct account data
- Transaction instruction building produces valid instructions

**E2E Tests:**
- Full stake flow with devnet/local validator
- Unstake and claim flows
- Error states (insufficient balance, inactive collection)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Legacy Anchor IDL incompatibility with Codama | High | Test generation early; may need manual IDL adjustments |
| Core asset staking uses different instruction than pNFT | Medium | Use `stakeCore`/`unstakeCore` instructions specifically |
| Emission calculations are complex on-chain | Medium | Backend calculates pending rewards; frontend displays |
| Minimum stake period prevents immediate unstake | Low | Display `canClaimAt` timestamp clearly to users |

## Open Questions
1. Should we support staking multiple NFTs in a single transaction, or one at a time?
2. Do we need to display emission history/past claims?
3. Should staked NFTs still appear in the main NFT grid with a badge, or only on the stake page?
4. What's the Dandies collection mint address for filtering available NFTs?

## Key Files Reference

**Existing patterns to follow:**
- SDK generation: `packages/solana-programs/scripts/generate.ts:14-51`
- Transaction building: `apps/web/src/hooks/use-solana-actions.ts:92-371`
- State management: `apps/web/src/stores/nfts.ts:72-383`
- Codama instruction conversion: `apps/web/src/hooks/use-solana-actions.ts:65-76`

**Stake program:**
- IDL location: `apps/legacy/src/apps/stake/idl/stake.json`
- Program ID: `STAKEQkGBjkhCXabzB5cUbWgSSvbVJFEm2oEnyWzdKE`
