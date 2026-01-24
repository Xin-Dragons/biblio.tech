# PRD: Vault Feature

## Introduction

Re-implement the Vault feature from the legacy Biblio app in the new application. The Vault allows users to "freeze" (lock) their NFTs to protect them from unauthorized transfers. This is a critical security feature - if someone gains access to a user's private key, they cannot steal frozen NFTs unless they also have access to the unlock authority wallet.

The Vault supports two modes:

- **Basic Freeze**: The owner wallet retains freeze authority (simpler, less secure)
- **Secure Freeze**: Freeze authority is delegated to a different wallet owned by the user (more secure, recommended)

Additionally, a **Recover** feature allows users to unlock AND transfer NFTs to a safe wallet in a single transaction - critical for emergency situations where a wallet is compromised.

**Technical Constraint**: Must use only `@solana/kit` and compatible SDKs. No `@solana/web3.js` usage.

## Goals

- Allow users to freeze/lock NFTs to protect them from unauthorized transfers
- Support basic freeze (owner-controlled) and secure freeze (delegate-controlled)
- Support all asset types: Token Metadata NFTs, pNFTs, Nifty Assets, and MPL Core
- Provide a Recover feature to rescue assets in emergency situations
- Display vaulted NFTs in a dedicated view using existing grid components
- Maintain consistency with the new app's design patterns (shadcn/Radix)

## User Stories

### US-001: Add Vault route and sidebar navigation

**Description:** As a user, I want to access the Vault from the sidebar so I can manage my protected assets.

**Acceptance Criteria:**

- [ ] Add `/vault` route in the app router
- [ ] Add Vault entry in sidebar navigation with vault icon
- [ ] Route displays placeholder content initially
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-002: Create vault store for state management

**Description:** As a developer, I need a Jotai store to manage vault state including vaulted NFTs and UI state.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/stores/vault.ts`
- [ ] Define `vaultedMintsSetAtom` - Set of mints that are vaulted
- [ ] Define `vaultLoadingAtom` - Loading state
- [ ] Define `vaultErrorAtom` - Error state
- [ ] Define derived atom `vaultedNftsAtom` that filters `nftsAtom` by vaulted mints
- [ ] Typecheck passes

---

### US-003: Detect and display vaulted NFTs

**Description:** As a user, I want to see which of my NFTs are currently in the vault so I can manage them.

**Acceptance Criteria:**

- [ ] On wallet connect, detect vaulted NFTs by checking frozen/delegate state
- [ ] NFTs are considered "vaulted" if they are frozen AND have a delegate set
- [ ] Display vaulted NFTs in the `/vault` route using existing `NftGrid` component
- [ ] Show empty state when no NFTs are vaulted
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-004: Create VaultDialog component

**Description:** As a user, I want a dialog to add NFTs to the vault so I can protect my assets.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/components/vault/VaultDialog.tsx`
- [ ] Dialog shows count of selected NFTs to vault
- [ ] Basic Freeze option - owner retains authority
- [ ] Secure Freeze option - select delegate wallet from user's linked wallets
- [ ] Secure Freeze disabled if user has only one wallet linked
- [ ] Show explanation of each freeze type
- [ ] Cancel and Confirm buttons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: Implement basic freeze transaction

**Description:** As a user, I want to add NFTs to the vault using basic freeze so they are protected.

**Acceptance Criteria:**

- [ ] Build lock transactions for Token Metadata NFTs using `lockV1` from `@metaplex-foundation/mpl-token-metadata`
- [ ] Build lock transactions for pNFTs using `delegateUtilityV1` + `lockV1`
- [ ] Build lock transactions for Nifty Assets using `lock` from `@nifty-oss/asset`
- [ ] Build lock transactions for MPL Core using `addPluginV1` with `FreezeDelegate` plugin
- [ ] Owner wallet is set as delegate for basic freeze
- [ ] Execute transaction and show success/error toast
- [ ] Update vault store after successful transaction
- [ ] Typecheck passes

---

### US-006: Implement secure freeze transaction

**Description:** As a user, I want to add NFTs to the vault using secure freeze with a different wallet as delegate.

**Acceptance Criteria:**

