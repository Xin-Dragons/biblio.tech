import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite"
import type * as schema from "./schema"

export type StakerSettingsDB = DrizzleSqliteDODatabase<typeof schema>

export type Config = typeof schema.config.$inferSelect
export type NewConfig = typeof schema.config.$inferInsert
