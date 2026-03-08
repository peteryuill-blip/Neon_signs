CREATE TABLE `work_mediums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`mediumId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_mediums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_surfaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`surfaceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_surfaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workId` int NOT NULL,
	`toolId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_tools_id` PRIMARY KEY(`id`)
);
