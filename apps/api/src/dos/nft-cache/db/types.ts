import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite"
import type * as schema from "./schema"

export type NftCacheDB = DrizzleSqliteDODatabase<typeof schema>

export type Nft = typeof schema.nfts.$inferSelect
export type NewNft = typeof schema.nfts.$inferInsert

export type Collection = typeof schema.collections.$inferSelect
export type NewCollection = typeof schema.collections.$inferInsert

export type Meta = typeof schema.meta.$inferSelect
export type NewMeta = typeof schema.meta.$inferInsert
