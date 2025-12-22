import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Weekly Roundups - stores all weekly form submissions
 */
export const weeklyRoundups = mysqlTable("weekly_roundups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekNumber: int("weekNumber").notNull(), // 0-52
  year: int("year").notNull(),
  entryNumber: int("entryNumber").default(1).notNull(), // 1-7 entries per week
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  
  // Form fields
  weatherReport: text("weatherReport").notNull(),
  studioHours: float("studioHours").notNull(),
  worksMade: text("worksMade").notNull(),
  jesterActivity: int("jesterActivity").notNull(), // 0-10
  energyLevel: mysqlEnum("energyLevel", ["hot", "sustainable", "depleted"]).notNull(),
  walkingEngineUsed: boolean("walkingEngineUsed").default(false).notNull(),
  walkingInsights: text("walkingInsights"),
  partnershipTemperature: text("partnershipTemperature").notNull(),
  thingWorked: text("thingWorked").notNull(),
  thingResisted: text("thingResisted").notNull(),
  somaticState: text("somaticState").notNull(),
  doorIntention: text("doorIntention"), // optional
  
  // Structured works data
  worksData: json("worksData").$type<WorkEntry[] | null>(),
  
  // Step tracking (7-day data)
  dailySteps: json("dailySteps").$type<{ mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number } | null>(),
  weeklyStepTotal: int("weeklyStepTotal"), // calculated sum
  dailyStepAverage: int("dailyStepAverage"), // calculated average
  
  // AI-assigned metadata
  phaseDnaAssigned: varchar("phaseDnaAssigned", { length: 32 }),
  createdDayOfWeek: varchar("createdDayOfWeek", { length: 16 }).notNull(), // Day of week when entry was created
  
  // Edit tracking
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyRoundup = typeof weeklyRoundups.$inferSelect;
export type InsertWeeklyRoundup = typeof weeklyRoundups.$inferInsert;

// Work Entry type for structured works data
export type WorkEntry = {
  id: string; // unique ID for each work card
  workTitle?: string; // optional title
  medium: 'ink' | 'mixed' | 'study' | 'other';
  emotionalTemp: 'struggling' | 'processing' | 'flowing' | 'uncertain';
  started: number;
  finished: number;
  abandoned: number;
  keyInquiry: string; // one-line description of what you were testing
  technicalNote?: string; // optional material or process detail
  abandonmentReason?: string; // optional, if works were abandoned
};

/**
 * Archive Entries - historical journal entries for pattern matching
 */
export const archiveEntries = mysqlTable("archive_entries", {
  id: int("id").autoincrement().primaryKey(),
  sourcePhase: varchar("sourcePhase", { length: 16 }).notNull(), // PH1, PH2, PH2A, PH3, PH3A, PH4, PH4A, NE
  sourceDate: timestamp("sourceDate").notNull(),
  content: text("content").notNull(),
  phraseTags: json("phraseTags").$type<string[]>().notNull(), // extracted key phrases
  emotionalStateTag: varchar("emotionalStateTag", { length: 64 }).notNull(),
  phaseDnaTag: varchar("phaseDnaTag", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ArchiveEntry = typeof archiveEntries.$inferSelect;
export type InsertArchiveEntry = typeof archiveEntries.$inferInsert;

/**
 * Pattern Matches - links current weeks to matched archive entries
 */
export const patternMatches = mysqlTable("pattern_matches", {
  id: int("id").autoincrement().primaryKey(),
  currentWeekId: int("currentWeekId").notNull(),
  matchedArchiveId: int("matchedArchiveId").notNull(),
  matchType: mysqlEnum("matchType", ["phrase", "emotional", "phase-dna"]).notNull(),
  relevanceScore: int("relevanceScore").notNull(), // 0-100
  matchedPhrase: text("matchedPhrase"), // the specific phrase that matched
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatternMatch = typeof patternMatches.$inferSelect;
export type InsertPatternMatch = typeof patternMatches.$inferInsert;

/**
 * User Settings - configurable Crucible Year settings per user
 */
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Crucible Year Configuration
  crucibleStartDate: timestamp("crucibleStartDate").notNull(), // When Week 0 begins
  checkInDay: mysqlEnum("checkInDay", ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]).default("Sunday").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("Asia/Bangkok").notNull(),
  
  // Cycle tracking
  currentCycle: int("currentCycle").default(1).notNull(), // For multiple Crucible Years
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
