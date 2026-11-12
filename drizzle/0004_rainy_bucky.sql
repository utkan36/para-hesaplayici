ALTER TABLE `widget_leads` ADD `stage` text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE `widget_leads` ADD `sales_notes` text;--> statement-breakpoint
ALTER TABLE `widget_leads` ADD `follow_up_at` integer;--> statement-breakpoint
ALTER TABLE `widget_leads` ADD `last_contacted_at` integer;--> statement-breakpoint
CREATE INDEX `idx_widget_leads_stage` ON `widget_leads` (`stage`);--> statement-breakpoint
CREATE INDEX `idx_widget_leads_follow_up_at` ON `widget_leads` (`follow_up_at`);--> statement-breakpoint
PRAGMA optimize;
