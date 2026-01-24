import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite"
import type * as schema from "./schema"

export type StakeRecordsDB = DrizzleSqliteDODatabase<typeof schema>

export type StakeRecord = typeof schema.stakeRecords.$inferSelect
export type NewStakeRecord = typeof schema.stakeRecords.$inferInsert

export type Meta = typeof schema.meta.$inferSelect
export type NewMeta = typeof schema.meta.$inferInsert
