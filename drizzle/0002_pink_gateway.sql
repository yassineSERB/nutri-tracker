CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY NOT NULL,
	`sex` text,
	`birth_year` integer,
	`height_cm` integer,
	`weight_kg` real,
	`activity` text DEFAULT 'sedentary' NOT NULL,
	`goal_mode` text DEFAULT 'maintain' NOT NULL,
	`kcal_goal` integer,
	`protein_goal` integer,
	`carbs_goal` integer,
	`fat_goal` integer,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
