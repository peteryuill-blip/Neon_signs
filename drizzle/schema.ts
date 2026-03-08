import { int, mysqlEnum, mysqlTable, text, longtext, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

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
  
  // Weather data
  city: varchar("city", { length: 100 }), // City for weather lookup
  weatherData: json("weatherData").$type<WeatherData | null>(), // Fetched weather info
  
  // Quick notes collected during the week
  quickNotes: json("quickNotes").$type<QuickNoteSnapshot[] | null>(), // Array of quick note snapshots for the week
  
  // AI-assigned metadata
  phaseDnaAssigned: varchar("phaseDnaAssigned", { length: 32 }),
  createdDayOfWeek: varchar("createdDayOfWeek", { length: 16 }).notNull(), // Day of week when entry was created
  
  // Edit tracking
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Weather data type
export type WeatherData = {
  temp: number; // Temperature in Celsius
  feelsLike: number;
  humidity: number;
  conditions: string; // e.g., "Sunny", "Cloudy", "Rainy"
  icon: string; // Weather icon code
  fetchedAt: number; // Timestamp when fetched
};

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

/**
 * Quick Notes - scratchpad for capturing thoughts throughout the week
 */
export const quickNotes = mysqlTable("quick_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  usedInRoundupId: int("usedInRoundupId"), // Links to roundup when note is used
});

export type QuickNote = typeof quickNotes.$inferSelect;
export type InsertQuickNote = typeof quickNotes.$inferInsert;

// Snapshot of quick note for storing in roundup's quickNotes JSON field
export type QuickNoteSnapshot = {
  id: number;
  content: string;
  createdAt: Date;
};

/**
 * Materials Library - surfaces, mediums, and tools for artwork trials
 */
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  materialId: varchar("materialId", { length: 32 }).notNull().unique(), // Auto-generated: S_001, M_001, T_001
  materialType: mysqlEnum("materialType", ["Surface", "Medium", "Tool"]).notNull(),
  
  // Basic info (from Google Sheets)
  code: varchar("code", { length: 32 }), // Custom user code (MB1, MB2, etc.)
  displayName: varchar("displayName", { length: 100 }).notNull(), // ITEM_NAME
  brand: varchar("brand", { length: 100 }), // BRAND
  specs: text("specs"), // SPECS (specifications/description)
  size: varchar("size", { length: 100 }), // SIZE (physical dimensions)
  purchaseLocation: varchar("purchaseLocation", { length: 200 }), // PURCHASE_L (where to buy/link)
  cost: varchar("cost", { length: 50 }), // COST (price)
  notes: text("notes"), // NOTES
  
  aliases: json("aliases").$type<string[] | null>(),
  firstUsedDate: timestamp("firstUsedDate"),
  usedInWorksCount: int("usedInWorksCount").default(0).notNull(), // Track usage for immutability
  
  // Photo
  photoUrl: varchar("photoUrl", { length: 500 }), // S3 URL
  photoKey: varchar("photoKey", { length: 500 }), // S3 key for deletion
  
  // Surface-specific fields
  reactivityProfile: mysqlEnum("reactivityProfile", ["Stable", "Responsive", "Volatile", "Chaotic"]),
  edgeBehavior: mysqlEnum("edgeBehavior", ["Sharp", "Feathered", "Blooming", "Fractured"]),
  absorptionCurve: mysqlEnum("absorptionCurve", ["Immediate", "Delayed", "Variable"]),
  consistencyPattern: mysqlEnum("consistencyPattern", ["Reliable", "Variable", "Glitch_Prone"]),
  practiceRole: mysqlEnum("practiceRole", ["Final_Work", "Exploration", "Anxiety_Discharge", "Conditioning"]),
  
  // Medium-specific fields
  viscosityBand: mysqlEnum("viscosityBand", ["Thin", "Balanced", "Dense"]),
  chromaticForce: mysqlEnum("chromaticForce", ["Muted", "Balanced", "Aggressive"]),
  reactivationTendency: mysqlEnum("reactivationTendency", ["Low", "Medium", "High"]),
  forgivenessWindow: mysqlEnum("forgivenessWindow", ["Narrow", "Medium", "Wide"]),
  dilutionSensitivity: mysqlEnum("dilutionSensitivity", ["Low", "Medium", "High"]),
  sedimentationBehavior: mysqlEnum("sedimentationBehavior", ["Stable", "Variable"]),
  
  // Tool-specific fields
  contactMode: mysqlEnum("contactMode", ["Direct", "Indirect", "Mediated", "Mechanical"]),
  controlBias: mysqlEnum("controlBias", ["Precision", "Balanced", "Chaos"]),
  repeatability: mysqlEnum("repeatability", ["High", "Medium", "Low"]),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * Works Core - individual material trial / work instances
 */
