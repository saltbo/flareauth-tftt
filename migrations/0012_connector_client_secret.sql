ALTER TABLE `identity_provider_connector` ADD `client_secret` text;
ALTER TABLE `identity_provider_connector` DROP COLUMN `client_secret_binding`;
