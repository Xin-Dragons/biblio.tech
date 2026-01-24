CREATE TABLE `stake_records` (
	`address` text PRIMARY KEY NOT NULL,
	`staker` text NOT NULL,
	`owner` text NOT NULL,
	`nft_mint` text NOT NULL,
	`staked_at` integer NOT NULL,
	`pending_claim` integer NOT NULL,
	`can_claim_at` integer NOT NULL,
	`sol_balance` integer NOT NULL,
	`emissions` text NOT NULL,
	`bump` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stake_records_staker` ON `stake_records` (`staker`);
--> statement-breakpoint
CREATE INDEX `idx_stake_records_nft_mint` ON `stake_records` (`nft_mint`);
