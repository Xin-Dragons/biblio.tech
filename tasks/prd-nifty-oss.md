# PRD: Nifty-OSS Asset Support

## Introduction

Add support for nifty-oss assets in the Biblio portfolio and staking features. Nifty-oss is a Solana asset standard that uses a single-account architecture (unlike token-based NFTs). These assets are not returned by DAS and require direct on-chain fetching via `getProgramAccounts`. Dandies collection includes nifty-oss NFTs that can be staked using the existing stake program's `stakeNifty`/`unstakeNifty` instructions.

## Goals

- Fetch nifty-oss assets by wallet in parallel with existing DAS fetching
- Display nifty assets in the portfolio with the same metadata format as DAS assets
- Group nifty assets by collection alongside existing collections
- Enable staking/unstaking of Dandies nifty assets on the stake page
- Generate a type-safe SDK for the nifty-oss asset program using Codama

## User Stories

### US-001: Fetch and store nifty-oss asset IDL
**Description:** As a developer, I need the nifty-oss asset program IDL in the project so I can generate a type-safe SDK.

**Acceptance Criteria:**
- [ ] Download IDL from `https://github.com/nifty-oss/asset/blob/main/idls/asset_program.json`
- [ ] Save to `packages/solana-programs/idls/asset.json`
- [ ] IDL contains program address `AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73`
- [ ] Typecheck passes

### US-002: Generate nifty-oss SDK with Codama
**Description:** As a developer, I need a generated SDK for the nifty-oss asset program so I can fetch and decode assets.

**Acceptance Criteria:**
- [ ] Update `packages/solana-programs/scripts/fetch-idls.ts` to include nifty-oss IDL source
- [ ] Update `packages/solana-programs/scripts/generate.ts` to include "asset" in PROGRAMS array
- [ ] Run `pnpm generate` successfully
- [ ] Generated files exist in `packages/solana-programs/src/generated/asset/`
- [ ] Export asset SDK from `packages/solana-programs/src/index.ts`
- [ ] Typecheck passes

### US-003: Create nifty asset fetching service
**Description:** As a developer, I need a backend service to fetch nifty-oss assets by owner wallet.

**Acceptance Criteria:**
- [ ] Create `apps/api/src/services/nifty.ts`
- [ ] Implement `getNiftyAssetsByOwner(wallet: string)` using `getProgramAccounts` with owner filter
- [ ] Decode assets using generated SDK
- [ ] Return assets with metadata matching DAS response format (name, image, collection, etc.)
- [ ] Typecheck passes

### US-004: Add nifty assets to NFT fetching endpoint
**Description:** As a user, I want to see my nifty-oss assets in my portfolio alongside my other NFTs.

**Acceptance Criteria:**
- [ ] Update `apps/api/src/routes/nfts.ts` GET `/by-owner/:wallet` endpoint
- [ ] Fetch DAS assets and nifty assets in parallel using `Promise.all`
- [ ] Merge nifty assets into response with `tokenStandard: 6` (Nifty)
- [ ] Group nifty assets by their `group` field (collection mint)
- [ ] Typecheck passes

### US-005: Display nifty assets in portfolio grid
**Description:** As a user, I want my nifty-oss NFTs to display in the portfolio grid with proper metadata.

**Acceptance Criteria:**
- [ ] Nifty assets appear in the NFT grid on `/nfts` page
- [ ] Nifty assets show name, image, and collection
- [ ] Nifty assets display "Nifty" badge indicator (similar to legacy app)
- [ ] Nifty assets are grouped under their collection on the `/` collections page
- [ ] Clicking a nifty asset opens the detail modal
- [ ] Typecheck passes
- [ ] Verify in browser that nifty assets display correctly

### US-006: Add nifty collection to collections page
**Description:** As a user, I want to see nifty-oss collections grouped on the collections page.

**Acceptance Criteria:**
- [ ] Nifty collections appear on `/` collections page
- [ ] Collection shows correct item count
- [ ] Fetch collection asset metadata separately (name, image) using collection mint address
- [ ] Batch collection metadata fetches to avoid RPC rate limits
- [ ] Clicking collection navigates to `/collection/:id` filtered view
- [ ] Ungrouped nifty assets shown in "Ungrouped" collection (same as DAS)
- [ ] Typecheck passes
- [ ] Verify in browser that nifty collections display correctly

