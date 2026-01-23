# PRD: Membership Refactor (Staking → Membership)

## Introduction

Refactor the staking system to be membership-focused. The current staking feature is designed around emissions and rewards, but the business model has changed - staking is now about Biblio membership tiers and their benefits, not earning token rewards.

This refactor removes all emissions/rewards/claim functionality and reframes the feature as "Membership" with "Lock/Unlock" terminology instead of "Stake/Unstake".

## Goals

- Remove all emissions, rewards, and claim functionality
- Change terminology from "stake/unstake" to "lock/unlock"
- Rename route from `/stake` to `/membership`
- Add a prominent Membership Status display showing tier, locked count, and progress to next tier
- Keep internal store/hook names unchanged to minimize code churn

## User Stories

### US-001: Remove ClaimDialog component
**Description:** As a developer, I need to remove the claim rewards dialog since emissions are no longer part of the system.

**Acceptance Criteria:**
- [ ] Delete `apps/web/src/components/stake/ClaimDialog.tsx`
- [ ] Remove ClaimDialog import and usage from stake.tsx (membership.tsx)
- [ ] Remove `showClaimDialog` state and handlers
- [ ] Remove "Claim Rewards" button from page header
- [ ] Typecheck passes

### US-002: Remove StakeStats component
**Description:** As a developer, I need to remove the stats component that displays pending rewards.

**Acceptance Criteria:**
- [ ] Delete `apps/web/src/components/stake/StakeStats.tsx`
- [ ] Remove StakeStats import and usage from stake.tsx
- [ ] Typecheck passes

### US-003: Clean up stake store (remove rewards atoms)
**Description:** As a developer, I need to remove rewards-related atoms from the stake store while keeping lock/unlock functionality.

**Acceptance Criteria:**
- [ ] Remove `pendingRewardsAtom` (derived atom for calculating rewards)
- [ ] Remove `totalPendingRewardsAtom` (sum of pending rewards)
- [ ] Remove `clearPendingRewardsAtom` (reset after claim)
- [ ] Keep all atoms needed for lock/unlock operations
- [ ] Typecheck passes

### US-004: Remove buildClaimInstructions from use-staking hook
**Description:** As a developer, I need to remove the claim instruction builder since claiming is no longer supported.

**Acceptance Criteria:**
- [ ] Remove `buildClaimInstructions` function from `apps/web/src/hooks/use-staking.ts`
- [ ] Remove `BuildClaimInstructionsInput` interface
- [ ] Typecheck passes

### US-005: Create MembershipStatus component
**Description:** As a user, I want to see my membership tier status prominently so I understand my current benefits and progress.

**Acceptance Criteria:**
- [ ] Create `apps/web/src/components/membership/MembershipStatus.tsx`
- [ ] Display large tier badge (Bronze/Silver/Gold/Diamond)
- [ ] Show locked Dandy count ("15 Dandies Locked")
- [ ] Show progress bar to next tier
- [ ] Show "X more for [NextTier]" text (or "Max tier reached" for Diamond)
- [ ] Show tier progression indicator (checkmarks for achieved, dot for current, circles for locked)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Rename route from /stake to /membership
**Description:** As a user, I want to access the membership page at /membership to match the new feature name.

**Acceptance Criteria:**
- [ ] Rename `apps/web/src/routes/stake.tsx` to `apps/web/src/routes/membership.tsx`
- [ ] Update component export from `StakePage` to `MembershipPage`
- [ ] Update `apps/web/src/App.tsx` route from `stake` to `membership`
- [ ] Update import to use `MembershipPage`
- [ ] Typecheck passes

### US-007: Update sidebar navigation
**Description:** As a user, I want the sidebar to show "Membership" instead of "Staking".

**Acceptance Criteria:**
- [ ] Update `apps/web/src/components/layout/sidebar.tsx` nav item
- [ ] Change href from `/stake` to `/membership`
- [ ] Change label from "Staking" to "Membership"
- [ ] Keep Lock icon (already appropriate)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Rename stake component directory to membership
**Description:** As a developer, I need to rename the component directory to match the new feature name.

**Acceptance Criteria:**
- [ ] Rename `apps/web/src/components/stake/` to `apps/web/src/components/membership/`
- [ ] Update all imports in membership.tsx
- [ ] Typecheck passes

### US-009: Rename StakeDialog to LockDialog
**Description:** As a user, I want the lock dialog to use "Lock" terminology.

**Acceptance Criteria:**
- [ ] Rename `StakeDialog.tsx` to `LockDialog.tsx`
- [ ] Update component name from `StakeDialog` to `LockDialog`
- [ ] Change dialog title from "Stake NFT" to "Lock Dandy"
- [ ] Change button text from "Stake" to "Lock"
- [ ] Change loading text from "Staking..." to "Locking..."
- [ ] Update confirmation copy to "Are you sure you want to lock this Dandy? You can unlock at any time."
- [ ] Update success toast to "Locked {name} successfully!"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Rename UnstakeDialog to UnlockDialog
**Description:** As a user, I want the unlock dialog to use "Unlock" terminology.

