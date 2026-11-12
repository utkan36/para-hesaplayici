CREATE TABLE `widget_leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`website` text,
	`role` text NOT NULL,
	`tool` text NOT NULL,
	`plan` text NOT NULL,
	`message` text,
	`consent_version` text DEFAULT 'v1' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_widget_leads_created_at` ON `widget_leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_widget_leads_plan` ON `widget_leads` (`plan`);--> statement-breakpoint
CREATE INDEX `idx_widget_leads_tool` ON `widget_leads` (`tool`);