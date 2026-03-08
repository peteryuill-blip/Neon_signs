ALTER TABLE `materials` MODIFY COLUMN `notes` text;--> statement-breakpoint
ALTER TABLE `materials` ADD `code` varchar(32);--> statement-breakpoint
ALTER TABLE `materials` ADD `brand` varchar(100);--> statement-breakpoint
ALTER TABLE `materials` ADD `specs` text;--> statement-breakpoint
ALTER TABLE `materials` ADD `size` varchar(100);--> statement-breakpoint
ALTER TABLE `materials` ADD `purchaseLocation` varchar(200);--> statement-breakpoint
ALTER TABLE `materials` ADD `cost` varchar(50);