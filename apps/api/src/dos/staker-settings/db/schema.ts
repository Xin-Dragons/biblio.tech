import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

export const config = sqliteTable("config", {
  id: integer("id").primaryKey().default(1),
  staker: text("staker").notNull(),
  collections: text("collections").notNull(),
  emissions: text("emissions").notNull(),
  cachedAt: integer("cached_at").notNull(),
})
