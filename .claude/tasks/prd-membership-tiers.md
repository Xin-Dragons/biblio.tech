# PRD: Membership Tier System

## Introduction

Add tier-based membership benefits to Biblio based on staked Dandies NFTs. This builds on top of **existing** voting and username systems — updating them to use tier-based limits rather than hardcoded values or lock requirements.

**IMPORTANT:** Voting, username claiming, and showcase functionality already exist. This PRD focuses on adding tier logic and updating existing code to use it.

## Goals

- Define 5 membership tiers based on staked Dandies count
- Update existing vote limits from hardcoded 3 to tier-based (1-25)
- Update username gating from "locked Dandy" to "Gold+ tier (15+ staked)"
- Add tier badges and benefits display to UI
- Define fee constants for future tool integration

## Tier Structure

| Tier    | Staked Dandies | Votes/Day | Vanity Username | Badge   | Fee Discount |
| ------- | -------------- | --------- | --------------- | ------- | ------------ |
| Free    | 0              | 1         | No              | None    | 0%           |
| Bronze  | 1-4            | 3         | No              | Bronze  | 25%          |
| Silver  | 5-14           | 7         | No              | Silver  | 50%          |
| Gold    | 15-49          | 15        | Yes             | Gold    | 75%          |
| Diamond | 50+            | 25        | Yes             | Diamond | 100%         |

## Fee Structure (SOL per operation)

| Operation    | Free   | Bronze  | Silver | Gold    | Diamond |
| ------------ | ------ | ------- | ------ | ------- | ------- |
| NFT Create   | 0.01   | 0.0075  | 0.005  | 0.0025  | 0       |
| NFT Update   | 0.002  | 0.0015  | 0.001  | 0.0005  | 0       |
| NFT Batch    | 0.002  | 0.0015  | 0.001  | 0.0005  | 0       |
| Token Create | 0.05   | 0.0375  | 0.025  | 0.0125  | 0       |
| Token Update | 0.025  | 0.01875 | 0.0125 | 0.00625 | 0       |
| Send         | 0.002  | 0.0015  | 0.001  | 0.0005  | 0       |
| Burn NFT     | 0.002  | 0.0015  | 0.001  | 0.0005  | 0       |
| Burn FT      | 0.0002 | 0.00015 | 0.0001 | 0.00005 | 0       |
| Cleanup      | 0.0002 | 0.00015 | 0.0001 | 0.00005 | 0       |
| Basic Lock   | 0.05   | 0.0375  | 0.025  | 0.0125  | 0       |
| Secure Lock  | 0.1    | 0.075   | 0.05   | 0.025   | 0       |

## Existing Code (DO NOT RECREATE)

### Voting System

- `apps/api/src/dos/voting.ts` — VotingDO with daily vote tracking
- Hardcoded `maxVotes = 3` on line 64 — **UPDATE to accept parameter**
- Already has `getRemainingVotes()`, `vote()`, leaderboard

### Username System

- `apps/api/src/dos/usernames.ts` — UsernamesDO with claim/release
- `apps/api/src/dos/user.ts` — UserDO.getUsername()/setUsername()
- `apps/api/src/routes/user.ts` — POST /username requires locked Dandy — **UPDATE to tier-based**

### Showcase

- `apps/api/src/routes/showcase.ts` — vote endpoints, leaderboard
- `apps/web/src/routes/showcase.tsx` — full showcase editor, vote display, username claim UI
- `apps/web/src/stores/showcase.ts` — remainingVotesAtom, usernameAtom, etc.

## User Stories

### US-001: Define tier constants and types

**Description:** As a developer, I need shared tier definitions so both API and web can determine user tiers consistently.

**Acceptance Criteria:**

- [ ] Create `apps/api/src/lib/tiers.ts` with Tier enum (Free, Bronze, Silver, Gold, Diamond)
- [ ] Export TIER_THRESHOLDS: { Free: 0, Bronze: 1, Silver: 5, Gold: 15, Diamond: 50 }
- [ ] Export VOTES_PER_DAY: { Free: 1, Bronze: 3, Silver: 7, Gold: 15, Diamond: 25 }
- [ ] Export FEE_DISCOUNTS: { Free: 0, Bronze: 0.25, Silver: 0.5, Gold: 0.75, Diamond: 1 }
- [ ] Export `getTierFromStakedCount(count: number): Tier` function
- [ ] Export `getVotesForTier(tier: Tier): number` function
- [ ] Typecheck passes

### US-002: Define base fee constants

**Description:** As a developer, I need fee constants for all tool operations to calculate tier discounts.

**Acceptance Criteria:**

- [ ] Add BASE_FEES object to `apps/api/src/lib/tiers.ts`
- [ ] NFT Suite: { create: 0.01, update: 0.002, batch: 0.002 }
- [ ] Token Tool: { create: 0.05, update: 0.025 }
- [ ] Biblio: { send: 0.002, burnNft: 0.002, burnFt: 0.0002, cleanup: 0.0002, basicLock: 0.05, secureLock: 0.1 }
- [ ] Export `getFeeForOperation(operation: string, tier: Tier): number` function
- [ ] Diamond tier returns 0 for all operations
- [ ] Typecheck passes

### US-003: Add /user/tier API endpoint

**Description:** As a frontend, I need to fetch the current user's tier to display benefits.

**Acceptance Criteria:**

