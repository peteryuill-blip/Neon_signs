import { eq, desc, and, sql, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  weeklyRoundups, InsertWeeklyRoundup, WeeklyRoundup,
  archiveEntries, InsertArchiveEntry, ArchiveEntry,
  patternMatches, InsertPatternMatch, PatternMatch,
  userSettings, InsertUserSettings, UserSettings,
  quickNotes, InsertQuickNote, QuickNote,
  materials, InsertMaterial, Material,
  worksCore, InsertWorkCore, WorkCore
} from "../drizzle/schema";
import { ENV } from './_core/env';

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

// ============ USER QUERIES ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ WEEKLY ROUNDUP QUERIES ============

export async function createWeeklyRoundup(roundup: InsertWeeklyRoundup): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(weeklyRoundups).values(roundup);
  return result[0].insertId;
}

export async function getWeeklyRoundupById(id: number): Promise<WeeklyRoundup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(weeklyRoundups).where(eq(weeklyRoundups.id, id)).limit(1);
  return result[0];
}

export async function getWeeklyRoundupByWeekAndYear(userId: number, weekNumber: number, year: number): Promise<WeeklyRoundup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(weeklyRoundups)
    .where(and(
      eq(weeklyRoundups.userId, userId),
      eq(weeklyRoundups.weekNumber, weekNumber),
      eq(weeklyRoundups.year, year)
    ))
    .limit(1);
  return result[0];
}

export async function getAllEntriesForWeek(userId: number, weekNumber: number, year: number): Promise<WeeklyRoundup[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(weeklyRoundups)
    .where(and(
      eq(weeklyRoundups.userId, userId),
      eq(weeklyRoundups.weekNumber, weekNumber),
      eq(weeklyRoundups.year, year)
    ))
    .orderBy(weeklyRoundups.entryNumber);
}

export async function getEntryCountForWeek(userId: number, weekNumber: number, year: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(weeklyRoundups)
    .where(and(
      eq(weeklyRoundups.userId, userId),
      eq(weeklyRoundups.weekNumber, weekNumber),
      eq(weeklyRoundups.year, year)
    ));
  return result[0]?.count ?? 0;
}

export async function hasSundayEntryForWeek(userId: number, weekNumber: number, year: number, checkInDay: string = 'Sunday'): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(weeklyRoundups)
    .where(and(
      eq(weeklyRoundups.userId, userId),
      eq(weeklyRoundups.weekNumber, weekNumber),
      eq(weeklyRoundups.year, year),
      eq(weeklyRoundups.createdDayOfWeek, checkInDay)
    ));
  return (result[0]?.count ?? 0) > 0;
}

export async function getAllWeeklyRoundups(userId: number, limit = 52, offset = 0): Promise<WeeklyRoundup[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .orderBy(desc(weeklyRoundups.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getWeeklyRoundupCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId));
  return result[0]?.count ?? 0;
}

export async function updateRoundupPhaseDna(id: number, phaseDna: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(weeklyRoundups)
    .set({ phaseDnaAssigned: phaseDna })
    .where(eq(weeklyRoundups.id, id));
}

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
  
  // Insert in batches of 100
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
  
  // Search in content and phrase tags
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
  
  // Fetch associated archive entries
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

// ============ STATS/TRENDS QUERIES ============

export async function getTotalStudioHours(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ total: sql<number>`COALESCE(SUM(studioHours), 0)` })
    .from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId));
  return result[0]?.total ?? 0;
}

export async function getAverageJesterActivity(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ avg: sql<number>`COALESCE(AVG(jesterActivity), 0)` })
    .from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId));
  return Math.round((result[0]?.avg ?? 0) * 10) / 10;
}

export async function getEnergyLevelDistribution(userId: number): Promise<{ hot: number; sustainable: number; depleted: number }> {
  const db = await getDb();
  if (!db) return { hot: 0, sustainable: 0, depleted: 0 };
  
  const result = await db.select({
    energyLevel: weeklyRoundups.energyLevel,
    count: sql<number>`count(*)`
  })
    .from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .groupBy(weeklyRoundups.energyLevel);
  
  const distribution = { hot: 0, sustainable: 0, depleted: 0 };
  for (const row of result) {
    if (row.energyLevel in distribution) {
      distribution[row.energyLevel as keyof typeof distribution] = row.count;
    }
  }
  return distribution;
}

