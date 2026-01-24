import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core"

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: integer("created_at").notNull(),
})

export const taggedNfts = sqliteTable(
  "tagged_nfts",
  {
    tagId: text("tag_id").notNull(),
    mint: text("mint").notNull(),
  },
  (table) => [primaryKey({ columns: [table.tagId, table.mint] }), index("idx_tagged_nfts_tag").on(table.tagId)]
)

export const starred = sqliteTable("starred", {
  mint: text("mint").primaryKey(),
  addedAt: integer("added_at").notNull(),
})

export const nftOrder = sqliteTable(
  "nft_order",
  {
    context: text("context").notNull(),
    mint: text("mint").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.context, table.mint] }), index("idx_nft_order_context").on(table.context)]
)

export const nftSizes = sqliteTable(
  "nft_sizes",
  {
    context: text("context").notNull(),
    mint: text("mint").notNull(),
    size: text("size").notNull(),
  },
  (table) => [primaryKey({ columns: [table.context, table.mint] }), index("idx_nft_sizes_context").on(table.context)]
)

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
  (table) => [primaryKey({ columns: [table.context, table.mint] }), index("idx_nft_layout_context").on(table.context)]
)

export const preferences = sqliteTable("preferences", {
  context: text("context").primaryKey(),
  layoutSize: text("layout_size"),
  showInfo: integer("show_info", { mode: "boolean" }),
  sort: text("sort"),
  lightMode: integer("light_mode", { mode: "boolean" }),
  payRoyalties: integer("pay_royalties", { mode: "boolean" }),
  showAllWallets: integer("show_all_wallets", { mode: "boolean" }),
})

export const wallets = sqliteTable("wallets", {
  publicKey: text("public_key").primaryKey(),
  nickname: text("nickname"),
  isMain: integer("is_main", { mode: "boolean" }).notNull().default(false),
  addedAt: integer("added_at").notNull(),
})

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})
