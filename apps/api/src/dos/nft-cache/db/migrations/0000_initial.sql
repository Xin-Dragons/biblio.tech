CREATE TABLE `nfts` (
	`mint` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`collection_id` text NOT NULL,
	`collection_name` text,
	`attributes` text NOT NULL,
	`frozen` integer DEFAULT false NOT NULL,
	`delegate` text,
	`compressed` integer DEFAULT false NOT NULL,
	`token_standard` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image` text NOT NULL,
	`num_mints` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_nfts_collection` ON `nfts` (`collection_id`);
