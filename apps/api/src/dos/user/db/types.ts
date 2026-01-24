import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite"
import type * as schema from "./schema"

export type UserDB = DrizzleSqliteDODatabase<typeof schema>

export type Tag = typeof schema.tags.$inferSelect
export type NewTag = typeof schema.tags.$inferInsert

export type TaggedNft = typeof schema.taggedNfts.$inferSelect
export type NewTaggedNft = typeof schema.taggedNfts.$inferInsert

export type Starred = typeof schema.starred.$inferSelect
export type NewStarred = typeof schema.starred.$inferInsert

export type NftOrder = typeof schema.nftOrder.$inferSelect
export type NewNftOrder = typeof schema.nftOrder.$inferInsert

export type NftSize = typeof schema.nftSizes.$inferSelect
export type NewNftSize = typeof schema.nftSizes.$inferInsert

export type NftLayout = typeof schema.nftLayout.$inferSelect
export type NewNftLayout = typeof schema.nftLayout.$inferInsert

export type Preferences = typeof schema.preferences.$inferSelect
export type NewPreferences = typeof schema.preferences.$inferInsert

export type Wallet = typeof schema.wallets.$inferSelect
export type NewWallet = typeof schema.wallets.$inferInsert

export type Meta = typeof schema.meta.$inferSelect
export type NewMeta = typeof schema.meta.$inferInsert