export const worksCore = mysqlTable("works_core", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 16 }).notNull().unique(), // Auto-generated: T_001, T_002...
  date: timestamp("date").notNull(),
  
  // Material references moved to junction tables (workSurfaces, workMediums, workTools)
  
  // Work details
  technicalIntent: varchar("technicalIntent", { length: 140 }), // Pre-action hypothesis
  discovery: varchar("discovery", { length: 280 }), // Post-action observation
  rating: int("rating").notNull(), // 1-5 (somatic_drill to breakthrough)
  disposition: mysqlEnum("disposition", ["Trash", "Probably_Trash", "Save_Archive", "Save_Has_Potential"]).notNull(),
  
  // Size (dimensions in cm)
  heightCm: float("heightCm"), // Height in centimeters
  widthCm: float("widthCm"), // Width in centimeters
  
  // Time tracking
  hours: float("hours"), // Hours spent on this work
  
  // Photo
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 256 }), // S3 key for reference
  photoThumbnail: longtext("photoThumbnail"), // Base64 thumbnail for reliable display
  
  // Session linking (optional)
  sessionId: int("sessionId"), // Could link to a studio session
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkCore = typeof worksCore.$inferSelect;
export type InsertWorkCore = typeof worksCore.$inferInsert;

/**
 * Work Surfaces - junction table for multiple surfaces per work
 */
export const workSurfaces = mysqlTable("work_surfaces", {
  id: int("id").autoincrement().primaryKey(),
  workId: int("workId").notNull(),
  surfaceId: int("surfaceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkSurface = typeof workSurfaces.$inferSelect;
export type InsertWorkSurface = typeof workSurfaces.$inferInsert;

/**
 * Work Mediums - junction table for multiple mediums per work
 */
export const workMediums = mysqlTable("work_mediums", {
  id: int("id").autoincrement().primaryKey(),
  workId: int("workId").notNull(),
  mediumId: int("mediumId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkMedium = typeof workMediums.$inferSelect;
export type InsertWorkMedium = typeof workMediums.$inferInsert;

/**
 * Work Tools - junction table for multiple tools per work
 */
export const workTools = mysqlTable("work_tools", {
  id: int("id").autoincrement().primaryKey(),
  workId: int("workId").notNull(),
  toolId: int("toolId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkTool = typeof workTools.$inferSelect;
export type InsertWorkTool = typeof workTools.$inferInsert;

/**
 * Intake Presets - saved material combinations for quick recall
 */
export const intakePresets = mysqlTable("intake_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Sumi + Rice Paper", "Ink Exploration"
  description: text("description"), // Optional description of the preset
  sortOrder: int("sortOrder").default(0).notNull(), // For custom ordering
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IntakePreset = typeof intakePresets.$inferSelect;
export type InsertIntakePreset = typeof intakePresets.$inferInsert;

/**
 * Preset Surfaces - junction table for surfaces in a preset
 */
export const presetSurfaces = mysqlTable("preset_surfaces", {
  id: int("id").autoincrement().primaryKey(),
  presetId: int("presetId").notNull(),
  surfaceId: int("surfaceId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PresetSurface = typeof presetSurfaces.$inferSelect;
export type InsertPresetSurface = typeof presetSurfaces.$inferInsert;

/**
 * Preset Mediums - junction table for mediums in a preset
 */
export const presetMediums = mysqlTable("preset_mediums", {
  id: int("id").autoincrement().primaryKey(),
  presetId: int("presetId").notNull(),
  mediumId: int("mediumId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PresetMedium = typeof presetMediums.$inferSelect;
export type InsertPresetMedium = typeof presetMediums.$inferInsert;

/**
 * Preset Tools - junction table for tools in a preset
 */
export const presetTools = mysqlTable("preset_tools", {
  id: int("id").autoincrement().primaryKey(),
  presetId: int("presetId").notNull(),
  toolId: int("toolId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PresetTool = typeof presetTools.$inferSelect;
export type InsertPresetTool = typeof presetTools.$inferInsert;