### US-007: Support nifty asset staking
**Description:** As a Dandies holder with nifty assets, I want to stake my nifty Dandies to earn rewards.

**Acceptance Criteria:**
- [ ] Nifty Dandies (collection `BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF`) appear in stake page "Available to Stake" section
- [ ] Clicking "Stake" on a nifty Dandy uses `stakeNifty` instruction from stake SDK
- [ ] Transaction builds correctly with nifty program ID account
- [ ] Successful stake moves asset to "Staked" section
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Support nifty asset unstaking
**Description:** As a staker with nifty assets, I want to unstake my nifty Dandies when needed.

**Acceptance Criteria:**
- [ ] Staked nifty Dandies appear in stake page "Staked" section
- [ ] Clicking "Unstake" on a staked nifty Dandy uses `unstakeNifty` instruction from stake SDK
- [ ] Transaction builds correctly with nifty program ID account
- [ ] Successful unstake moves asset back to "Available" section
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The system must fetch nifty-oss assets using `getProgramAccounts` with owner field filter
- FR-2: The system must decode nifty assets using the generated Codama SDK
- FR-3: The system must fetch nifty assets in parallel with DAS assets (not sequentially)
- FR-4: The system must merge nifty assets into the unified NFT response with `tokenStandard: 6`
- FR-5: The system must extract collection info from nifty asset `group` field
- FR-6: The system must use `stakeNifty` instruction when staking a nifty asset
- FR-7: The system must use `unstakeNifty` instruction when unstaking a nifty asset
- FR-8: The system must pass nifty program ID (`AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73`) as account in stake transactions

## Non-Goals

- No support for creating/minting nifty-oss assets
- No support for burning/transferring nifty assets (future scope)
- No support for nifty asset extensions (attributes, royalties, etc.) in this phase
- No indexing or caching of nifty assets (direct RPC fetch only)

## Design Considerations

- Nifty assets display with a "Nifty" badge indicator (like legacy app)
- Use existing NFT card component with same layout
- Collection grouping should work identically to DAS collections
- Ungrouped nifty assets handled same as ungrouped DAS NFTs
- Staking UI should handle both asset types seamlessly

## Technical Considerations

### Program IDs
- Nifty Asset Program: `AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73`
- Dandies Nifty Collection: `BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF`
- Stake Program: `STAKEQkGBjkhCXabzB5cUbWgSSvbVJFEm2oEnyWzdKE`

### Asset Fetching Pattern
```typescript
// Using getProgramAccounts with memcmp filter for owner
const assets = await rpc.getProgramAccounts(NIFTY_PROGRAM_ID, {
  filters: [
    { memcmp: { offset: OWNER_OFFSET, bytes: walletAddress } }
  ]
})
```

### Metadata Mapping
Nifty asset fields map to DAS format:
- `name` -> `content.metadata.name`
- `uri` -> `content.json_uri` (fetch for image)
- `group` -> `grouping[0].group_value` (collection)
- `owner` -> `ownership.owner`

### Staking Differences
The stake program has separate instructions:
- `stakeCore` / `unstakeCore` - for Metaplex Core assets
- `stakeNifty` / `unstakeNifty` - for nifty-oss assets
- Must detect asset type and use correct instruction

### Files to Create/Modify

**Create:**
- `packages/solana-programs/idls/asset.json` - Nifty IDL
- `apps/api/src/services/nifty.ts` - Nifty asset fetching service

**Modify:**
- `packages/solana-programs/scripts/fetch-idls.ts` - Add nifty IDL source
- `packages/solana-programs/scripts/generate.ts` - Add "asset" to PROGRAMS
- `packages/solana-programs/src/index.ts` - Export asset SDK
- `apps/api/src/routes/nfts.ts` - Parallel fetch nifty with DAS
- `apps/web/src/hooks/use-staking.ts` - Handle stakeNifty/unstakeNifty

## Success Metrics

- Nifty assets load within 2 seconds of portfolio page
- No visual difference between nifty and DAS assets in grid
- Staking nifty Dandies succeeds on first attempt
- Zero type errors from nifty integration

## Resolved Decisions

1. **Collection metadata**: Fetch separately using collection mint address, batch requests to avoid rate limits
2. **Ungrouped assets**: Handle same as ungrouped DAS NFTs (show in "Ungrouped" collection)
3. **Nifty badge**: Yes, display "Nifty" badge on asset cards (like legacy app)
