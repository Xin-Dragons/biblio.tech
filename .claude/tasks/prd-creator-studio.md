# PRD: Creator Studio

## Introduction

Creator Studio is a comprehensive NFT creation and management toolset within Biblio, enabling users to mint, update, and batch-manage digital assets across all major Solana NFT standards. This feature replaces the legacy "NFT Suite" with a modern implementation using exclusively `@solana/kit` and Kinobi-generated clients for Core Assets, pNFTs (Metaplex Token Metadata), and Nifty Assets.

The toolset will be accessible via a new "Tools" subsection in the sidebar navigation.

## Goals

- Provide full-featured NFT creation supporting Core, pNFT, and Nifty asset standards
- Enable single and batch NFT metadata updates with authority validation
- Support batch operations via collection lookup, creator lookup, or hashlist input
- Upload media to Arweave via Irys for permanent decentralized storage
- Use only `@solana/kit` - zero tolerance for `@solana/web3.js` or legacy Metaplex libraries
- Maintain feature parity with the legacy Biblio NFT Suite

## User Stories

### US-001: Add Tools section to sidebar navigation
**Description:** As a user, I want to access Creator Studio from a dedicated Tools section so that creation tools are organized separately from wallet management.

**Acceptance Criteria:**
- [ ] New "Tools" section appears in sidebar below wallet navigation
- [ ] "Creator Studio" link within Tools section
- [ ] Route `/tools/creator-studio` renders the Creator Studio page
- [ ] Tools section is visually distinct (different heading style or separator)
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-002: Create Creator Studio page layout
**Description:** As a user, I want a clean Creator Studio interface with tabs for Create, Update, and Batch operations so I can easily switch between different workflows.

**Acceptance Criteria:**
- [ ] Page has three main tabs: Create, Update, Batch
- [ ] Tab state persists in URL (e.g., `/tools/creator-studio?tab=create`)
- [ ] Responsive layout with form on left, preview on right (stacked on mobile)
- [ ] Consistent styling with existing Biblio UI patterns
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-003: Implement asset standard selector
**Description:** As a user, I want to choose which NFT standard to use (Core, pNFT, or Nifty) so I can create assets in my preferred format.

**Acceptance Criteria:**
- [ ] Radio button group or segmented control for standard selection
- [ ] Options: "Core Asset", "pNFT (Metaplex)", "Nifty Asset"
- [ ] Selection affects available form fields (e.g., rule sets only for pNFT)
- [ ] Default selection is "Core Asset"
- [ ] Selection persists when switching tabs
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-004: Implement image upload with Irys/Arweave
**Description:** As a user, I want to upload images that are permanently stored on Arweave so my NFT media is decentralized and immutable.

**Acceptance Criteria:**
- [ ] File picker accepts jpg, png, gif (max 20MB)
- [ ] Image preview displays after selection
- [ ] Upload to Arweave via Irys on form submission
- [ ] Progress indicator during upload
- [ ] Uploaded URI stored and used in metadata
- [ ] Error handling for failed uploads with retry option
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-005: Implement multimedia upload support
**Description:** As a user, I want to upload video, audio, or 3D models as NFT content so I can create rich media NFTs.

**Acceptance Criteria:**
- [ ] Separate file picker for multimedia (animation_url)
- [ ] Accepts: mp4, mov, mp3, flac, wav, glb, gltf
- [ ] Appropriate preview based on type (video player, audio player, model-viewer)
- [ ] Sets correct `properties.category` in metadata (video, audio, vr)
- [ ] Adds file to `properties.files` array
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-006: Implement Create NFT form - basic fields
**Description:** As a user, I want to fill out basic NFT metadata so I can create a properly configured NFT.

**Acceptance Criteria:**
- [ ] Name field (required, max 32 chars)
- [ ] Symbol field (required, max 10 chars)
- [ ] Description field (textarea, required)
- [ ] External URL / Website field (optional, URL validation)
- [ ] Form validation with clear error messages
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-007: Implement royalties and creators configuration
**Description:** As a user, I want to set royalties and configure creator splits so I receive secondary sale revenue.

**Acceptance Criteria:**
- [ ] Royalties percentage field (0-100%, stored as basis points)
- [ ] Dynamic creator list with add/remove buttons
- [ ] Each creator has: address field, share percentage field, verified indicator
- [ ] Connected wallet auto-populated as first creator with 100% share
- [ ] Validation: shares must sum to exactly 100
- [ ] Validation: addresses must be valid Solana public keys
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-008: Implement attributes/traits editor
**Description:** As a user, I want to add trait_type/value attribute pairs so my NFT has searchable properties.

