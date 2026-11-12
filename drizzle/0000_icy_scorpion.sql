CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`category` text NOT NULL,
	`source` text DEFAULT 'direct' NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_events_occurred_at` ON `analytics_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_type_date` ON `analytics_events` (`event_type`,`occurred_at`);