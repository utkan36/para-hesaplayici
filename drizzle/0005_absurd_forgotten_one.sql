CREATE TABLE `widget_pilot_usage` (
	`license_id` text NOT NULL,
	`month` text NOT NULL,
	`opens` integer NOT NULL,
	PRIMARY KEY(`license_id`, `month`)
);
