# PRD: NFT Lock State Detection

## Introduction

Fix inaccurate lock state detection for NFTs across different token standards. Currently, pNFTs always show as "frozen" because the code checks the SPL token account state, which is always frozen for pNFTs by design. The actual lock state for pNFTs is stored in the Token Record account. Similarly, Core, Nifty, and compressed NFTs each store lock state differently and need proper detection.

This causes two critical bugs:
1. **False positives in vault detection**: pNFTs appear vaulted when they're not
2. **Ghost reappearance after unvault**: After successfully unvaulting, the NFT disappears then reappears ~1s later because stale local data triggers re-detection

## Goals

- Accurately detect lock state for all NFT types (pNFTs, Core, Nifty, cNFTs)
- Fix the "item reappears after unvault" bug by refetching updated NFT data
- Minimize RPC calls using batch fetching (getMultipleAccounts with chunks of 1000)
- Use the existing generated SDK (`@biblio/solana-programs`) for account decoding
- Keep lock state detection on the backend (API) to enrich NFT data before sending to frontend

## User Stories

### US-001: Fetch Token Record state for pNFTs
**Description:** As a user, I want pNFTs to show accurate lock state so I know which ones are actually vaulted.

**Acceptance Criteria:**
- [ ] After fetching NFTs from Helius, identify all pNFTs (tokenStandard === "ProgrammableNonFungible" or "ProgrammableNonFungibleEdition")
- [ ] Derive Token Record PDA for each pNFT using: `seeds = ["metadata", TOKEN_METADATA_PROGRAM, mint, "token_record", tokenAccount]`
- [ ] Batch fetch Token Record accounts using `getMultipleAccounts` (chunks of 1000)
- [ ] Decode using `decodeTokenRecord` from `@biblio/solana-programs`
- [ ] Set `frozen = (tokenRecord.state === TokenState.Locked)`
- [ ] Preserve delegate info from Token Record if present
- [ ] Typecheck passes

### US-002: Verify Core asset lock state from Helius
**Description:** As a user, I want Core assets to show accurate lock state based on the FreezeDelegate plugin.

**Acceptance Criteria:**
- [ ] Verify Helius DAS returns FreezeDelegate plugin data for Core assets
- [ ] If Helius data is accurate, use it directly (current implementation)
- [ ] If Helius data is stale/inaccurate, implement on-chain fetch:
  - [ ] Fetch Core asset accounts using `getMultipleAccounts`
  - [ ] Decode plugin registry to find FreezeDelegate
  - [ ] Extract `frozen` boolean from FreezeDelegate plugin data
- [ ] Typecheck passes

### US-003: Detect Nifty asset lock state
**Description:** As a user, I want Nifty assets to show accurate lock state based on Lock delegate.

**Acceptance Criteria:**
- [ ] Identify Nifty assets (tokenStandard === "Nifty")
- [ ] Batch fetch Nifty asset accounts using `getMultipleAccounts`
- [ ] Decode using `@biblio/solana-programs` asset decoder
- [ ] Check if asset has Lock delegate role assigned
- [ ] Set `frozen = true` if Lock delegate exists
- [ ] Typecheck passes

### US-004: Verify compressed NFT lock state from Helius
**Description:** As a user, I want compressed NFTs to show accurate lock state.

**Acceptance Criteria:**
- [ ] Verify Helius DAS returns accurate `frozen` state for cNFTs from merkle tree data
- [ ] If accurate, no changes needed (cNFT state comes from Bubblegum merkle tree, DAS indexes this)
- [ ] Document any limitations with cNFT lock detection
- [ ] Typecheck passes

### US-005: Refetch NFT after successful unvault
**Description:** As a user, when I unvault an NFT, I want it to stay removed from the vault view without reappearing.

**Acceptance Criteria:**
- [ ] After successful unvault transaction confirmation, call new API endpoint to refetch single NFT
- [ ] API fetches fresh data from Helius DAS for that specific mint
- [ ] API enriches with on-chain lock state (Token Record for pNFTs, etc.)
- [ ] Frontend updates local NFT store with fresh data
- [ ] Fresh data has `frozen: false` and `delegate: null`, so vault detection doesn't re-add it
- [ ] NFT does not reappear in vault view after unvault
- [ ] Typecheck passes

### US-006: Create single NFT fetch endpoint
**Description:** As a developer, I need an API endpoint to fetch a single NFT with enriched lock state.

**Acceptance Criteria:**
- [ ] New endpoint: `GET /nfts/:mint`
- [ ] Fetches single asset from Helius DAS using `getAsset`
- [ ] Enriches with on-chain lock state based on token standard
- [ ] Returns same `DASAsset` shape as bulk fetch
- [ ] Typecheck passes

