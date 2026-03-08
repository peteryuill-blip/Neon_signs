CREATE TABLE `quick_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`usedInRoundupId` int,
	CONSTRAINT `quick_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `weekly_roundups` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `weekly_roundups` ADD `weatherData` json;