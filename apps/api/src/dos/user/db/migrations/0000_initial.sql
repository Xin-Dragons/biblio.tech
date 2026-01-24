CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nft_layout` (
	`context` text NOT NULL,
	`mint` text NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`w` integer NOT NULL,
	`h` integer NOT NULL,
	PRIMARY KEY(`context`, `mint`)
);
--> statement-breakpoint
CREATE INDEX `idx_nft_layout_context` ON `nft_layout` (`context`);--> statement-breakpoint
CREATE TABLE `nft_order` (
	`context` text NOT NULL,
	`mint` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`context`, `mint`)
);
--> statement-breakpoint
CREATE INDEX `idx_nft_order_context` ON `nft_order` (`context`);--> statement-breakpoint
CREATE TABLE `nft_sizes` (
	`context` text NOT NULL,
	`mint` text NOT NULL,
	`size` text NOT NULL,
	PRIMARY KEY(`context`, `mint`)
);
--> statement-breakpoint
CREATE INDEX `idx_nft_sizes_context` ON `nft_sizes` (`context`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`context` text PRIMARY KEY NOT NULL,
	`layout_size` text,
	`show_info` integer,
	`sort` text,
	`light_mode` integer,
	`pay_royalties` integer,
	`show_all_wallets` integer
);
--> statement-breakpoint
CREATE TABLE `starred` (
	`mint` text PRIMARY KEY NOT NULL,
	`added_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tagged_nfts` (
	`tag_id` text NOT NULL,
	`mint` text NOT NULL,
	PRIMARY KEY(`tag_id`, `mint`)
);
--> statement-breakpoint
CREATE INDEX `idx_tagged_nfts_tag` ON `tagged_nfts` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`public_key` text PRIMARY KEY NOT NULL,
	`nickname` text,
	`is_main` integer DEFAULT false NOT NULL,
	`added_at` integer NOT NULL
);
