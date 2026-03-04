import { getDb, archiveEntries, InsertArchiveEntry, ArchiveEntry, patternMatches, InsertPatternMatch, PatternMatch, eq, desc, sql, like } from "./common";

// ============ ARCHIVE ENTRY QUERIES ============

export async function createArchiveEntry(entry: InsertArchiveEntry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(archiveEntries).values(entry);
  return result[0].insertId;
}

export async function bulkCreateArchiveEntries(entries: InsertArchiveEntry[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100);
    await db.insert(archiveEntries).values(batch);
  }
}

export async function getAllArchiveEntries(): Promise<ArchiveEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(archiveEntries).orderBy(desc(archiveEntries.sourceDate));
}

export async function searchArchiveByPhrase(phrase: string): Promise<ArchiveEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(archiveEntries)
    .where(like(archiveEntries.content, `%${phrase}%`))
    .orderBy(desc(archiveEntries.sourceDate))
    .limit(10);
}

export async function searchArchiveByEmotionalState(state: string): Promise<ArchiveEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(archiveEntries)
    .where(eq(archiveEntries.emotionalStateTag, state))
    .orderBy(desc(archiveEntries.sourceDate))
    .limit(10);
}

export async function searchArchiveByPhaseDna(phaseDna: string): Promise<ArchiveEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(archiveEntries)
    .where(eq(archiveEntries.phaseDnaTag, phaseDna))
    .orderBy(desc(archiveEntries.sourceDate))
    .limit(10);
}

export async function getArchiveEntryCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(archiveEntries);
  return result[0]?.count ?? 0;
}

// ============ PATTERN MATCH QUERIES ============

export async function createPatternMatch(match: InsertPatternMatch): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(patternMatches).values(match);
  return result[0].insertId;
}

export async function bulkCreatePatternMatches(matches: InsertPatternMatch[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (matches.length === 0) return;
  await db.insert(patternMatches).values(matches);
}

export async function getPatternMatchesForWeek(weekId: number): Promise<(PatternMatch & { archive: ArchiveEntry })[]> {
  const db = await getDb();
  if (!db) return [];
  const matches = await db.select().from(patternMatches)
    .where(eq(patternMatches.currentWeekId, weekId))
    .orderBy(desc(patternMatches.relevanceScore));
  const result: (PatternMatch & { archive: ArchiveEntry })[] = [];
  for (const match of matches) {
    const archiveResult = await db.select().from(archiveEntries)
      .where(eq(archiveEntries.id, match.matchedArchiveId))
      .limit(1);
    if (archiveResult[0]) {
      result.push({ ...match, archive: archiveResult[0] });
    }
  }
  return result;
}

export async function deletePatternMatchesForWeek(weekId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(patternMatches).where(eq(patternMatches.currentWeekId, weekId));
}
