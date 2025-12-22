CREATE TABLE `archive_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourcePhase` varchar(16) NOT NULL,
	`sourceDate` timestamp NOT NULL,
	`content` text NOT NULL,
	`phraseTags` json NOT NULL,
	`emotionalStateTag` varchar(64) NOT NULL,
	`phaseDnaTag` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `archive_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pattern_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`currentWeekId` int NOT NULL,
	`matchedArchiveId` int NOT NULL,
	`matchType` enum('phrase','emotional','phase-dna') NOT NULL,
	`relevanceScore` int NOT NULL,
	`matchedPhrase` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pattern_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_roundups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekNumber` int NOT NULL,
	`year` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`weatherReport` text NOT NULL,
	`studioHours` float NOT NULL,
	`worksMade` text NOT NULL,
	`jesterActivity` int NOT NULL,
	`energyLevel` enum('hot','sustainable','depleted') NOT NULL,
	`walkingEngineUsed` boolean NOT NULL DEFAULT false,
	`walkingInsights` text,
	`partnershipTemperature` text NOT NULL,
	`thingWorked` text NOT NULL,
	`thingResisted` text NOT NULL,
	`somaticState` text NOT NULL,
	`doorIntention` text,
	`phaseDnaAssigned` varchar(32),
	`createdDayOfWeek` varchar(16) NOT NULL,
	CONSTRAINT `weekly_roundups_id` PRIMARY KEY(`id`)
);
