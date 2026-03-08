CREATE TABLE `intake_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `intake_presets_id` PRIMARY KEY (`id`)
);

CREATE TABLE `preset_surfaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetId` int NOT NULL,
	`surfaceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `preset_surfaces_id` PRIMARY KEY (`id`)
);

CREATE TABLE `preset_mediums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetId` int NOT NULL,
	`mediumId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `preset_mediums_id` PRIMARY KEY (`id`)
);

CREATE TABLE `preset_tools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`presetId` int NOT NULL,
	`toolId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `preset_tools_id` PRIMARY KEY (`id`)
);
