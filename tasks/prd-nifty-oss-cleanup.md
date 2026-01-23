# PRD: Nifty-OSS Feature Cleanup & Refactoring

## Introduction

The nifty-oss staking support feature has been implemented but contains code duplication, debug artifacts, and inconsistencies that need cleanup before merging. This refactoring improves code quality, maintainability, and adds proper logging infrastructure.

## Goals

- Eliminate code duplication across stake dialog components
- Remove debug console.logs and replace with proper logging utility
- Remove unused Core instruction builders (Dandies are pNFT + Nifty only)
- Fix UI inconsistencies between available and staked grids
- Ensure consistent patterns for transaction handling
- Improve performance by reducing redundant code paths

## User Stories

### US-001: Create shared error utilities
**Description:** As a developer, I want error decoding utilities in a shared location so I don't duplicate code across dialogs.

**Acceptance Criteria:**
- [ ] Create `apps/web/src/lib/errors.ts` with `ANCHOR_ERROR_CODES` and `decodeSimulationError`
- [ ] Update `StakeDialog.tsx` to import from shared lib
- [ ] Update `UnstakeDialog.tsx` to import from shared lib
- [ ] Remove duplicated code from both files
- [ ] Typecheck passes

### US-002: Create shared transaction size utilities
**Description:** As a developer, I want transaction size calculation utilities in a shared location for bulk operations.

**Acceptance Criteria:**
- [ ] Add `MAX_TX_SIZE`, `SIZE_BUFFER` constants to `apps/web/src/lib/transaction.ts`
- [ ] Add `getTransactionSize()` function to `apps/web/src/lib/transaction.ts`
- [ ] Update `BulkStakeDialog.tsx` to import from shared lib
- [ ] Update `BulkUnstakeDialog.tsx` to import from shared lib
- [ ] Remove duplicated code from both files
- [ ] Typecheck passes

### US-003: Extract token emission lookup helper
**Description:** As a developer, I want token emission resolution logic extracted to reduce duplication in unstake builders.

**Acceptance Criteria:**
- [ ] Create `resolveTokenEmissionAccounts()` helper in `use-staking.ts`
- [ ] Refactor `buildUnstakeNiftyInstructions` to use helper
- [ ] Refactor `buildUnstakeInstructions` to use helper
- [ ] Remove duplicated emission lookup blocks
- [ ] Typecheck passes

### US-004: Extract getEmissionAddresses helper
**Description:** As a developer, I want emission address extraction in a shared location for stake dialogs.

**Acceptance Criteria:**
- [ ] Add `getEmissionAddresses(collection)` to stake store or lib
- [ ] Update `StakeDialog.tsx` to use shared helper
- [ ] Update `BulkStakeDialog.tsx` to use shared helper
- [ ] Remove duplicated functions from both files
- [ ] Typecheck passes

### US-005: Create logging utility and replace console.logs
**Description:** As a developer, I want a proper logging utility so debug logs can be controlled and don't pollute production.

**Acceptance Criteria:**
- [ ] Create `apps/web/src/lib/logger.ts` with `logger.debug()`, `logger.error()`, `logger.info()`
- [ ] Logger respects `import.meta.env.DEV` to suppress debug in production
- [ ] Replace console.logs in `use-staking.ts` `buildClaimInstructions` with logger
- [ ] Replace console.logs in `UnstakeDialog.tsx` with logger
- [ ] Replace console.logs in `BulkStakeDialog.tsx` with logger
- [ ] Replace console.logs in `BulkUnstakeDialog.tsx` with logger
- [ ] Keep console.error for actual errors
- [ ] Typecheck passes

### US-006: Remove unused Core instruction builders
**Description:** As a developer, I want unused code removed so the codebase stays lean and doesn't confuse future developers.

**Acceptance Criteria:**
- [ ] Remove `buildStakeCoreInstructions` function from `use-staking.ts`
- [ ] Remove `buildUnstakeCoreInstructions` function from `use-staking.ts`
- [ ] Remove `BuildStakeCoreInstructionsInput` interface
- [ ] Remove `BuildUnstakeCoreInstructionsInput` interface
- [ ] Verify no imports reference these functions
- [ ] Typecheck passes

### US-007: Add Nifty badge to StakedNftsGrid
**Description:** As a user, I want to see which of my staked NFTs are Nifty assets so the UI is consistent with the available grid.

**Acceptance Criteria:**
- [ ] Import `isNiftyAsset` in `StakedNftsGrid.tsx`
- [ ] Add violet "Nifty" badge to staked NFT cards (matching `AvailableToStakeGrid` style)
- [ ] Badge positioned at bottom-left of image
- [ ] Typecheck passes
- [ ] Verify in browser that badge appears on staked Nifty assets

### US-008: Fix BulkUnstakeDialog transaction sending
**Description:** As a developer, I want consistent transaction sending patterns across all dialogs.

**Acceptance Criteria:**
- [ ] Update `BulkUnstakeDialog.tsx` to use `sendTransaction()` from `lib/transaction.ts`
- [ ] Remove raw fetch to `/api/rpc/send`
- [ ] Behavior matches `BulkStakeDialog.tsx` pattern
- [ ] Typecheck passes

### US-009: Remove obvious comments
**Description:** As a developer, I want self-explanatory code without redundant comments.

**Acceptance Criteria:**
- [ ] Remove comment on line 126-127 of `use-staking.ts` (Uint8Array/Buffer)
- [ ] Remove obvious JSDoc from `decodeAddress` in `nifty.ts`
- [ ] Remove obvious JSDoc from `isNullAddress` in `nifty.ts`
- [ ] Typecheck passes

### US-010: Run final quality checks
**Description:** As a developer, I want all changes to pass quality gates before completion.

**Acceptance Criteria:**
- [ ] Run `pnpm prettier --write` on all modified files
- [ ] Run `pnpm --filter @biblio/web typecheck` passes
- [ ] Run `pnpm --filter @biblio/api typecheck` passes
- [ ] No new lint warnings introduced

## Functional Requirements

- FR-1: All shared utilities must be properly typed with no `any` or `unknown`
- FR-2: Logger must be environment-aware (silent in production for debug level)
- FR-3: All refactored code must maintain identical runtime behavior
- FR-4: No breaking changes to existing functionality

## Non-Goals

- No new features or functionality
- No changes to API contracts
- No UI redesign beyond adding the Nifty badge
- No changes to staking logic or instruction building
- No addition of Core asset support (removed, not added)

## Technical Considerations

- Logger should be simple - no external dependencies
- Extracted utilities should be co-located with related code
- Transaction utilities belong in existing `lib/transaction.ts`
- Error utilities get their own file for clarity

## Success Metrics

- Zero duplicated code blocks across stake components
- All debug logs controlled via logger utility
- Typecheck and prettier pass on all files
- No runtime behavior changes

## Open Questions

None - scope is well-defined based on code review findings.
