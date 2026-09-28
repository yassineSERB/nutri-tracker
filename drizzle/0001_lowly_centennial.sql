CREATE TABLE `water_logs` (
	`day_key` text PRIMARY KEY NOT NULL,
	`glasses` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
