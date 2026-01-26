# PRD: NFT Tagging

## Introduction

Allow users to organize their NFTs into custom tags for personal organization and efficient bulk actions. Tags are user-defined groups (e.g., "PFPs", "1/1s", "To Sell") that help manage large collections. Data syncs to the cloud so tags persist across devices.

This feature is separate from the existing "Starred" functionality, which remains a simple star/unstar toggle.

## Goals

- Allow users to create, edit, and delete custom tags with names and colors
- Enable bulk assignment of NFTs to one or more tags
- Provide a dedicated view for each tag showing all NFTs in that tag
- Support filtering the main NFT grid by tag
- Sync tag data to the backend for cross-device persistence
- Enable bulk actions (send, burn, vault) on tagged NFT groups

## User Stories

### US-001: Create tag API endpoints
**Description:** As a developer, I need backend endpoints to persist tags so they sync across devices.

**Acceptance Criteria:**
- [ ] POST `/api/user/tags` creates a new tag (name, color) and returns the tag with generated ID
- [ ] GET `/api/user/tags` returns all tags for the authenticated user
- [ ] PUT `/api/user/tags/:id` updates a tag's name or color
- [ ] DELETE `/api/user/tags/:id` deletes a tag and all its NFT associations
- [ ] Typecheck passes

### US-002: Create NFT-tag association API endpoints
**Description:** As a developer, I need endpoints to manage which NFTs belong to which tags.

**Acceptance Criteria:**
- [ ] PUT `/api/user/tags/:id/nfts` accepts `{ add: string[], remove: string[] }` to bulk update associations
- [ ] GET `/api/user/tags/:id/nfts` returns all NFT mints associated with a tag
- [ ] GET `/api/user/nft-tags` returns a map of `{ [mint]: tagId[] }` for all user's NFTs
- [ ] Typecheck passes

### US-003: Create tag management dialog
**Description:** As a user, I want to create and manage my tags so I can organize my NFTs.

**Acceptance Criteria:**
- [ ] "Manage Tags" button in sidebar opens a dialog
- [ ] Dialog shows list of existing tags with name, color indicator, and NFT count
- [ ] "New Tag" button opens inline form with name input and color picker
- [ ] Color picker shows 6-8 preset colors (no custom hex picker needed)
- [ ] Each tag row has edit (pencil) and delete (trash) buttons
- [ ] Delete shows confirmation before removing tag
- [ ] Typecheck passes
- [ ] Verify in browser

### US-004: Add tag button to toolbar
**Description:** As a user, I want to quickly tag selected NFTs from the toolbar.

**Acceptance Criteria:**
- [ ] "Tag" button appears in toolbar when NFTs are selected (next to Send, Burn, etc.)
- [ ] Button shows tag icon (e.g., lucide `Tag` or `Tags`)
- [ ] Clicking opens a dropdown/popover with list of tags
- [ ] Each tag shows checkbox indicating if ALL selected NFTs have that tag
- [ ] Each tag shows count of NFTs in that tag (e.g., "PFPs (12)")
- [ ] Checking a tag adds all selected NFTs to it
- [ ] Unchecking a tag removes all selected NFTs from it
- [ ] "New Tag" option at bottom opens create dialog
- [ ] Typecheck passes
- [ ] Verify in browser

### US-005: Display tags on NFT cards
**Description:** As a user, I want to see which tags an NFT belongs to at a glance.

**Acceptance Criteria:**
- [ ] NFT cards show small colored dots (max 3) in corner for assigned tags
- [ ] Hovering dots shows tooltip with tag names
- [ ] If more than 3 tags, show "+N" indicator
- [ ] Tags visible in all grid sizes (small, medium, large)
- [ ] Typecheck passes
- [ ] Verify in browser

### US-006: Add tags section to sidebar
**Description:** As a user, I want to navigate to a tag to see all NFTs in it.

**Acceptance Criteria:**
- [ ] "Tags" section in sidebar below existing navigation
- [ ] Shows list of user's tags with color indicator and name
- [ ] Clicking a tag navigates to `/tags/:id` route
- [ ] "Manage Tags" link at bottom opens management dialog
- [ ] Show "No tags yet" message with create prompt if user has no tags
- [ ] Typecheck passes
- [ ] Verify in browser

