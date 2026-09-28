-- Passage multi-utilisateur.
--
-- Contraintes SQLite qui dictent l'ordre de ce fichier :
--  1. `DROP TABLE <parent>` déclenche un DELETE implicite et donc un
--     ON DELETE CASCADE sur les enfants. On réordonne donc en feuilles d'abord
--     (profiles, water_logs), puis le parent foods AVANT son enfant entries, et
--     on ne supprime jamais une table encore référencée.
--  2. `PRAGMA foreign_keys` est ignoré dans une transaction, et drizzle-kit
--     migre dans un BEGIN. `legacy_alter_table` fonctionne dans une transaction
--     et empêche SQLite de réécrire les clés étrangères lors d'un RENAME.
--  3. Les lignes existantes appartiennent à l'utilisateur 1 : c'est le compte
--     de transfert créé ci-dessous, remplacé au démarrage par les identifiants
--     de .env.local (ensureBootstrapUser). Il porte un hash bcrypt d'un secret
--     aléatoire, donc ce compte ne peut pas être utilisé pour se connecter.

PRAGMA legacy_alter_table=ON;
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
INSERT INTO `users` (`id`, `email`, `password_hash`) VALUES (1, '__legacy__@invalid.local', '$2b$10$JCJBz7U05GkdUCr1wtLKku7a3QNtj9u.qYSKuUq3qAaK2.2xGjV2O');
--> statement-breakpoint
ALTER TABLE `profiles` RENAME TO `profiles__old`;
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` integer PRIMARY KEY NOT NULL,
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
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `profiles` (`user_id`, `sex`, `birth_year`, `height_cm`, `weight_kg`, `activity`, `goal_mode`, `kcal_goal`, `protein_goal`, `carbs_goal`, `fat_goal`, `updated_at`) SELECT 1, `sex`, `birth_year`, `height_cm`, `weight_kg`, `activity`, `goal_mode`, `kcal_goal`, `protein_goal`, `carbs_goal`, `fat_goal`, `updated_at` FROM `profiles__old`;
--> statement-breakpoint
DROP TABLE `profiles__old`;
--> statement-breakpoint
ALTER TABLE `water_logs` RENAME TO `water_logs__old`;
--> statement-breakpoint
CREATE TABLE `water_logs` (
	`user_id` integer NOT NULL,
	`day_key` text NOT NULL,
	`glasses` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `day_key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `water_logs` (`user_id`, `day_key`, `glasses`, `updated_at`) SELECT 1, `day_key`, `glasses`, `updated_at` FROM `water_logs__old`;
--> statement-breakpoint
DROP TABLE `water_logs__old`;
--> statement-breakpoint
ALTER TABLE `foods` RENAME TO `foods__old`;
--> statement-breakpoint
CREATE TABLE `foods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`barcode` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`kcal_per_100g` real NOT NULL,
	`protein_per_100g` real DEFAULT 0 NOT NULL,
	`carbs_per_100g` real DEFAULT 0 NOT NULL,
	`fat_per_100g` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `foods` (`id`, `user_id`, `name`, `brand`, `barcode`, `source`, `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `created_at`) SELECT `id`, 1, `name`, `brand`, `barcode`, `source`, `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `created_at` FROM `foods__old`;
--> statement-breakpoint
DROP TABLE `foods__old`;
--> statement-breakpoint
CREATE INDEX `foods_user_id_idx` ON `foods` (`user_id`);
--> statement-breakpoint
ALTER TABLE `entries` RENAME TO `entries__old`;
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`food_id` integer NOT NULL,
	`meal_type` text NOT NULL,
	`quantity_g` real NOT NULL,
	`eaten_at` text NOT NULL,
	`eaten_on` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `entries` (`id`, `user_id`, `food_id`, `meal_type`, `quantity_g`, `eaten_at`, `eaten_on`, `note`, `created_at`) SELECT `id`, 1, `food_id`, `meal_type`, `quantity_g`, `eaten_at`, `eaten_on`, `note`, `created_at` FROM `entries__old`;
--> statement-breakpoint
DROP TABLE `entries__old`;
--> statement-breakpoint
CREATE INDEX `entries_eaten_on_idx` ON `entries` (`eaten_on`);
--> statement-breakpoint
CREATE INDEX `entries_food_id_idx` ON `entries` (`food_id`);
--> statement-breakpoint
CREATE INDEX `entries_user_id_idx` ON `entries` (`user_id`);
