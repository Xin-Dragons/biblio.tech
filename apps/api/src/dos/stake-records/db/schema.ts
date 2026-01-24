import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"

export const stakeRecords = sqliteTable(
  "stake_records",
  {
    address: text("address").primaryKey(),
    staker: text("staker").notNull(),
    owner: text("owner").notNull(),
    nftMint: text("nft_mint").notNull(),
    stakedAt: integer("staked_at").notNull(),
    pendingClaim: integer("pending_claim").notNull(),
    canClaimAt: integer("can_claim_at").notNull(),
    solBalance: integer("sol_balance").notNull(),
    emissions: text("emissions").notNull(),
    bump: integer("bump").notNull(),
  },
  (table) => [index("idx_stake_records_staker").on(table.staker), index("idx_stake_records_nft_mint").on(table.nftMint)]
)

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: integer("value").notNull(),
})