- [ ] User selects delegate wallet from their linked wallets (must be different from owner)
- [ ] Build delegate transactions before lock transactions
- [ ] For pNFTs: `delegateUtilityV1` with delegate wallet, then `lockV1`
- [ ] For Nifty Assets: `approve` with Lock role to delegate, then `lock`
- [ ] For MPL Core: `addPluginV1` with FreezeDelegate, initAuthority set to delegate address
- [ ] Execute transaction requiring signatures from both owner and delegate wallets
- [ ] Show wallet switch prompt if needed
- [ ] Update vault store after successful transaction
- [ ] Typecheck passes

---

### US-007: Create UnvaultDialog component

**Description:** As a user, I want a dialog to remove NFTs from the vault so I can transfer them again.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/components/vault/UnvaultDialog.tsx`
- [ ] Dialog shows count of selected NFTs to unvault
- [ ] Display which wallet(s) have authority to unlock (delegate addresses)
- [ ] Cancel and Confirm buttons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-008: Implement unvault (thaw) transaction

**Description:** As a user, I want to remove NFTs from the vault so I can transfer them.

**Acceptance Criteria:**

- [ ] Build unlock transactions for Token Metadata NFTs using `unlockV1`
- [ ] Build revoke transactions for pNFTs using `revokeUtilityV1` after unlock
- [ ] Build unlock transactions for Nifty Assets using `unlock` + `revoke`
- [ ] Build unlock transactions for MPL Core using `removePluginV1` for FreezeDelegate
- [ ] Execute transaction requiring signature from delegate wallet
- [ ] Show wallet switch prompt if delegate is different from current wallet
- [ ] Update vault store after successful transaction
- [ ] Typecheck passes

---

### US-009: Create RecoverDialog component

**Description:** As a user, I want to recover my vaulted assets to a safe wallet in an emergency.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/components/vault/RecoverDialog.tsx`
- [ ] Dialog shows count of selected NFTs to recover
- [ ] Dropdown to select destination wallet from user's linked wallets
- [ ] Warning text explaining this unlocks AND transfers in one transaction
- [ ] Cancel and Recover buttons
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-010: Implement recover transaction

**Description:** As a user, I want to unlock and transfer my vaulted NFTs to a safe wallet in one transaction.

**Acceptance Criteria:**

- [ ] Build combined unlock + transfer transactions
- [ ] For pNFTs: `unlockV1` + `transferV1` + `closeToken` (no revoke needed since transferring)
- [ ] For Nifty Assets: `unlock` + `transfer`
- [ ] For MPL Core: `removePluginV1` + `transferV1`
- [ ] Execute transaction requiring signature from delegate wallet
- [ ] Update vault store and NFT owner after successful transaction
- [ ] Typecheck passes

---

### US-011: Add vault badge to NFT cards

**Description:** As a user, I want to see which NFTs are vaulted when viewing my collection.

**Acceptance Criteria:**

