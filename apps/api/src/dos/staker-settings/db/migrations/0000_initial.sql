CREATE TABLE `config` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`staker` text NOT NULL,
	`collections` text NOT NULL,
	`emissions` text NOT NULL,
	`cached_at` integer NOT NULL
);