export async function getJesterTrend(userId: number, limit = 12): Promise<{ weekNumber: number; year: number; jesterActivity: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    weekNumber: weeklyRoundups.weekNumber,
    year: weeklyRoundups.year,
    jesterActivity: weeklyRoundups.jesterActivity
  })
    .from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .orderBy(desc(weeklyRoundups.createdAt))
    .limit(limit);
  
  return result.reverse();
}

export async function getStudioHoursTrend(userId: number, limit = 12): Promise<{ weekNumber: number; year: number; studioHours: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    weekNumber: weeklyRoundups.weekNumber,
    year: weeklyRoundups.year,
    studioHours: weeklyRoundups.studioHours
  })
    .from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .orderBy(desc(weeklyRoundups.createdAt))
    .limit(limit);
  
  return result.reverse();
}

export async function getLastRoundup(userId: number): Promise<WeeklyRoundup | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(weeklyRoundups)
    .where(eq(weeklyRoundups.userId, userId))
    .orderBy(desc(weeklyRoundups.createdAt))
    .limit(1);
  
  return result[0];
}

// ============ USER SETTINGS QUERIES ============

export async function getUserSettings(userId: number): Promise<UserSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  
  return result[0];
}

export async function createUserSettings(settings: InsertUserSettings): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userSettings).values(settings);
  return result[0].insertId;
}

export async function updateUserSettings(
  userId: number, 
  updates: Partial<Omit<InsertUserSettings, 'userId'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(userSettings)
    .set(updates)
    .where(eq(userSettings.userId, userId));
}

export async function upsertUserSettings(settings: InsertUserSettings): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserSettings(settings.userId);
  if (existing) {
    await updateUserSettings(settings.userId, settings);
  } else {
    await createUserSettings(settings);
  }
}

// ============ ROUNDUP UPDATE QUERIES ============

export async function updateWeeklyRoundup(
  id: number,
  userId: number,
  updates: Partial<Omit<InsertWeeklyRoundup, 'userId' | 'weekNumber' | 'year' | 'createdDayOfWeek'>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Verify ownership before updating
  const existing = await getWeeklyRoundupById(id);
  if (!existing || existing.userId !== userId) {
    throw new Error("Roundup not found or access denied");
  }
  
  await db.update(weeklyRoundups)
    .set(updates)
    .where(eq(weeklyRoundups.id, id));
}


// ============ QUICK NOTES QUERIES ============

export async function createQuickNote(note: InsertQuickNote): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(quickNotes).values(note);
  return result[0].insertId;
}

export async function getQuickNotes(userId: number, limit = 20): Promise<QuickNote[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(quickNotes)
    .where(eq(quickNotes.userId, userId))
    .orderBy(desc(quickNotes.createdAt))
    .limit(limit);
}

export async function getUnusedQuickNotes(userId: number): Promise<QuickNote[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(quickNotes)
    .where(and(
      eq(quickNotes.userId, userId),
      sql`${quickNotes.usedInRoundupId} IS NULL`
    ))
    .orderBy(desc(quickNotes.createdAt));
}

export async function deleteQuickNote(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(quickNotes)
    .where(and(
      eq(quickNotes.id, id),
      eq(quickNotes.userId, userId)
    ));
}

export async function markNotesAsUsed(noteIds: number[], roundupId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  for (const id of noteIds) {
    await db.update(quickNotes)
      .set({ usedInRoundupId: roundupId })
      .where(eq(quickNotes.id, id));
  }
}

// Get roundups for two specific weeks (for comparison)
export async function getRoundupsForWeeks(
  userId: number, 
  weeks: Array<{ weekNumber: number; year: number }>
): Promise<WeeklyRoundup[]> {
  const db = await getDb();
  if (!db || weeks.length === 0) return [];
  
  // Build OR conditions for each week
  const conditions = weeks.map(w => 
    and(
      eq(weeklyRoundups.userId, userId),
      eq(weeklyRoundups.weekNumber, w.weekNumber),
      eq(weeklyRoundups.year, w.year)
    )
  );
  
  const result = await db.select().from(weeklyRoundups)
    .where(or(...conditions))
    .orderBy(desc(weeklyRoundups.year), desc(weeklyRoundups.weekNumber), desc(weeklyRoundups.entryNumber));
  
  return result;
}


