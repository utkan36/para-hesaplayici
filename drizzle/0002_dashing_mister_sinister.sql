CREATE TABLE `creator_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`plan` text NOT NULL,
	`consent_version` text DEFAULT 'v1' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creator_leads_email_unique` ON `creator_leads` (`email`);--> statement-breakpoint
CREATE INDEX `idx_creator_leads_created_at` ON `creator_leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_creator_leads_plan` ON `creator_leads` (`plan`);