**Acceptance Criteria:**
- [ ] Rename `UnstakeDialog.tsx` to `UnlockDialog.tsx`
- [ ] Update component name from `UnstakeDialog` to `UnlockDialog`
- [ ] Change dialog title from "Unstake NFT" to "Unlock Dandy"
- [ ] Change button text from "Unstake" to "Unlock"
- [ ] Change loading text from "Unstaking..." to "Unlocking..."
- [ ] Update success toast to "Unlocked {name} successfully!"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Rename BulkStakeDialog to BulkLockDialog
**Description:** As a user, I want the bulk lock dialog to use "Lock" terminology.

**Acceptance Criteria:**
- [ ] Rename `BulkStakeDialog.tsx` to `BulkLockDialog.tsx`
- [ ] Update component name and all internal terminology
- [ ] Update title, buttons, loading states, and toasts
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Rename BulkUnstakeDialog to BulkUnlockDialog
**Description:** As a user, I want the bulk unlock dialog to use "Unlock" terminology.

**Acceptance Criteria:**
- [ ] Rename `BulkUnstakeDialog.tsx` to `BulkUnlockDialog.tsx`
- [ ] Update component name and all internal terminology
- [ ] Update title, buttons, loading states, and toasts
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: Rename StakedNftsGrid to LockedDandiesGrid
**Description:** As a user, I want the locked NFTs grid to use "Locked Dandies" terminology.

**Acceptance Criteria:**
- [ ] Rename `StakedNftsGrid.tsx` to `LockedDandiesGrid.tsx`
- [ ] Update component name from `StakedNftsGrid` to `LockedDandiesGrid`
- [ ] Change header from "Your Staked NFTs" to "Your Locked Dandies"
- [ ] Change button from "Unstake All" to "Unlock All"
- [ ] Change empty state from "No NFTs staked yet" to "No Dandies locked yet"
- [ ] Change card button from "Unstake" to "Unlock"
- [ ] Keep "Locked X ago" timestamp format
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: Rename AvailableToStakeGrid to AvailableToLockGrid
**Description:** As a user, I want the available NFTs grid to use "Lock" terminology.

**Acceptance Criteria:**
- [ ] Rename `AvailableToStakeGrid.tsx` to `AvailableToLockGrid.tsx`
- [ ] Update component name from `AvailableToStakeGrid` to `AvailableToLockGrid`
- [ ] Change header from "Available to Stake" to "Available to Lock"
- [ ] Change button from "Stake All" to "Lock All"
- [ ] Change empty state from "No Dandies available to stake" to "No Dandies available to lock"
- [ ] Change card button from "Stake" to "Lock"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-015: Update membership page with new components
**Description:** As a user, I want the membership page to show my tier status and use the new components.

**Acceptance Criteria:**
- [ ] Change page title from "Stake" to "Membership"
- [ ] Replace StakeStats with MembershipStatus component
- [ ] Update all handler names (handleStake → handleLock, etc.)
- [ ] Update all state variable names (stakeDialogNft → lockDialogNft, etc.)
- [ ] Remove layout size toggle from header (keep it simple)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Update tier-benefits-card link
**Description:** As a user, I want the tier benefits card link to point to /membership.

**Acceptance Criteria:**
- [ ] Update link in `apps/web/src/components/tier-benefits-card.tsx` from `/stake` to `/membership`
- [ ] Update button text from "Stake More Dandies" to "Lock More Dandies"
- [ ] Update Diamond tier text from "Manage Staking" to "Manage Membership"
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Remove all emissions/rewards calculation code from stake store
- FR-2: Remove claim functionality (ClaimDialog, buildClaimInstructions)
- FR-3: Display membership tier badge prominently on membership page
- FR-4: Show locked Dandy count on membership page
- FR-5: Show progress to next tier with visual progress bar
- FR-6: Show tier progression indicator with achieved/current/locked states
- FR-7: Use "Lock/Unlock" terminology in all user-facing text
- FR-8: Route to membership page via `/membership` URL
- FR-9: Keep internal store atom names as `stake*` (implementation detail)
- FR-10: Keep hook file name as `use-staking.ts` (implementation detail)

## Non-Goals

- No redirect from /stake to /membership (clean break)
- No renaming of internal store atoms (minimize churn)
- No renaming of hook file (minimize churn)
- No changes to API routes (still /api/stake/*)
- No changes to on-chain stake program interaction

## Technical Considerations

- Tier thresholds already defined in `tier-badge.tsx`: Free(0), Bronze(1), Silver(5), Gold(15), Diamond(50)
- Tier benefits already defined in `tier-benefits-card.tsx` - can reuse constants
- Existing `tierAtom` in `stores/tier.ts` provides tier info from API
- Store atoms like `stakedNftCountAtom` can be kept as-is (internal naming)

## Success Metrics

- All staking functionality works identically (just renamed)
- Users understand this is about membership, not rewards
- Clear visibility of current tier and progress to next tier
- No regression in lock/unlock operations

## Open Questions

- None - requirements are clear from user input
