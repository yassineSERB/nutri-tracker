CREATE TABLE `blood_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`test_on` text NOT NULL,
	`analyte` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`ref_low` real,
	`ref_high` real,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blood_results_user_id_idx` ON `blood_results` (`user_id`);--> statement-breakpoint
CREATE INDEX `blood_results_user_test_idx` ON `blood_results` (`user_id`,`test_on`);