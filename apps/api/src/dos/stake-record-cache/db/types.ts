import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite"
import type * as schema from "./schema"

export type StakeRecordCacheDB = DrizzleSqliteDODatabase<typeof schema>

export type StakeRecordRow = typeof schema.stakeRecords.$inferSelect
export type NewStakeRecordRow = typeof schema.stakeRecords.$inferInsert

export type Meta = typeof schema.meta.$inferSelect
export type NewMeta = typeof schema.meta.$inferInsert
