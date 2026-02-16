CREATE TABLE `stake_records` (
	`nft_mint` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`account_address` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stake_records_owner` ON `stake_records` (`owner`);
--> statement-breakpoint
CREATE INDEX `idx_stake_records_account` ON `stake_records` (`account_address`);