// ============ MATERIALS LIBRARY QUERIES ============

export async function createMaterial(material: InsertMaterial): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(materials).values(material);
  return result[0].insertId;
}

export async function getMaterialById(id: number): Promise<Material | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
  return result[0];
}

export async function getMaterialByMaterialId(materialId: string): Promise<Material | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(materials).where(eq(materials.materialId, materialId)).limit(1);
  return result[0];
}

export async function getAllMaterials(userId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(materials)
    .where(eq(materials.userId, userId))
    .orderBy(materials.materialType, materials.displayName);
}

export async function getMaterialsByType(userId: number, materialType: 'Surface' | 'Medium' | 'Tool'): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(materials)
    .where(and(
      eq(materials.userId, userId),
      eq(materials.materialType, materialType)
    ))
    .orderBy(materials.displayName);
}

export async function getNextMaterialCode(userId: number, materialType: 'Surface' | 'Medium' | 'Tool'): Promise<string> {
  const db = await getDb();
  if (!db) return materialType === 'Surface' ? 'S_001' : materialType === 'Medium' ? 'M_001' : 'T_001';
  
  const prefix = materialType === 'Surface' ? 'S' : materialType === 'Medium' ? 'M' : 'T';
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(materials)
    .where(and(
      eq(materials.userId, userId),
      eq(materials.materialType, materialType)
    ));
  
  const count = (result[0]?.count ?? 0) + 1;
  return `${prefix}_${String(count).padStart(3, '0')}`;
}

export async function updateMaterial(id: number, updates: Partial<InsertMaterial>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Check if material has been used - if so, prevent updates
  const existing = await getMaterialById(id);
  if (existing && existing.usedInWorksCount > 0) {
    throw new Error("Cannot edit material that has been used in works");
  }
  
  await db.update(materials).set(updates).where(eq(materials.id, id));
}

export async function incrementMaterialUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(materials)
    .set({ 
      usedInWorksCount: sql`${materials.usedInWorksCount} + 1`,
      firstUsedDate: sql`COALESCE(${materials.firstUsedDate}, NOW())`
    })
    .where(eq(materials.id, id));
}

// ============ WORKS CORE QUERIES ============

export async function createWork(work: InsertWorkCore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(worksCore).values(work);
  
  // Increment usage counts for materials
  await incrementMaterialUsage(work.surfaceId);
  await incrementMaterialUsage(work.mediumId);
  if (work.toolId) {
    await incrementMaterialUsage(work.toolId);
  }
  
  return result[0].insertId;
}

export async function getWorkById(id: number): Promise<WorkCore | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(worksCore).where(eq(worksCore.id, id)).limit(1);
  return result[0];
}

export async function getWorkByCode(code: string): Promise<WorkCore | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(worksCore).where(eq(worksCore.code, code)).limit(1);
  return result[0];
}

export async function getAllWorks(userId: number, limit = 100, offset = 0): Promise<WorkCore[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(worksCore)
    .where(eq(worksCore.userId, userId))
    .orderBy(desc(worksCore.date))
    .limit(limit)
    .offset(offset);
}

export async function getWorksCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(worksCore)
    .where(eq(worksCore.userId, userId));
  return result[0]?.count ?? 0;
}

export async function getNextWorkCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return 'T_001';
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(worksCore)
    .where(eq(worksCore.userId, userId));
  
  const count = (result[0]?.count ?? 0) + 1;
  return `T_${String(count).padStart(3, '0')}`;
}

export async function updateWork(id: number, updates: Partial<InsertWorkCore>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(worksCore).set(updates).where(eq(worksCore.id, id));
}

// ============ CRUCIBLE ANALYTICS QUERIES ============

