import { sqliteTable, text, index } from "drizzle-orm/sqlite-core"

export const stakeRecords = sqliteTable(
  "stake_records",
  {
    nftMint: text("nft_mint").primaryKey(),
    owner: text("owner").notNull(),
    accountAddress: text("account_address").notNull(),
  },
  (table) => [
    index("idx_stake_records_owner").on(table.owner),
    index("idx_stake_records_account").on(table.accountAddress),
  ]
)

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})
