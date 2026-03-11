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
  worksCore, InsertWorkCore, WorkCore,
  workSurfaces, workMediums, workTools,
  contacts, Contact
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

export async function getQuickNotesForWeek(userId: number): Promise<QuickNote[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Calculate start of current week (Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  return db.select().from(quickNotes)
    .where(and(
      eq(quickNotes.userId, userId),
      sql`${quickNotes.createdAt} >= ${startOfWeek}`
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

export async function createWork(
  work: Omit<InsertWorkCore, 'surfaceId' | 'mediumId' | 'toolId'>,
  surfaceIds: number[],
  mediumIds: number[],
  toolIds?: number[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Insert work without material IDs (they go in junction tables)
  // Cast to any to bypass type checking since we're intentionally omitting fields
  const result = await db.insert(worksCore).values(work as any);
  const workId = result[0].insertId;
  
  // Insert surface relationships
  for (const surfaceId of surfaceIds) {
    await db.insert(workSurfaces).values({ workId, surfaceId });
    await incrementMaterialUsage(surfaceId);
  }
  
  // Insert medium relationships
  for (const mediumId of mediumIds) {
    await db.insert(workMediums).values({ workId, mediumId });
    await incrementMaterialUsage(mediumId);
  }
  
  // Insert tool relationships if provided
  if (toolIds && toolIds.length > 0) {
    for (const toolId of toolIds) {
      await db.insert(workTools).values({ workId, toolId });
      await incrementMaterialUsage(toolId);
    }
  }
  
  return workId;
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
      COALESCE(SUM(CASE WHEN disposition IN ('Trash', 'Probably_Trash') THEN 1 ELSE 0 END), 0) as trashCount,
      COALESCE(SUM(CASE WHEN disposition IN ('Trash', 'Probably_Trash') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0) as trashRate,
      COUNT(*) / GREATEST(DATEDIFF(NOW(), MIN(date)) / 7, 1) as weeklyAvg
    FROM works_core
    WHERE userId = ${userId}
  `);
  
  const rows = result[0] as unknown as any[];
  const row = rows?.[0];
  return {
    totalWorks: Number(row?.totalWorks ?? 0),
    trashCount: Number(row?.trashCount ?? 0),
    trashRate: Number(row?.trashRate ?? 0),
    weeklyAvg: Number(row?.weeklyAvg ?? 0)
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

export async function getWorkSurfaces(workId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT m.*
    FROM materials m
    INNER JOIN work_surfaces ws ON m.id = ws.surfaceId
    WHERE ws.workId = ${workId}
  `);
  
  return result[0] as unknown as Material[];
}

export async function getWorkMediums(workId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT m.*
    FROM materials m
    INNER JOIN work_mediums wm ON m.id = wm.mediumId
    WHERE wm.workId = ${workId}
  `);
  
  return result[0] as unknown as Material[];
}

export async function getWorkTools(workId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT m.*
    FROM materials m
    INNER JOIN work_tools wt ON m.id = wt.toolId
    WHERE wt.workId = ${workId}
  `);
  
  return result[0] as unknown as Material[];
}

export async function updateWorkMaterials(
  workId: number,
  surfaceIds: number[],
  mediumIds: number[],
  toolIds?: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete existing material relationships
  await db.delete(workSurfaces).where(eq(workSurfaces.workId, workId));
  await db.delete(workMediums).where(eq(workMediums.workId, workId));
  await db.delete(workTools).where(eq(workTools.workId, workId));
  
  // Insert new surface relationships
  for (const surfaceId of surfaceIds) {
    await db.insert(workSurfaces).values({ workId, surfaceId });
  }
  
  // Insert new medium relationships
  for (const mediumId of mediumIds) {
    await db.insert(workMediums).values({ workId, mediumId });
  }
  
  // Insert new tool relationships if provided
  if (toolIds && toolIds.length > 0) {
    for (const toolId of toolIds) {
      await db.insert(workTools).values({ workId, toolId });
    }
  }
}

/**
 * Get all works with their materials for CSV export
 */
export async function getAllWorksForExport(): Promise<Array<{
  code: string;
  date: Date;
  rating: number | null;
  disposition: string;
  surfaces: string;
  mediums: string;
  tools: string;
  technicalIntent: string | null;
  discovery: string | null;
  heightCm: number | null;
  widthCm: number | null;
  hours: number | null;
}>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const works = await db.select().from(worksCore).orderBy(desc(worksCore.date));
  
  const result = [];
  for (const work of works) {
    const surfaces = await getWorkSurfaces(work.id);
    const mediums = await getWorkMediums(work.id);
    const tools = await getWorkTools(work.id);
    
    result.push({
      code: work.code,
      date: work.date,
      rating: work.rating,
      disposition: work.disposition,
      surfaces: surfaces.map(s => s.code).join('; '),
      mediums: mediums.map(m => m.code).join('; '),
      tools: tools.map(t => t.code).join('; '),
      technicalIntent: work.technicalIntent,
      discovery: work.discovery,
      heightCm: work.heightCm,
      widthCm: work.widthCm,
      hours: work.hours,
    });
  }
  
  return result;
}


// ===== CRUCIBLE ANALYTICS DETAILED QUERIES =====

export async function getMaterialUsageStats() {
  const db = await getDb();
  if (!db) return { surfaceUsage: [], mediumUsage: [], toolUsage: [] };
  
  const surfaceUsage = await db
    .select({
      materialId: materials.id,
      code: materials.code,
      name: materials.displayName,
      usageCount: sql<number>`COUNT(${workSurfaces.workId})`.as('usage_count'),
    })
    .from(materials)
    .leftJoin(workSurfaces, eq(materials.id, workSurfaces.surfaceId))
    .where(eq(materials.materialType, 'Surface'))
    .groupBy(materials.id)
    .orderBy(desc(sql`usage_count`));

  const mediumUsage = await db
    .select({
      materialId: materials.id,
      code: materials.code,
      name: materials.displayName,
      usageCount: sql<number>`COUNT(${workMediums.workId})`.as('usage_count'),
    })
    .from(materials)
    .leftJoin(workMediums, eq(materials.id, workMediums.mediumId))
    .where(eq(materials.materialType, 'Medium'))
    .groupBy(materials.id)
    .orderBy(desc(sql`usage_count`));

  const toolUsage = await db
    .select({
      materialId: materials.id,
      code: materials.code,
      name: materials.displayName,
      usageCount: sql<number>`COUNT(${workTools.workId})`.as('usage_count'),
    })
    .from(materials)
    .leftJoin(workTools, eq(materials.id, workTools.toolId))
    .where(eq(materials.materialType, 'Tool'))
    .groupBy(materials.id)
    .orderBy(desc(sql`usage_count`));

  return { surfaceUsage, mediumUsage, toolUsage };
}

export async function getRatingDistribution() {
  const db = await getDb();
  if (!db) return [];
  
  const distribution = await db
    .select({
      rating: worksCore.rating,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(worksCore)
    .groupBy(worksCore.rating)
    .orderBy(worksCore.rating);

  return distribution;
}

export async function getDispositionBreakdown() {
  const db = await getDb();
  if (!db) return [];
  
  const breakdown = await db
    .select({
      disposition: worksCore.disposition,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(worksCore)
    .groupBy(worksCore.disposition)
    .orderBy(desc(sql`count`));

  return breakdown;
}

export async function getDimensionalStats() {
  const db = await getDb();
  if (!db) return null;
  
  const stats = await db
    .select({
      avgHeight: sql<number>`AVG(${worksCore.heightCm})`.as('avg_height'),
      minHeight: sql<number>`MIN(${worksCore.heightCm})`.as('min_height'),
      maxHeight: sql<number>`MAX(${worksCore.heightCm})`.as('max_height'),
      avgWidth: sql<number>`AVG(${worksCore.widthCm})`.as('avg_width'),
      minWidth: sql<number>`MIN(${worksCore.widthCm})`.as('min_width'),
      maxWidth: sql<number>`MAX(${worksCore.widthCm})`.as('max_width'),
      totalArea: sql<number>`SUM(${worksCore.heightCm} * ${worksCore.widthCm})`.as('total_area'),
    })
    .from(worksCore);

  return stats[0] || null;
}

export async function getTimeInvestmentStats() {
  const db = await getDb();
  if (!db) return null;
  
  const stats = await db
    .select({
      totalHours: sql<number>`SUM(${worksCore.hours})`.as('total_hours'),
      avgHours: sql<number>`AVG(${worksCore.hours})`.as('avg_hours'),
      minHours: sql<number>`MIN(${worksCore.hours})`.as('min_hours'),
      maxHours: sql<number>`MAX(${worksCore.hours})`.as('max_hours'),
      worksWithHours: sql<number>`COUNT(CASE WHEN ${worksCore.hours} IS NOT NULL THEN 1 END)`.as('works_with_hours'),
    })
    .from(worksCore);

  return stats[0] || null;
}

export async function getTemporalTrends() {
  const db = await getDb();
  if (!db) return { worksPerWeek: [], ratingOverTime: [], trashRateOverTime: [] };
  
  // Works per week - use YEARWEEK for proper week grouping, format as W1, W2, etc.
  const worksPerWeekRaw = await db
    .select({
      yearWeek: sql<number>`YEARWEEK(${worksCore.date}, 1)`.as('year_week'),
      count: sql<number>`COUNT(*)`.as('count'),
      minDate: sql<string>`MIN(${worksCore.date})`.as('min_date'),
    })
    .from(worksCore)
    .groupBy(sql`year_week`)
    .orderBy(sql`year_week`);
  
  // Convert to sequential week labels (W1, W2, W3...)
  const worksPerWeek = worksPerWeekRaw.map((row, index) => ({
    week: `W${index + 1}`,
    count: row.count,
  }));

  // Rating over time (by week, formatted as W1, W2...)
  const ratingOverTimeRaw = await db
    .select({
      yearWeek: sql<number>`YEARWEEK(${worksCore.date}, 1)`.as('year_week'),
      avgRating: sql<number>`AVG(${worksCore.rating})`.as('avg_rating'),
    })
    .from(worksCore)
    .groupBy(sql`year_week`)
    .orderBy(sql`year_week`);
  
  const ratingOverTime = ratingOverTimeRaw.map((row, index) => ({
    month: `W${index + 1}`,
    avgRating: row.avgRating,
  }));

  // Trash rate over time (by week)
  const trashRateOverTimeRaw = await db
    .select({
      yearWeek: sql<number>`YEARWEEK(${worksCore.date}, 1)`.as('year_week'),
      trashRate: sql<number>`(SUM(CASE WHEN ${worksCore.disposition} IN ('Trash', 'Probably_Trash') THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`.as('trash_rate'),
    })
    .from(worksCore)
    .groupBy(sql`year_week`)
    .orderBy(sql`year_week`);
  
  const trashRateOverTime = trashRateOverTimeRaw.map((row, index) => ({
    month: `W${index + 1}`,
    trashRate: row.trashRate,
  }));

  return { worksPerWeek, ratingOverTime, trashRateOverTime };
}


// ===== INTEGRATION: Works by date range (for syncing with weekly roundups) =====

export async function getWorksForDateRange(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<Array<WorkCore & { surfaces: string; mediums: string; tools: string }>> {
  const db = await getDb();
  if (!db) return [];
  
  const works = await db.select().from(worksCore)
    .where(and(
      eq(worksCore.userId, userId),
      sql`${worksCore.date} >= ${startDate}`,
      sql`${worksCore.date} < ${endDate}`
    ))
    .orderBy(desc(worksCore.date));
  
  const result = [];
  for (const work of works) {
    const surfaces = await getWorkSurfaces(work.id);
    const mediums = await getWorkMediums(work.id);
    const tools = await getWorkTools(work.id);
    
    result.push({
      ...work,
      surfaces: surfaces.map(s => s.code || s.displayName).join(', '),
      mediums: mediums.map(m => m.code || m.displayName).join(', '),
      tools: tools.map(t => t.code || t.displayName).join(', '),
    });
  }
  
  return result;
}

// ===== UNIFIED EXPORT: Combined roundup + crucible data =====

export async function getUnifiedExportData(userId: number): Promise<{
  roundups: Array<{
    week: number;
    year: number;
    date: string;
    weatherReport: string;
    studioHours: number;
    worksMade: string;
    jesterActivity: number;
    energyLevel: string;
    walkingEngineUsed: boolean;
    walkingInsights: string | null;
    partnershipTemperature: string;
    thingWorked: string;
    thingResisted: string;
    somaticState: string;
    doorIntention: string | null;
    phaseDna: string | null;
    weeklySteps: number | null;
    avgDailySteps: number | null;
  }>;
  trials: Array<{
    code: string;
    date: string;
    week: number;
    rating: number | null;
    disposition: string;
    surfaces: string;
    mediums: string;
    tools: string;
    technicalIntent: string | null;
    discovery: string | null;
    heightCm: number | null;
    widthCm: number | null;
    hours: number | null;
  }>;
}> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get all roundups
  const roundups = await getAllWeeklyRoundups(userId, 1000, 0);
  
  // Get all works with materials
  const works = await db.select().from(worksCore)
    .where(eq(worksCore.userId, userId))
    .orderBy(desc(worksCore.date));
  
  const trials = [];
  for (const work of works) {
    const surfaces = await getWorkSurfaces(work.id);
    const mediums = await getWorkMediums(work.id);
    const tools = await getWorkTools(work.id);
    
    // Calculate which Crucible week this trial belongs to
    // We'll use the date to approximate the week number
    const workDate = new Date(work.date);
    const matchingRoundup = roundups.find(r => {
      const rDate = new Date(r.createdAt);
      const diffDays = Math.abs((workDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7 && r.weekNumber >= 0;
    });
    
    trials.push({
      code: work.code,
      date: workDate.toISOString().split('T')[0],
      week: matchingRoundup?.weekNumber ?? -1,
      rating: work.rating,
      disposition: work.disposition,
      surfaces: surfaces.map(s => s.code || s.displayName).join('; '),
      mediums: mediums.map(m => m.code || m.displayName).join('; '),
      tools: tools.map(t => t.code || t.displayName).join('; '),
      technicalIntent: work.technicalIntent,
      discovery: work.discovery,
      heightCm: work.heightCm,
      widthCm: work.widthCm,
      hours: work.hours,
    });
  }
  
  return {
    roundups: roundups.map(r => ({
      week: r.weekNumber,
      year: r.year,
      date: r.createdAt.toISOString().split('T')[0],
      weatherReport: r.weatherReport,
      studioHours: r.studioHours,
      worksMade: r.worksMade,
      jesterActivity: r.jesterActivity,
      energyLevel: r.energyLevel,
      walkingEngineUsed: r.walkingEngineUsed,
      walkingInsights: r.walkingInsights,
      partnershipTemperature: r.partnershipTemperature,
      thingWorked: r.thingWorked,
      thingResisted: r.thingResisted,
      somaticState: r.somaticState,
      doorIntention: r.doorIntention,
      phaseDna: r.phaseDnaAssigned,
      weeklySteps: r.weeklyStepTotal,
      avgDailySteps: r.dailyStepAverage,
    })),
    trials,
  };
}


// ===== INTAKE OPTIMIZATION: Last trial defaults =====

export async function getLastTrialDefaults(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Get the most recent work
  const [lastWork] = await db.select()
    .from(worksCore)
    .where(eq(worksCore.userId, userId))
    .orderBy(desc(worksCore.date), desc(worksCore.id))
    .limit(1);
  
  if (!lastWork) return null;
  
  // Get its materials
  const surfaces = await getWorkSurfaces(lastWork.id);
  const mediums = await getWorkMediums(lastWork.id);
  const tools = await getWorkTools(lastWork.id);
  
  return {
    surfaceIds: surfaces.map(s => s.id),
    mediumIds: mediums.map(m => m.id),
    toolIds: tools.map(t => t.id),
    surfaceNames: surfaces.map(s => `${s.displayName} (${s.code})`).join(', '),
    mediumNames: mediums.map(m => `${m.displayName} (${m.code})`).join(', '),
    toolNames: tools.map(t => `${t.displayName} (${t.code})`).join(', '),
    heightCm: lastWork.heightCm,
    widthCm: lastWork.widthCm,
  };
}

// Get most common dimension pairs for quick-select presets
export async function getCommonDimensions(userId: number): Promise<Array<{ height: number; width: number; count: number }>> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT heightCm as height, widthCm as width, COUNT(*) as count
    FROM works_core
    WHERE userId = ${userId}
      AND heightCm IS NOT NULL 
      AND widthCm IS NOT NULL
    GROUP BY heightCm, widthCm
    ORDER BY count DESC
    LIMIT 5
  `);
  
  return (result[0] as unknown as Array<{ height: number; width: number; count: number }>)
    .filter(d => d.height && d.width);
}


// ============ INTAKE PRESETS QUERIES ============

import { intakePresets, InsertIntakePreset, IntakePreset, presetSurfaces, InsertPresetSurface, presetMediums, InsertPresetMedium, presetTools, InsertPresetTool } from "../drizzle/schema";

export async function createIntakePreset(preset: InsertIntakePreset): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(intakePresets).values(preset);
  return result[0].insertId;
}

export async function getIntakePresetsForUser(userId: number): Promise<Array<{
  preset: IntakePreset;
  surfaceIds: number[];
  mediumIds: number[];
  toolIds: number[];
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const presets = await db.select().from(intakePresets)
    .where(eq(intakePresets.userId, userId))
    .orderBy(intakePresets.sortOrder, intakePresets.createdAt);
  
  // Fetch materials for each preset
  const result = await Promise.all(presets.map(async (preset) => {
    const [surfaceIds, mediumIds, toolIds] = await Promise.all([
      getPresetSurfaces(preset.id),
      getPresetMediums(preset.id),
      getPresetTools(preset.id)
    ]);
    return { preset, surfaceIds, mediumIds, toolIds };
  }));
  
  return result;
}

export async function getIntakePresetById(id: number, userId: number): Promise<IntakePreset | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(intakePresets)
    .where(and(
      eq(intakePresets.id, id),
      eq(intakePresets.userId, userId)
    ))
    .limit(1);
  
  return result[0];
}

export async function updateIntakePreset(id: number, userId: number, updates: Partial<Omit<InsertIntakePreset, 'userId'>>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Verify ownership
  const existing = await getIntakePresetById(id, userId);
  if (!existing) {
    throw new Error("Preset not found or access denied");
  }
  
  await db.update(intakePresets)
    .set(updates)
    .where(eq(intakePresets.id, id));
}

export async function deleteIntakePreset(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Verify ownership
  const existing = await getIntakePresetById(id, userId);
  if (!existing) {
    throw new Error("Preset not found or access denied");
  }
  
  // Delete all associated materials
  await db.delete(presetSurfaces).where(eq(presetSurfaces.presetId, id));
  await db.delete(presetMediums).where(eq(presetMediums.presetId, id));
  await db.delete(presetTools).where(eq(presetTools.presetId, id));
  
  // Delete the preset
  await db.delete(intakePresets).where(eq(intakePresets.id, id));
}

// ============ PRESET MATERIALS QUERIES ============

export async function addPresetSurface(presetId: number, surfaceId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(presetSurfaces).values({ presetId, surfaceId });
}

export async function getPresetSurfaces(presetId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({ surfaceId: presetSurfaces.surfaceId })
    .from(presetSurfaces)
    .where(eq(presetSurfaces.presetId, presetId));
  
  return result.map(r => r.surfaceId);
}

export async function removePresetSurface(presetId: number, surfaceId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(presetSurfaces)
    .where(and(
      eq(presetSurfaces.presetId, presetId),
      eq(presetSurfaces.surfaceId, surfaceId)
    ));
}

export async function addPresetMedium(presetId: number, mediumId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(presetMediums).values({ presetId, mediumId });
}

export async function getPresetMediums(presetId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({ mediumId: presetMediums.mediumId })
    .from(presetMediums)
    .where(eq(presetMediums.presetId, presetId));
  
  return result.map(r => r.mediumId);
}

export async function removePresetMedium(presetId: number, mediumId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(presetMediums)
    .where(and(
      eq(presetMediums.presetId, presetId),
      eq(presetMediums.mediumId, mediumId)
    ));
}

export async function addPresetTool(presetId: number, toolId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(presetTools).values({ presetId, toolId });
}

export async function getPresetTools(presetId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({ toolId: presetTools.toolId })
    .from(presetTools)
    .where(eq(presetTools.presetId, presetId));
  
  return result.map(r => r.toolId);
}

export async function removePresetTool(presetId: number, toolId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(presetTools)
    .where(and(
      eq(presetTools.presetId, presetId),
      eq(presetTools.toolId, toolId)
    ));
}

export async function getFullPreset(presetId: number): Promise<{
  preset: IntakePreset;
  surfaceIds: number[];
  mediumIds: number[];
  toolIds: number[];
} | undefined> {
  const preset = await getIntakePresetById(presetId, 0); // Note: userId check happens in caller
  if (!preset) return undefined;
  
  const [surfaceIds, mediumIds, toolIds] = await Promise.all([
    getPresetSurfaces(presetId),
    getPresetMediums(presetId),
    getPresetTools(presetId)
  ]);
  
  return { preset, surfaceIds, mediumIds, toolIds };
}

export async function savePresetFromCurrentSelection(
  userId: number,
  name: string,
  description: string | undefined,
  surfaceIds: number[],
  mediumIds: number[],
  toolIds: number[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create the preset
  const presetId = await createIntakePreset({
    userId,
    name,
    description,
    sortOrder: 0
  });
  
  // Add all materials
  await Promise.all([
    ...surfaceIds.map(id => addPresetSurface(presetId, id)),
    ...mediumIds.map(id => addPresetMedium(presetId, id)),
    ...toolIds.map(id => addPresetTool(presetId, id))
  ]);
  
  return presetId;
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function createContact(data: {
  userId: number;
  name: string;
  role?: string | null;
  organization?: string | null;
  city?: string | null;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
  howConnected?: string | null;
  notes?: string | null;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  const [result] = await db.insert(contacts).values({
    userId: data.userId,
    name: data.name,
    role: data.role ?? null,
    organization: data.organization ?? null,
    city: data.city ?? null,
    phone: data.phone ?? null,
    instagram: data.instagram ?? null,
    email: data.email ?? null,
    howConnected: data.howConnected ?? null,
    notes: data.notes ?? null,
  });
  return (result as any).insertId as number;
}

export async function updateContact(id: number, userId: number, data: {
  name?: string;
  role?: string | null;
  organization?: string | null;
  city?: string | null;
  phone?: string | null;
  instagram?: string | null;
  email?: string | null;
  howConnected?: string | null;
  notes?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(contacts).set(data).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}

export async function getContacts(userId: number): Promise<Contact[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contacts)
    .where(eq(contacts.userId, userId))
    .orderBy(desc(contacts.createdAt));
}

export async function deleteContact(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.userId, userId)));
}