### US-007: Batch RPC calls efficiently
**Description:** As a developer, I want RPC calls to be batched efficiently to minimize latency.

**Acceptance Criteria:**
- [ ] Group NFTs by token standard before fetching lock state
- [ ] Use `getMultipleAccounts` with maximum 1000 accounts per call
- [ ] Fetch all token standards in parallel (Promise.all for pNFT, Core, Nifty batches)
- [ ] Total added latency should be ~1 RPC round trip for most users
- [ ] Typecheck passes

## Functional Requirements

- **FR-1:** The system must derive Token Record PDAs for all pNFTs and fetch their on-chain state
- **FR-2:** The system must decode Token Record accounts using the generated SDK's `getTokenRecordDecoder`
- **FR-3:** The system must set `frozen = (tokenRecord.state === TokenState.Locked)` for pNFTs
- **FR-4:** The system must preserve delegate information from Token Record for pNFTs
- **FR-5:** The system must verify Core asset lock state from Helius FreezeDelegate plugin data
- **FR-6:** The system must check Nifty assets for Lock delegate role to determine lock state
- **FR-7:** The system must batch account fetches using `getMultipleAccounts` with chunks of 1000
- **FR-8:** The system must fetch different token standard lock states in parallel
- **FR-9:** The system must provide an endpoint to refetch a single NFT with updated lock state
- **FR-10:** The frontend must call the single NFT refetch endpoint after successful unvault
- **FR-11:** The frontend must update local NFT store with refetched data to prevent ghost reappearance

## Non-Goals (Out of Scope)

- Adding vaulting support for new token standards (this PRD only fixes detection)
- Changing the vault detection logic on the frontend (it stays as-is, just receives accurate data)
- Real-time lock state updates via WebSocket (detection happens on NFT fetch)
- Caching lock state separately from NFT data
- Supporting legacy (non-pNFT) Token Metadata frozen state differently (already works)

## Technical Considerations

### Token Record PDA Derivation
```
seeds = [
  "metadata",
  TOKEN_METADATA_PROGRAM_ID,
  mint,
  "token_record",
  tokenAccount
]
```
Note: Need the token account address, which can be derived as the ATA for owner + mint.

### SDK Imports
```typescript
import {
  getTokenRecordDecoder,
  TokenState,
  type TokenRecord
} from "@biblio/solana-programs/token-metadata"

import {
  getAssetDecoder,
  // Nifty types
} from "@biblio/solana-programs/asset"
```

### Chunking Strategy
```typescript
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Fetch in chunks of 1000
const chunks = chunk(tokenRecordAddresses, 1000)
const results = await Promise.all(
  chunks.map(addresses => rpc.getMultipleAccounts(addresses).send())
)
```

### File Locations
- Lock state enrichment: `apps/api/src/services/das.ts`
- Single NFT endpoint: `apps/api/src/routes/nfts.ts`
- Frontend refetch call: `apps/web/src/components/vault/UnvaultDialog.tsx`
- NFT store update: `apps/web/src/stores/nfts.ts`

### Dependencies
- `@biblio/solana-programs` - Generated SDK with decoders
- `@solana/kit` - For `getMultipleAccounts`, address derivation

## Success Metrics

- pNFTs show accurate lock state (not always "frozen")
- Vault view only shows actually vaulted NFTs
- After unvault, NFT does not reappear in vault view
- Lock state enrichment adds < 500ms to NFT fetch (single RPC round trip)
- No increase in error rates from DAS service

## Open Questions

1. **cNFT Lock State**: Does Helius DAS return accurate frozen state for compressed NFTs from the merkle tree? Need to verify with a test cNFT.

2. **Nifty Asset Decoding**: Need to verify the exact account structure for Nifty assets and how Lock delegate is stored. Check generated SDK for available decoders.

3. **Token Account Derivation**: For pNFTs, we need the token account address to derive the Token Record PDA. Should we:
   - Derive ATA from owner + mint (assumes standard ATA)
   - Get token account from Helius response if available
   - Fetch token accounts separately if needed

4. **Core Plugin Decoding**: The Core asset base struct doesn't include plugins. Need to verify:
   - Does Helius return accurate plugin data?
   - If not, how to decode variable-length plugins from raw account data?

5. **Error Handling**: What should happen if Token Record fetch fails for some pNFTs?
   - Fall back to Helius data (potentially inaccurate)
   - Mark those NFTs with unknown lock state
   - Retry failed fetches