**Acceptance Criteria:**
- [ ] Dynamic attribute list with add/remove buttons
- [ ] Each attribute has: trait_type field, value field
- [ ] Empty attributes filtered out before submission
- [ ] At least one empty row always present for adding
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-009: Implement collection assignment
**Description:** As a user, I want to assign my NFT to a collection so it's properly grouped with related assets.

**Acceptance Criteria:**
- [ ] Collection address text field with validation
- [ ] "Choose Collection" button opens NFT picker modal
- [ ] Modal shows only collection NFTs owned by user
- [ ] Validates user is update authority of selected collection
- [ ] Auto-verifies collection if user has authority
- [ ] Clear error messages for authority mismatches
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-010: Implement pNFT-specific options
**Description:** As a user creating a pNFT, I want to configure rule sets so I can control transfer restrictions.

**Acceptance Criteria:**
- [ ] Only visible when pNFT standard selected
- [ ] Rule set selector: Metaplex, Compatibility, None, Custom
- [ ] Custom option shows address input field
- [ ] Validation for custom rule set address
- [ ] Displays current Metaplex rule set addresses as reference
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-011: Implement Nifty-specific options
**Description:** As a user creating a Nifty asset, I want to configure Nifty-specific parameters.

**Acceptance Criteria:**
- [ ] Only visible when Nifty standard selected
- [ ] Standard field (NonFungible, NonFungibleEdition, etc.)
- [ ] Appropriate Nifty metadata fields
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-012: Implement mutable/immutable toggle
**Description:** As a user, I want to choose whether my NFT is mutable so I can lock it from future changes if desired.

**Acceptance Criteria:**
- [ ] Toggle switch for mutability
- [ ] Default is mutable (on)
- [ ] Warning message when setting to immutable
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-013: Implement collection NFT creation mode
**Description:** As a user, I want to create Collection NFTs so I can group my assets under a verified collection.

**Acceptance Criteria:**
- [ ] "Create as Collection NFT" toggle
- [ ] When enabled: hides attributes, hides collection assignment
- [ ] Sets collectionDetails on the NFT
- [ ] Royalties hidden/zeroed for collection NFTs
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-014: Implement "Create Many" batch minting
**Description:** As a user, I want to mint multiple identical NFTs at once so I can efficiently create editions or drops.

**Acceptance Criteria:**
- [ ] "Create Many" toggle
- [ ] Quantity input field (appears when enabled)
- [ ] Hides custom keypair option when enabled
- [ ] Transactions batched efficiently (50 per batch)
- [ ] Progress indicator showing minted/total
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-015: Implement custom keypair/vanity address support
**Description:** As a user, I want to upload a custom keypair so I can use a vanity token address.

**Acceptance Criteria:**
- [ ] Token address field shows generated/uploaded address
- [ ] "Respin" button generates new random keypair
- [ ] "Upload Keypair" button accepts JSON keypair file
- [ ] Validates keypair hasn't been used (account doesn't exist)
- [ ] Error message if keypair already in use
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-016: Implement NFT preview component
**Description:** As a user, I want to see a live preview of my NFT as I fill out the form so I can verify appearance before minting.

**Acceptance Criteria:**
- [ ] Shows image/multimedia preview
- [ ] Displays name, description
- [ ] Shows attributes in card format
- [ ] Updates in real-time as form changes
- [ ] Handles missing/loading states gracefully
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-017: Implement Create NFT transaction - Core Asset
**Description:** As a user, I want to mint a Core Asset NFT so I can create assets using the latest standard.

**Acceptance Criteria:**
- [ ] Uses Kinobi-generated Core Asset client
- [ ] Constructs proper create instruction
- [ ] Handles collection verification if applicable
- [ ] Shows transaction confirmation toast
- [ ] Refreshes NFT list after successful mint
- [ ] Error handling with descriptive messages
- [ ] Typecheck passes
- [ ] Verify in browser by minting a Core Asset

---

### US-018: Implement Create NFT transaction - pNFT
**Description:** As a user, I want to mint a pNFT so I can create royalty-enforced assets.

**Acceptance Criteria:**
- [ ] Uses Kinobi-generated Token Metadata client
- [ ] Calls createProgrammableNft equivalent
- [ ] Includes rule set configuration
- [ ] Handles collection verification
- [ ] Shows transaction confirmation toast
- [ ] Typecheck passes
- [ ] Verify in browser by minting a pNFT

---

### US-019: Implement Create NFT transaction - Nifty Asset
**Description:** As a user, I want to mint a Nifty Asset so I can create Nifty-standard NFTs.

**Acceptance Criteria:**
- [ ] Uses Kinobi-generated Nifty client
- [ ] Constructs proper Nifty create instruction
- [ ] Handles Nifty-specific metadata
- [ ] Shows transaction confirmation toast
- [ ] Typecheck passes
- [ ] Verify in browser by minting a Nifty Asset