- [ ] Add GET /tier route to `apps/api/src/routes/user.ts`
- [ ] Endpoint requires auth (use existing authMiddleware)
- [ ] Fetch user's staked Dandies count from existing staking infrastructure
- [ ] Calculate tier using getTierFromStakedCount
- [ ] Return: { tier, stakedCount, votesPerDay, feeDiscount, hasVanityAccess: tier >= Gold }
- [ ] Typecheck passes

### US-004: Update VotingDO to use tier-based vote limits

**Description:** As a system, I need vote limits based on user tier instead of hardcoded 3.

**Acceptance Criteria:**

- [ ] Update `VotingDO.vote()` in `apps/api/src/dos/voting.ts` to accept maxVotes parameter
- [ ] Update `VotingDO.getRemainingVotes()` to accept maxVotes parameter
- [ ] Update `showcase.ts` vote endpoint to get user's tier and pass correct maxVotes
- [ ] Update `showcase.ts` /votes/remaining endpoint to return tier-based limit
- [ ] Remove hardcoded `maxVotes = 3` from VotingDO
- [ ] Typecheck passes

### US-005: Update username gating from lock to tier

**Description:** As a Gold+ member, I want to claim a username based on my tier not just locking.

**Acceptance Criteria:**

- [ ] Update POST /username in `apps/api/src/routes/user.ts`
- [ ] Change requirement from "locked Dandy" to "tier >= Gold (15+ staked)"
- [ ] Return 403 with error "Requires Gold tier (15+ staked Dandies)" if tier too low
- [ ] Keep existing username validation and claiming logic
- [ ] Typecheck passes

### US-006: Create TierBadge component

**Description:** As a user, I want to see tier badges that visually distinguish membership levels.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/components/tier-badge.tsx`
- [ ] Props: { tier: Tier, size?: 'sm' | 'md' | 'lg' }
- [ ] Bronze: amber/bronze colors
- [ ] Silver: gray/silver colors
- [ ] Gold: yellow/gold colors
- [ ] Diamond: cyan with subtle shimmer effect
- [ ] Free tier returns null
- [ ] Typecheck passes

### US-007: Add tier store and fetch hook

**Description:** As a frontend, I need to fetch and cache the user's tier info.

**Acceptance Criteria:**

- [ ] Add tier atoms to `apps/web/src/stores/showcase.ts` or create `apps/web/src/stores/tier.ts`
- [ ] Add tierAtom with shape: { tier, stakedCount, votesPerDay, feeDiscount, hasVanityAccess } | null
- [ ] Add fetchTierAtom that calls GET /api/user/tier
- [ ] Export Tier enum for use in components
- [ ] Typecheck passes

### US-008: Display tier badge on showcase page

**Description:** As a user, I want to see my tier badge on the showcase page.

**Acceptance Criteria:**

- [ ] Import TierBadge in `apps/web/src/routes/showcase.tsx`
- [ ] Fetch tier info when authenticated
- [ ] Display TierBadge next to username in both editor and public view
- [ ] Badge shows on leaderboard entries based on dandyCount
- [ ] Typecheck passes
- [ ] Verify in browser

### US-009: Update vote display to show tier-based limits

**Description:** As a user, I want to see my tier-based vote limit not hardcoded 3.

**Acceptance Criteria:**

- [ ] Update `apps/web/src/routes/showcase.tsx` vote display
- [ ] Show "X/Y votes today" where Y comes from tier info
- [ ] Update remainingVotesAtom response type to include maxVotes
- [ ] Typecheck passes
- [ ] Verify in browser

### US-010: Create tier benefits card component

**Description:** As a user, I want to see my current tier benefits and progress to next tier.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/components/tier-benefits-card.tsx`
- [ ] Display current tier with TierBadge
- [ ] Show staked count and Dandies needed for next tier
- [ ] List features: votes/day, vanity username access, fee discount %
- [ ] Show locked features grayed out
- [ ] Link to staking page
- [ ] Typecheck passes
- [ ] Verify in browser

### US-011: Add tier benefits card to showcase setup

**Description:** As a user, I want to see tier benefits when setting up my showcase.

**Acceptance Criteria:**

- [ ] Import TierBenefitsCard in `apps/web/src/routes/showcase.tsx`
- [ ] Show card in the username claim section to explain tier requirements
- [ ] Show card in settings or profile area for existing users
- [ ] Typecheck passes
- [ ] Verify in browser

## Functional Requirements

- FR-1: Tier is calculated from staked Dandies count at time of request
- FR-2: Votes reset daily at 00:00 UTC (existing behavior)
- FR-3: Fee discount is percentage off base fee (25%, 50%, 75%, 100%)
- FR-4: Diamond tier (100% discount) results in 0 fee
- FR-5: Vanity username requires Gold+ tier (15+ staked)
- FR-6: Badge is purely visual — no blockchain representation
- FR-7: Unstaking immediately downgrades tier (no grace period)

## Non-Goals

- No grace period for tier downgrades
- No vote weighting — all votes count equally
- No fee implementation in this PRD — just constants (tools not built yet)
- No changes to DandyLockSelector UI (keep it but tier takes precedence)

## Technical Considerations

- Staked count should be fetched from existing staking infrastructure
- Tier file goes in `apps/api/src/lib/tiers.ts` for API-side use
- Frontend needs to duplicate Tier enum or import from shared location
- VotingDO changes are backwards compatible (add parameter with default)

## Success Metrics

- Vote limits correctly reflect user tier
- Username claiming requires Gold+ tier
- Tier badges display correctly
- No regression in existing showcase functionality

## Open Questions

- Should we show tier on public showcase pages? (currently shows dandyCount)
- Should leaderboard show tier badges?
