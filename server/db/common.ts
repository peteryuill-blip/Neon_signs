import { drizzle } from "drizzle-orm/mysql2";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Re-export everything from schema for convenience
export {
  users, InsertUser,
  weeklyRoundups, InsertWeeklyRoundup, WeeklyRoundup,
  archiveEntries, InsertArchiveEntry, ArchiveEntry,
  patternMatches, InsertPatternMatch, PatternMatch,
  userSettings, InsertUserSettings, UserSettings,
  quickNotes, InsertQuickNote, QuickNote,
  materials, InsertMaterial, Material,
  worksCore, InsertWorkCore, WorkCore,
  workSurfaces, workMediums, workTools
} from "../../drizzle/schema";

export { ENV } from '../_core/env';

// Re-export drizzle helpers used across domain files
export { eq, desc, asc, and, sql, count, avg, between, inArray, isNotNull, or, gte, lte, like } from "drizzle-orm";
