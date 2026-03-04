import { getDb, userSettings, InsertUserSettings, UserSettings, quickNotes, InsertQuickNote, QuickNote, eq, desc, and, sql } from "./common";

// ============ USER SETTINGS QUERIES ============

export async function getUserSettings(userId: number): Promise<UserSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
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
  await db.update(userSettings).set(updates).where(eq(userSettings.userId, userId));
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
    .where(and(eq(quickNotes.userId, userId), sql`${quickNotes.usedInRoundupId} IS NULL`))
    .orderBy(desc(quickNotes.createdAt));
}

export async function deleteQuickNote(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(quickNotes).where(and(eq(quickNotes.id, id), eq(quickNotes.userId, userId)));
}

export async function markNotesAsUsed(noteIds: number[], roundupId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const id of noteIds) {
    await db.update(quickNotes).set({ usedInRoundupId: roundupId }).where(eq(quickNotes.id, id));
  }
}
