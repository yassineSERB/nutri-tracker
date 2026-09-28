CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`food_id` integer NOT NULL,
	`meal_type` text NOT NULL,
	`quantity_g` real NOT NULL,
	`eaten_at` text NOT NULL,
	`eaten_on` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `entries_eaten_on_idx` ON `entries` (`eaten_on`);--> statement-breakpoint
CREATE INDEX `entries_food_id_idx` ON `entries` (`food_id`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`kcal_per_100g` real NOT NULL,
	`protein_per_100g` real DEFAULT 0 NOT NULL,
	`carbs_per_100g` real DEFAULT 0 NOT NULL,
	`fat_per_100g` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