---

### US-020: Implement Update NFT - NFT selection
**Description:** As a user, I want to select an NFT to update so I can modify its metadata.

**Acceptance Criteria:**
- [ ] Token address input field with validation
- [ ] "Choose NFT" button opens picker showing user's created NFTs
- [ ] Fetches and displays current NFT metadata on selection
- [ ] Validates user is update authority
- [ ] Clear error for authority mismatch with connected wallet suggestion
- [ ] Detects asset standard automatically
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-021: Implement Update NFT form
**Description:** As a user, I want to modify NFT metadata fields so I can update my asset's information.

**Acceptance Criteria:**
- [ ] Pre-populates all fields with current values
- [ ] Same fields as Create form (name, symbol, description, etc.)
- [ ] Tracks dirty state - only enables Update button when changes exist
- [ ] Cancel button resets to original values
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-022: Implement Update NFT - change collection
**Description:** As a user, I want to change which collection my NFT belongs to.

**Acceptance Criteria:**
- [ ] Unverifies old collection if verified and user has authority
- [ ] Sets new collection reference
- [ ] Verifies new collection if user has authority
- [ ] Handles case where user lacks authority for old collection
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-023: Implement Update NFT - transfer update authority
**Description:** As a user, I want to transfer update authority to another wallet.

**Acceptance Criteria:**
- [ ] Update authority address field
- [ ] Validates new address is valid public key
- [ ] Validates new address is a wallet (not program)
- [ ] Warning about irreversibility
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-024: Implement Update NFT transaction
**Description:** As a user, I want to submit my NFT updates on-chain.

**Acceptance Criteria:**
- [ ] Uploads new image/multimedia if changed
- [ ] Uploads new JSON metadata if any metadata changed
- [ ] Constructs update instruction for detected asset standard
- [ ] Handles all field updates in single transaction where possible
- [ ] Shows confirmation toast
- [ ] Refreshes NFT data after update
- [ ] Typecheck passes
- [ ] Verify in browser by updating an NFT

---

### US-025: Implement Batch - NFT lookup by collection
**Description:** As a user, I want to load NFTs by collection address so I can batch update an entire collection.

**Acceptance Criteria:**
- [ ] Radio button to select "Certified Collection" lookup mode
- [ ] Collection address input field
- [ ] Lookup button fetches all NFTs in collection
- [ ] Displays count of NFTs found
- [ ] Progress indicator during fetch
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-026: Implement Batch - NFT lookup by first verified creator
**Description:** As a user, I want to load NFTs by creator address so I can batch update assets I created.

**Acceptance Criteria:**
- [ ] Radio button to select "First Verified Creator" lookup mode
- [ ] Creator address input field
- [ ] Lookup button fetches all NFTs with matching FVC
- [ ] Displays count of NFTs found
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-027: Implement Batch - NFT lookup by hashlist
**Description:** As a user, I want to paste a JSON hashlist so I can batch update specific NFTs.

**Acceptance Criteria:**
- [ ] Radio button to select "Hashlist" lookup mode
- [ ] Textarea for JSON array of mint addresses
- [ ] Validates JSON format
- [ ] Validates each address is valid public key
- [ ] Fetches NFT data for all addresses
- [ ] Error handling for invalid/missing mints
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-028: Implement Batch - filter controls
**Description:** As a user, I want to filter loaded NFTs by creator, royalties, or update authority so I can target specific subsets.

**Acceptance Criteria:**
- [ ] Filter dropdown for creator (shows unique creators from loaded NFTs)
- [ ] Filter dropdown for royalties (shows unique percentages)
- [ ] Filter dropdown for update authority (shows unique authorities)
- [ ] Filters can be combined
- [ ] Shows filtered count vs total count
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-029: Implement Batch - NFT list display
**Description:** As a user, I want to see the list of NFTs that will be affected so I can verify before executing.

**Acceptance Criteria:**
- [ ] Grid/list of NFT thumbnails and names
- [ ] Shows which NFTs will be updated (highlighted or separate section)
- [ ] Shows completion status during batch operation
- [ ] Virtualized list for performance with large collections
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-030: Implement Batch - global updates (royalties, creators, update authority)
**Description:** As a user, I want to update royalties, creators, or update authority across all selected NFTs.

**Acceptance Criteria:**
- [ ] Accordion section for "Global Updates"
- [ ] Only enabled when user is update authority
- [ ] Royalties field with validation
- [ ] Creators list editor (with mismatch warning if inconsistent)
- [ ] Update authority field
- [ ] Warning about overwriting individual configurations
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-031: Implement Batch - find and replace creators
**Description:** As a user, I want to swap one creator address for another across NFTs so I can update creator wallets.

