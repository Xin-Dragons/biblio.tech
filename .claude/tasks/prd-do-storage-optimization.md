# PRD: Durable Object Storage Optimization

## Overview

Refactor Durable Objects to use proper SQL storage patterns and fix architectural issues discovered during audit. No existing data to preserve - clean rewrite.

## Problems to Fix

### 1. UserDO - Large Blob Storage (CRITICAL)

Currently stores large arrays as single KV blobs:

| Key                 | Data                     | Problem                      |
| ------------------- | ------------------------ | ---------------------------- |
| `starred`           | `string[]`               | Could hit 128KB limit        |
| `tagged:${tagId}`   | `string[]`               | Per-tag blobs grow large     |
| `order:${context}`  | `Record<string, number>` | Full rewrite on every change |
| `sizes:${context}`  | `Record<string, string>` | Full rewrite on every change |
| `layout:${context}` | `Array<{i,x,y,w,h}>`     | Full rewrite on every change |

**Fix:** Migrate to SQL tables like other DOs.

### 2. VotingDO - Unbounded Growth (CRITICAL)

```typescript
votes: VoteRecord[]  // Grows forever, never read
```

**Fix:** Remove the votes array, just keep `total` count.

### 3. UserDO - No Input Validation (HIGH)

- No validation on tag names, colors, context strings
- No limits on array sizes
- Could pollute storage with arbitrary keys

**Fix:** Add validation and limits.

### 4. RpcWebSocketDO - Debug Logging (LOW)

Excessive `console.log` in production.

**Fix:** Remove debug logs.

## Solution

### US-001: Rewrite UserDO with SQL

Create `apps/api/src/dos/user/` with proper Drizzle schema.

**Schema:**

```typescript
// Tags
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at").notNull(),
})

// Tagged NFTs
export const taggedNfts = sqliteTable(
  "tagged_nfts",
  {
    tagId: text("tag_id").notNull(),
    mint: text("mint").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tagId, table.mint] }), index("idx_tagged_by_tag").on(table.tagId)]
)

// Starred
export const starred = sqliteTable("starred", {
  mint: text("mint").primaryKey(),
  addedAt: integer("added_at").notNull(),
})

// Order
export const nftOrder = sqliteTable(
  "nft_order",
  {
    context: text("context").notNull(),
    mint: text("mint").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.context, table.mint] }), index("idx_order_by_context").on(table.context)]
)

// Sizes
export const nftSizes = sqliteTable(
  "nft_sizes",
  {
    context: text("context").notNull(),
    mint: text("mint").notNull(),
    size: text("size").notNull(),
  },
  (table) => [primaryKey({ columns: [table.context, table.mint] }), index("idx_sizes_by_context").on(table.context)]
)

// Layout
export const nftLayout = sqliteTable(
  "nft_layout",
  {
    context: text("context").notNull(),
    mint: text("mint").notNull(),
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    w: integer("w").notNull(),
    h: integer("h").notNull(),
  },
  (table) => [primaryKey({ columns: [table.context, table.mint] }), index("idx_layout_by_context").on(table.context)]
)

// Preferences
export const preferences = sqliteTable("preferences", {
  context: text("context").primaryKey(),
  layoutSize: text("layout_size"),
  showInfo: integer("show_info", { mode: "boolean" }),
  sort: text("sort"),
  lightMode: integer("light_mode", { mode: "boolean" }),
  payRoyalties: integer("pay_royalties", { mode: "boolean" }),
  showAllWallets: integer("show_all_wallets", { mode: "boolean" }),
})

// Wallets
export const wallets = sqliteTable("wallets", {
  publicKey: text("public_key").primaryKey(),
  nickname: text("nickname"),
  isMain: integer("is_main", { mode: "boolean" }).notNull().default(false),
  addedAt: integer("added_at").notNull(),
})

// KV-style meta for simple values (username, dandies, showcase)
export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})
```

**Acceptance Criteria:**

- New `user/` directory with schema, types, drizzle.config, migrations
- UserDO uses Drizzle for all operations
- Same HTTP API (no breaking changes to callers)
- Typecheck passes

### US-002: Fix VotingDO

Remove unbounded `votes` array storage.

**Before:**

```typescript
interface ShowcaseVotes {
  total: number
  votes: VoteRecord[] // Remove this
}
```

**After:**

```typescript
interface ShowcaseVotes {
  total: number
}
```

**Acceptance Criteria:**

- Remove VoteRecord interface
- Remove votes array from storage
- All vote/count endpoints still work
- Typecheck passes

### US-003: Add Input Validation to UserDO

Add validation constants and checks:

```typescript
const LIMITS = {
  MAX_TAGS: 100,
  MAX_TAG_NAME: 50,
  MAX_CONTEXT: 100,
  MAX_STARRED: 5000,
  MAX_TAGGED_PER_TAG: 5000,
  MAX_WALLETS: 20,
} as const

const CONTEXT_REGEX = /^[a-zA-Z0-9_-]+$/
```

**Acceptance Criteria:**

- All inputs validated before storage operations
- Invalid input returns 400 with error message
- Limits enforced on array sizes

### US-004: Remove Debug Logging

Remove `console.log` calls from `RpcWebSocketDO`.

**Acceptance Criteria:**

- No `console.log` in production code
- Keep `console.error` for actual errors

## Implementation Order

1. US-001 (UserDO rewrite) - Biggest impact
2. US-002 (VotingDO fix) - Quick fix
3. US-003 (Validation) - Can add during US-001
4. US-004 (Logging) - Trivial

## Files Changed

**New:**

- `apps/api/src/dos/user/index.ts`
- `apps/api/src/dos/user/db/schema.ts`
- `apps/api/src/dos/user/db/types.ts`
- `apps/api/src/dos/user/db/drizzle.config.ts`
- `apps/api/src/dos/user/db/index.ts`
- `apps/api/src/dos/user/db/migrations/0000_initial.sql`
- `apps/api/src/dos/user/db/migrations/migrations.js`

**Modified:**

- `apps/api/src/dos/voting.ts`
- `apps/api/src/dos/rpc-websocket.ts`

**Deleted:**

- `apps/api/src/dos/user.ts`