export async function getRatingDistributionBySurface(userId: number): Promise<Array<{ surfaceId: number; displayName: string; rating: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT 
      w.surfaceId,
      m.displayName,
      w.rating,
      COUNT(*) as count
    FROM works_core w
    JOIN materials m ON w.surfaceId = m.id
    WHERE w.userId = ${userId}
    GROUP BY w.surfaceId, m.displayName, w.rating
    ORDER BY m.displayName, w.rating
  `);
  
  return result[0] as unknown as Array<{ surfaceId: number; displayName: string; rating: number; count: number }>;
}

export async function getRatingDistributionByMedium(userId: number): Promise<Array<{ mediumId: number; displayName: string; rating: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT 
      w.mediumId,
      m.displayName,
      w.rating,
      COUNT(*) as count
    FROM works_core w
    JOIN materials m ON w.mediumId = m.id
    WHERE w.userId = ${userId}
    GROUP BY w.mediumId, m.displayName, w.rating
    ORDER BY m.displayName, w.rating
  `);
  
  return result[0] as unknown as Array<{ mediumId: number; displayName: string; rating: number; count: number }>;
}

export async function getSurfaceMediumPairOutcomes(userId: number): Promise<Array<{ surfaceName: string; mediumName: string; avgRating: number; count: number; trashRate: number }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT 
      s.displayName as surfaceName,
      m.displayName as mediumName,
      AVG(w.rating) as avgRating,
      COUNT(*) as count,
      SUM(CASE WHEN w.disposition = 'Trash' THEN 1 ELSE 0 END) / COUNT(*) * 100 as trashRate
    FROM works_core w
    JOIN materials s ON w.surfaceId = s.id
    JOIN materials m ON w.mediumId = m.id
    WHERE w.userId = ${userId}
    GROUP BY s.displayName, m.displayName
    HAVING COUNT(*) >= 2
    ORDER BY avgRating DESC
  `);
  
  return result[0] as unknown as Array<{ surfaceName: string; mediumName: string; avgRating: number; count: number; trashRate: number }>;
}

export async function getTrashRateAsVelocitySignal(userId: number): Promise<{ totalWorks: number; trashCount: number; trashRate: number; weeklyAvg: number }> {
  const db = await getDb();
  if (!db) return { totalWorks: 0, trashCount: 0, trashRate: 0, weeklyAvg: 0 };
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as totalWorks,
      SUM(CASE WHEN disposition = 'Trash' THEN 1 ELSE 0 END) as trashCount,
      SUM(CASE WHEN disposition = 'Trash' THEN 1 ELSE 0 END) / COUNT(*) * 100 as trashRate,
      COUNT(*) / GREATEST(DATEDIFF(NOW(), MIN(date)) / 7, 1) as weeklyAvg
    FROM works_core
    WHERE userId = ${userId}
  `);
  
  const rows = result[0] as unknown as any[];
  const row = rows?.[0];
  return {
    totalWorks: row?.totalWorks ?? 0,
    trashCount: row?.trashCount ?? 0,
    trashRate: row?.trashRate ?? 0,
    weeklyAvg: row?.weeklyAvg ?? 0
  };
}

export async function getDiscoveryDensity(userId: number): Promise<{ withDiscovery: number; total: number; density: number }> {
  const db = await getDb();
  if (!db) return { withDiscovery: 0, total: 0, density: 0 };
  
  const result = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN discovery IS NOT NULL AND discovery != '' THEN 1 ELSE 0 END) as withDiscovery,
      COUNT(*) as total
    FROM works_core
    WHERE userId = ${userId}
  `);
  
  const rows = result[0] as unknown as any[];
  const row = rows?.[0];
  const withDiscovery = row?.withDiscovery ?? 0;
  const total = row?.total ?? 0;
  return {
    withDiscovery,
    total,
    density: total > 0 ? (withDiscovery / total) * 100 : 0
  };
}

export async function getLowRatingHighDiscoveryPatterns(userId: number): Promise<WorkCore[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Works with rating 1-2 but have meaningful discoveries
  return db.select().from(worksCore)
    .where(and(
      eq(worksCore.userId, userId),
      sql`${worksCore.rating} <= 2`,
      sql`${worksCore.discovery} IS NOT NULL AND LENGTH(${worksCore.discovery}) > 20`
    ))
    .orderBy(desc(worksCore.date))
    .limit(20);
}