### US-007: Create tag detail page
**Description:** As a user, I want to view all NFTs in a specific tag.

**Acceptance Criteria:**
- [ ] Route `/tags/:id` shows CollectionView filtered to that tag's NFTs
- [ ] Page title shows tag name with color indicator
- [ ] Empty state shows "No NFTs in this tag" with prompt to add some
- [ ] All standard grid features work (selection, bulk actions, sorting)
- [ ] Tag-specific context passed to collage layout storage
- [ ] Typecheck passes
- [ ] Verify in browser

### US-008: Add tag filter to main views
**Description:** As a user, I want to filter my NFT grid by tag without navigating away.

**Acceptance Criteria:**
- [ ] Filter dropdown/chips in toolbar includes tag options
- [ ] Can select multiple tags (shows NFTs in ANY of the selected tags)
- [ ] "Untagged" filter option shows NFTs not in any tag
- [ ] Filter state persists in URL params (`?tags=id1,id2`)
- [ ] Typecheck passes
- [ ] Verify in browser

### US-009: Add "Add to tag" to NFT detail modal
**Description:** As a user, I want to manage tags for a single NFT from its detail view.

**Acceptance Criteria:**
- [ ] NFT detail modal shows "Tags" section
- [ ] Lists current tags as removable chips
- [ ] "Add tag" button shows dropdown of available tags
- [ ] Can add/remove tags without closing modal
- [ ] Typecheck passes
- [ ] Verify in browser

### US-010: Sync tags on app load
**Description:** As a user, I want my tags to load when I open the app.

**Acceptance Criteria:**
- [ ] On authenticated app load, fetch tags and nft-tag associations from API
- [ ] Store in Jotai atoms for reactive updates
- [ ] Handle loading state gracefully (don't flash empty tags)
- [ ] Handle unauthenticated users (tags feature hidden or disabled)
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Tags have a unique ID, name (max 30 chars), and color (from preset palette)
- FR-2: An NFT can belong to multiple tags (many-to-many relationship)
- FR-3: Deleting a tag removes all its NFT associations but does not affect the NFTs themselves
- FR-4: Tag names must be unique per user (case-insensitive)
- FR-5: Maximum 20 tags per user (can increase later if needed)
- FR-6: Tag data stored in User Durable Object alongside other user preferences
- FR-7: Optimistic UI updates with rollback on API failure
- FR-8: "Starred" remains a separate feature, not converted to a tag

## Non-Goals

- No drag-and-drop NFTs onto sidebar tags (complexity, not essential)
- No keyboard shortcuts for quick-tagging (can add later)
- No "smart tags" or auto-categorization rules
- No tag sharing between users
- No tag import/export
- No custom hex color picker (preset palette only)
- No tag icons or emojis (color + name is sufficient)

## Design Considerations

- Reuse existing `DropdownMenu` component for tag picker
- Reuse `Dialog` component for tag management
- Color palette: 8 colors that work in both light/dark mode
- Tag dots on cards should be subtle (4-6px diameter)
- Sidebar tags section collapses if user has no tags

**Suggested color palette:**
```
#ef4444 (red)
#f97316 (orange)
#eab308 (yellow)
#22c55e (green)
#06b6d4 (cyan)
#3b82f6 (blue)
#8b5cf6 (purple)
#ec4899 (pink)
```

## Technical Considerations

- Store tags in User DO: `tags: Tag[]` and `nftTags: Record<string, string[]>`
- Existing atoms in `stores/user.ts` can be extended for API sync
- Tag filtering combines with existing collection/search filters (AND logic)
- URL params for tag filter: `?tags=id1,id2` (comma-separated)
- Consider debouncing rapid tag toggle operations before API sync

## Success Metrics

- Users can create a tag and add NFTs to it in under 30 seconds
- Tags persist across browser refresh and different devices
- Bulk actions work correctly on tag-filtered views
- No regression in NFT grid performance with tag indicators

## Open Questions

None - all questions resolved.
