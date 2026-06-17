-- Replace the global trusted_external_issuer with application-scoped federated_credential.
-- token_exchange_access_token is rebuilt to reference the credential instead of the issuer.
DROP TABLE IF EXISTS `token_exchange_access_token`;
--> statement-breakpoint
DROP TABLE IF EXISTS `trusted_external_issuer`;
--> statement-breakpoint
CREATE TABLE `federated_credential` (
  `id` text PRIMARY KEY NOT NULL,
  `application_id` text NOT NULL,
  `name` text NOT NULL,
  `issuer` text NOT NULL,
  `subject` text NOT NULL,
  `audience_resource_id` text NOT NULL,
  `jwks_url` text,
  `public_keys` text,
  `shared_secret` text,
  `enabled` integer DEFAULT true NOT NULL,
  `metadata` text,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  FOREIGN KEY (`application_id`) REFERENCES `application`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`audience_resource_id`) REFERENCES `api_resource`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `federatedCredential_app_issuer_subject_unique` ON `federated_credential` (`application_id`,`issuer`,`subject`);
--> statement-breakpoint
CREATE INDEX `federatedCredential_issuer_idx` ON `federated_credential` (`issuer`);
--> statement-breakpoint
CREATE INDEX `federatedCredential_applicationId_idx` ON `federated_credential` (`application_id`);
--> statement-breakpoint
CREATE INDEX `federatedCredential_enabled_idx` ON `federated_credential` (`enabled`);
--> statement-breakpoint
CREATE TABLE `token_exchange_access_token` (
  `id` text PRIMARY KEY NOT NULL,
  `token_hash` text NOT NULL,
  `client_id` text NOT NULL,
  `credential_id` text NOT NULL,
  `subject` text NOT NULL,
  `subject_token_issuer` text NOT NULL,
  `audience` text NOT NULL,
  `scopes` text NOT NULL,
  `claims` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
  `revoked_at` integer,
  FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`credential_id`) REFERENCES `federated_credential`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `token_exchange_access_token_token_hash_unique` ON `token_exchange_access_token` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `tokenExchangeAccessToken_clientId_idx` ON `token_exchange_access_token` (`client_id`);
--> statement-breakpoint
CREATE INDEX `tokenExchangeAccessToken_credentialId_idx` ON `token_exchange_access_token` (`credential_id`);
--> statement-breakpoint
CREATE INDEX `tokenExchangeAccessToken_expiresAt_idx` ON `token_exchange_access_token` (`expires_at`);
