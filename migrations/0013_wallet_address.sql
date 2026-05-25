CREATE TABLE `wallet_address` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `address` text NOT NULL,
  `chain_id` integer NOT NULL,
  `is_primary` integer DEFAULT false,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `walletAddress_userId_idx` ON `wallet_address` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `walletAddress_address_chainId_unique` ON `wallet_address` (`address`, `chain_id`);
