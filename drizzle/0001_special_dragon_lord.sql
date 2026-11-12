CREATE TABLE `user_feedback` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rating` text NOT NULL,
	`tool` text DEFAULT 'general' NOT NULL,
	`message` text,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_user_feedback_occurred_at` ON `user_feedback` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_user_feedback_rating` ON `user_feedback` (`rating`);