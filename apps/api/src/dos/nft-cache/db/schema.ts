import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const nfts = sqliteTable(
  "nfts",
  {
    mint: text("mint").primaryKey(),
    name: text("name").notNull(),
    image: text("image").notNull(),
    collectionId: text("collection_id").notNull(),
    collectionName: text("collection_name"),
    attributes: text("attributes").notNull(),
    frozen: integer("frozen", { mode: "boolean" }).notNull().default(false),
    delegate: text("delegate"),
    compressed: integer("compressed", { mode: "boolean" }).notNull().default(false),
    tokenStandard: text("token_standard").notNull(),
  },
  (table) => [index("idx_nfts_collection").on(table.collectionId)]
)

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  numMints: integer("num_mints").notNull().default(0),
})

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: integer("value").notNull(),
})