- [ ] Add "Vaulted" badge to NftCard component (similar to existing "Staked" badge)
- [ ] Badge shows lock icon with "Vaulted" text
- [ ] Badge styled with vault theme color (teal: #a6e3e0)
- [ ] Badge appears on vaulted NFTs in all grid views
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-012: Add vault actions to selection toolbar

**Description:** As a user, I want to add/remove selected NFTs to/from the vault from the main view.

**Acceptance Criteria:**

- [ ] Add vault icon button to selection actions (when NFTs are selected)
- [ ] Button disabled if selection contains mix of vaulted and non-vaulted NFTs
- [ ] Button disabled if selection contains compressed NFTs (not supported)
- [ ] Clicking opens VaultDialog or UnvaultDialog based on selection state
- [ ] Tooltip explains action or why disabled
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: Create VaultPage component with tabs

**Description:** As a user, I want to view my vaulted NFTs and manage them from a dedicated page.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/routes/vault.tsx`
- [ ] Page header with vault icon and title
- [ ] Display count of vaulted NFTs
- [ ] Use existing NftGrid component to display vaulted NFTs
- [ ] Selection mode works for selecting vaulted NFTs
- [ ] Action buttons for Unvault and Recover when NFTs selected
- [ ] Empty state when no vaulted NFTs
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: Handle multi-wallet authority scenarios

**Description:** As a user with multiple wallets, I need the app to handle wallet switching for vault operations.

**Acceptance Criteria:**

- [ ] Detect when delegate wallet is different from connected wallet
- [ ] Prompt user to switch to delegate wallet when needed for unlock operations
- [ ] Support operations where NFTs have different delegate wallets
- [ ] Group NFTs by delegate wallet and process in separate transactions
- [ ] Show clear messaging about which wallet needs to sign
- [ ] Typecheck passes

---

### US-015: Create vault transaction builder utilities

**Description:** As a developer, I need reusable utilities for building vault transactions that work with @solana/kit.

**Acceptance Criteria:**

- [ ] Create `apps/web/src/lib/vault-transactions.ts`
- [ ] `buildLockTransaction(nft, delegate, type)` - builds lock tx for any asset type
- [ ] `buildUnlockTransaction(nft)` - builds unlock tx for any asset type
- [ ] `buildRecoverTransaction(nft, destination)` - builds unlock + transfer tx
- [ ] All functions return transaction instructions compatible with @solana/kit
- [ ] Handle all asset types: Token Metadata, pNFT, Nifty, MPL Core
- [ ] Typecheck passes

---

### US-016: Integrate with existing NFT refresh flow

**Description:** As a user, I want vault status to update when NFT data refreshes.

**Acceptance Criteria:**

- [ ] When NFTs are fetched/refreshed, detect vault status from on-chain data
- [ ] Update vaultedMintsSetAtom based on frozen + delegate state
- [ ] Vault status persists correctly through page navigation
- [ ] Typecheck passes

## Functional Requirements

- FR-1: The system must support freezing NFTs using Token Metadata `lockV1` instruction
- FR-2: The system must support freezing pNFTs using `delegateUtilityV1` + `lockV1` instructions
- FR-3: The system must support freezing Nifty Assets using `approve` + `lock` instructions
- FR-4: The system must support freezing MPL Core assets using `addPluginV1` with FreezeDelegate
- FR-5: The system must support basic freeze where owner retains freeze authority
- FR-6: The system must support secure freeze where a different wallet is delegate
- FR-7: The system must support unlocking/thawing vaulted NFTs
- FR-8: The system must support recover (unlock + transfer) in a single transaction
- FR-9: The system must NOT support compressed NFTs (display clear error message)
- FR-10: The system must detect and display vaulted NFTs from on-chain state
- FR-11: The system must handle multi-signature scenarios for secure freeze/unfreeze
- FR-12: The system must use only @solana/kit and compatible SDKs (no @solana/web3.js)

## Non-Goals

- Vault notifications or alerts
- Automatic vaulting based on rules
- Vaulting compressed NFTs (not technically possible)
- Vaulting fungible tokens
- Time-locked vaults
- Multi-sig vaults beyond linked wallet delegation
- Vault history or activity log

## Design Considerations

- Follow existing design patterns from membership page and collection views
- Use shadcn Dialog component for vault/unvault/recover dialogs
- Use existing NftGrid component for displaying vaulted NFTs
- Vault badge should use teal color (#a6e3e0) matching legacy app
- Selection mode should work identically to other grid views
- Empty states should follow existing patterns

## Technical Considerations

- Must use `@solana/kit` for all Solana operations
- Use existing transaction utilities from `apps/web/src/lib/transaction.ts`
- Leverage existing hooks pattern (see `use-staking.ts`, `use-solana-actions.ts`)
- Use Jotai for state management following existing store patterns
- Asset type detection using account owner checks (similar to legacy implementation)
- Transaction batching for multiple NFTs using existing `packTx` pattern if available

**Asset Type Detection:**

- Token Metadata: Account owner is `SPL_TOKEN_PROGRAM_ID`
- Nifty Asset: Account owner is `ASSET_PROGRAM_ID` from `@nifty-oss/asset`
- MPL Core: Account owner is `MPL_CORE_PROGRAM_ID` from `@metaplex-foundation/mpl-core`

**Dependencies:**

- `@metaplex-foundation/mpl-token-metadata` - Token Metadata operations
- `@metaplex-foundation/mpl-core` - MPL Core operations
- `@nifty-oss/asset` - Nifty Asset operations
- `@metaplex-foundation/umi` - Transaction building

## Success Metrics

- Users can vault/unvault NFTs in under 3 clicks
- Vault status accurately reflects on-chain state
- Recover operation completes in a single transaction
- No transaction failures due to incorrect instruction building
- Clear error messages when operations cannot be performed

## Design Decisions

1. **No special confirmation for high-value NFTs** - The vault is intended for protecting valuable assets, so no extra friction
2. **No "vault all" quick action** - Too heavy; users should select specific NFTs
3. **Vaulted NFTs remain in main views with badge** - Not excluded from collection views, just display vault badge