**Acceptance Criteria:**
- [ ] Accordion section for "Find and Replace Creators"
- [ ] Dynamic list of find/replace pairs
- [ ] Find dropdown shows only unverified creators or connected wallet
- [ ] Replace field for new address
- [ ] Only updates NFTs containing the "find" address
- [ ] Preserves share percentages
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-032: Implement Batch - add to certified collection
**Description:** As a user, I want to add multiple NFTs to a collection at once.

**Acceptance Criteria:**
- [ ] Accordion section for "Certified Collection"
- [ ] Collection address field with picker
- [ ] Shows count of NFTs not yet in collection
- [ ] Handles unverifying old collection if needed
- [ ] Verifies new collection if user has authority
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-033: Implement Batch - verify/unverify creator
**Description:** As a user who is a creator on NFTs, I want to batch verify or unverify my creator status.

**Acceptance Criteria:**
- [ ] Accordion section for "Verify Creator" (enabled if user is unverified creator)
- [ ] Accordion section for "Unverify Creator" (enabled if user is verified creator)
- [ ] Shows count of NFTs to be signed/unsigned
- [ ] Executes verify/unverify instructions in batches
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-034: Implement Batch - pNFT rule set updates
**Description:** As a user, I want to batch update rule sets across pNFTs.

**Acceptance Criteria:**
- [ ] Accordion section for "pNFT Config"
- [ ] Only enabled for pNFT collections
- [ ] Rule set selector (Metaplex, Compatibility, None, Custom)
- [ ] Shows count of NFTs with different rule sets
- [ ] Requires token account lookup for each NFT
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-035: Implement batch transaction execution
**Description:** As a user, I want batch operations to execute efficiently with progress feedback.

**Acceptance Criteria:**
- [ ] Groups instructions into optimal transaction sizes
- [ ] Batches transactions (50 at a time for network limits)
- [ ] Progress indicator showing completed/total
- [ ] Handles partial failures gracefully
- [ ] Retry option for failed transactions
- [ ] Summary of results on completion
- [ ] Typecheck passes
- [ ] Verify in browser

---

### US-036: Implement secret key signer option for batch
**Description:** As a power user, I want to paste a secret key for faster batch signing without wallet popups.

**Acceptance Criteria:**
- [ ] Optional secret key input field in batch view
- [ ] Accepts base58 encoded secret key
- [ ] Validates key format
- [ ] Uses key for signing instead of wallet adapter
- [ ] Clear warning about security implications
- [ ] Key never leaves client, never stored
- [ ] Typecheck passes
- [ ] Verify in browser

---

## Functional Requirements

- FR-1: The system must support creating NFTs in Core Asset, pNFT, and Nifty standards
- FR-2: The system must upload media files to Arweave via Irys before minting
- FR-3: The system must validate user is update authority before allowing updates
- FR-4: The system must use only `@solana/kit` and Kinobi-generated clients (no web3.js)
- FR-5: The system must batch transactions efficiently (max 50 concurrent)
- FR-6: The system must handle collection verification/unverification automatically
- FR-7: The system must validate all addresses as valid Solana public keys
- FR-8: The system must validate creator shares sum to exactly 100
- FR-9: The system must detect asset standard automatically when updating
- FR-10: The system must preserve existing metadata when only updating specific fields

## Non-Goals

- Token/fungible asset creation (separate feature)
- Candy Machine / drop management (separate feature)
- Compressed NFT support (future enhancement)
- On-chain attribute storage for Core Assets (uses off-chain JSON)
- Automatic royalty collection/distribution
- NFT burning (exists elsewhere in app)
- NFT transfers (exists elsewhere in app)

## Design Considerations

- Reuse existing NFT card components for preview and selection
- Reuse existing dialog patterns for NFT picker modal
- Follow existing form styling patterns from settings pages
- Use existing toast system for feedback
- Tab navigation should match existing UI patterns (if any)
- Consider mobile-first for form layout

## Technical Considerations

- Kinobi-generated clients should be in `packages/` or imported from npm
- Irys upload requires SOL for storage fees - show cost estimate
- Large batch operations may require chunked DAS queries
- pNFT updates require token account lookup (owner snapshot)
- Transaction simulation before sending for better error messages
- Consider caching fetched NFT data to avoid re-fetching

## Success Metrics

- Users can create NFTs in all three standards within 2 minutes
- Batch updates of 1000 NFTs complete within 10 minutes
- Zero usage of `@solana/web3.js` in implementation
- Feature parity with legacy NFT Suite confirmed via checklist

## Open Questions

1. Should we add a "Templates" feature to save/reuse common configurations?
2. Should batch operations support scheduling/queuing for very large collections?
3. Do we need an "undo" feature for recent changes (within same session)?
4. Should we integrate with existing tag system for organizing created NFTs?
