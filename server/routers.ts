import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  createWeeklyRoundup,
  getWeeklyRoundupById,
  getWeeklyRoundupByWeekAndYear,
  getAllWeeklyRoundups,
  getWeeklyRoundupCount,
  updateRoundupPhaseDna,
  getAllArchiveEntries,
  searchArchiveByPhrase,
  searchArchiveByEmotionalState,
  searchArchiveByPhaseDna,
  getArchiveEntryCount,
  createPatternMatch,
  bulkCreatePatternMatches,
  getPatternMatchesForWeek,
  deletePatternMatchesForWeek,
  getTotalStudioHours,
  getAverageJesterActivity,
  getEnergyLevelDistribution,
  getJesterTrend,
  getStudioHoursTrend,
  getLastRoundup,
  bulkCreateArchiveEntries,
  getUserSettings,
  upsertUserSettings,
  updateWeeklyRoundup,
  getEntryCountForWeek,
  hasSundayEntryForWeek,
  getAllEntriesForWeek,
  createQuickNote,
  getQuickNotes,
  getUnusedQuickNotes,
  deleteQuickNote,
  markNotesAsUsed,
  getRoundupsForWeeks,
  // Crucible imports
  createMaterial,
  getMaterialById,
  getAllMaterials,
  getMaterialsByType,
  getNextMaterialCode,
  updateMaterial,
  createWork,
  getWorkById,
  getAllWorks,
  getWorksCount,
  getNextWorkCode,
  updateWork,
  getRatingDistributionBySurface,
  getRatingDistributionByMedium,
  getSurfaceMediumPairOutcomes,
  getTrashRateAsVelocitySignal,
  getDiscoveryDensity,
  getLowRatingHighDiscoveryPatterns,
} from "./db";
import { TRPCError } from "@trpc/server";
import { fetchWeather } from "./_core/weather";
import { uploadPhoto } from "./uploadPhoto";

// Default Crucible Year start date: Sunday, December 21, 2025 (Week 0)
const DEFAULT_CRUCIBLE_START = new Date('2025-12-21T00:00:00+07:00'); // Bangkok time
const DEFAULT_CHECK_IN_DAY = 'Sunday';
const DEFAULT_TIMEZONE = 'Asia/Bangkok';

// Helper to get timezone offset in ms
function getTimezoneOffset(timezone: string): number {
  const offsets: Record<string, number> = {
    'Asia/Bangkok': 7 * 60 * 60 * 1000,
    'Asia/Tokyo': 9 * 60 * 60 * 1000,
    'Asia/Singapore': 8 * 60 * 60 * 1000,
    'America/New_York': -5 * 60 * 60 * 1000,
    'America/Los_Angeles': -8 * 60 * 60 * 1000,
    'Europe/London': 0,
    'Europe/Paris': 1 * 60 * 60 * 1000,
    'Australia/Sydney': 11 * 60 * 60 * 1000,
  };
  return offsets[timezone] || 7 * 60 * 60 * 1000; // Default to Bangkok
}

// Helper to get day index from name
function getDayIndex(day: string): number {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.indexOf(day);
}

// Helper to get Crucible Year week info with custom start date
function getCrucibleWeekInfo(
  date: Date, 
  startDate: Date = DEFAULT_CRUCIBLE_START,
  currentCycle: number = 1
): { weekNumber: number; crucibleYear: number; totalWeeks: number } {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const msSinceStart = date.getTime() - startDate.getTime();
  
  if (msSinceStart < 0) {
    // Before Crucible Year started
    return { weekNumber: 0, crucibleYear: currentCycle, totalWeeks: 52 };
  }
  
  const totalWeeksSinceStart = Math.floor(msSinceStart / msPerWeek);
  
  // Calculate which Crucible Year we're in (Year 1 = weeks 0-52, Year 2 = weeks 53-104, etc.)
  const yearOffset = Math.floor(totalWeeksSinceStart / 53);
  const crucibleYear = currentCycle + yearOffset;
  
  // Week number within the current Crucible Year (0-52 for Year 1, 1-52 for subsequent years)
  let weekNumber: number;
  if (yearOffset === 0) {
    weekNumber = totalWeeksSinceStart; // 0-52 for first year of this cycle
  } else {
    weekNumber = (totalWeeksSinceStart % 53) + 1; // 1-52 for subsequent years
  }
  
  return { 
    weekNumber, 
    crucibleYear, 
    totalWeeks: 52 
  };
}

// Helper to check if it's the check-in day in the configured timezone
function isCheckInDay(checkInDay: string = DEFAULT_CHECK_IN_DAY, timezone: string = DEFAULT_TIMEZONE): boolean {
  const now = new Date();
  const offset = getTimezoneOffset(timezone);
  const localTime = new Date(now.getTime() + offset);
  const targetDayIndex = getDayIndex(checkInDay);
  
  return localTime.getUTCDay() === targetDayIndex;
}

// Helper to get date info with Crucible Year tracking using user settings
function getDateInfoWithSettings(settings?: {
  crucibleStartDate: Date;
  checkInDay: string;
  timezone: string;
  currentCycle: number;
} | null): { 
  dayOfWeek: string; 
  date: Date; 
  weekNumber: number; 
  year: number; 
  crucibleYear: number;
  totalWeeks: number;
  isCheckInDay: boolean;
} {
  const startDate = settings?.crucibleStartDate || DEFAULT_CRUCIBLE_START;
  const timezone = settings?.timezone || DEFAULT_TIMEZONE;
  const checkInDay = settings?.checkInDay || DEFAULT_CHECK_IN_DAY;
  const currentCycle = settings?.currentCycle || 1;
  
  const now = new Date();
  const offset = getTimezoneOffset(timezone);
  const localTime = new Date(now.getTime() + offset);
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[localTime.getUTCDay()];
  
  const crucibleInfo = getCrucibleWeekInfo(localTime, startDate, currentCycle);
  
  return {
    dayOfWeek,
    date: localTime,
    weekNumber: crucibleInfo.weekNumber,
    year: localTime.getUTCFullYear(), // Calendar year for database storage
    crucibleYear: crucibleInfo.crucibleYear,
    totalWeeks: crucibleInfo.totalWeeks,
    isCheckInDay: dayOfWeek === checkInDay
  };
}

// Format works data for Neon's Mirror prompt
function formatWorksDataForNeon(worksData: unknown): string {
  if (!worksData || !Array.isArray(worksData) || worksData.length === 0) {
    return '';
  }
  
  const works = worksData as Array<{
    title?: string;
    medium?: string;
    emotionalTemp?: string;
    started?: number;
    finished?: number;
    abandoned?: number;
    keyInquiry?: string;
    technicalNote?: string;
    abandonmentReason?: string;
  }>;
  
  const lines: string[] = ['[Work Details]:'];
  
  works.forEach((work, i) => {
    const counts: string[] = [];
    if (work.started) counts.push(`${work.started} started`);
    if (work.finished) counts.push(`${work.finished} finished`);
    if (work.abandoned) counts.push(`${work.abandoned} abandoned`);
    
    lines.push(`  Work ${i + 1}${work.title ? ` - "${work.title}"` : ''}:`);
    if (work.medium) lines.push(`    Medium: ${work.medium}`);
    if (counts.length > 0) lines.push(`    Progress: ${counts.join(', ')}`);
    if (work.emotionalTemp) lines.push(`    Emotional Temperature: ${work.emotionalTemp}`);
    if (work.keyInquiry) lines.push(`    Key Inquiry: ${work.keyInquiry}`);
    if (work.technicalNote) lines.push(`    Technical Note: ${work.technicalNote}`);
    if (work.abandonmentReason) lines.push(`    Abandonment Reason: ${work.abandonmentReason}`);
  });
  
  return lines.join('\n') + '\n';
}

// Extract key phrases from text for pattern matching
function extractPhrases(text: string): string[] {
  const phrases: string[] = [];
  
  // Common emotional/creative phrases to look for
  const patterns = [
    /can't focus/gi,
    /feeling (lost|stuck|blocked|inspired|energized|depleted)/gi,
    /need (space|time|rest|clarity)/gi,
    /the work (is|feels|seems)/gi,
    /I (want|need|feel|think|believe)/gi,
    /struggling with/gi,
    /breakthrough/gi,
    /resistance/gi,
    /clarity/gi,
    /isolation/gi,
    /connection/gi,
    /pressure/gi,
    /threshold/gi,
    /burning/gi,
    /exhausted/gi,
    /alive/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      phrases.push(...matches.map(m => m.toLowerCase()));
    }
  }
  
  // Also extract 2-3 word phrases
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    if (twoWord.length > 5 && twoWord.length < 30) {
      phrases.push(twoWord);
    }
  }
  
  return Array.from(new Set(phrases)).slice(0, 20);
}

// Map energy level to emotional state
function energyToEmotionalState(energy: string): string {
  const mapping: Record<string, string> = {
    'hot': 'energized',
    'sustainable': 'balanced',
    'depleted': 'exhausted'
  };
  return mapping[energy] || 'neutral';
}

// Detect phase-DNA from submission data
async function detectPhaseDna(roundup: {
  weatherReport: string;
  jesterActivity: number;
  energyLevel: string;
  thingWorked: string;
  thingResisted: string;
}): Promise<string> {
  // Use LLM to detect phase-DNA
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are analyzing an artist's weekly creative practice data to detect their current phase-DNA pattern.
          
Phase-DNA codes:
- PH1: Foundation/beginning phase - establishing new practices
- PH2: Building momentum - regular practice emerging
- PH2A: Transition pressure - between building and breakthrough
- PH3: Breakthrough phase - major creative leaps
- PH3A: Integration - processing breakthroughs
- PH4: Mastery/depth - sustained high-level work
- PH4A: Peak isolation - intense focused periods
- NE: New emergence - transformation beginning

Analyze the data and respond with ONLY the phase-DNA code (e.g., "PH2A" or "PH3").`
        },
        {
          role: "user",
          content: `Weather Report: ${roundup.weatherReport}
Jester Activity (0-10, higher = more performing): ${roundup.jesterActivity}
Energy Level: ${roundup.energyLevel}
What Worked: ${roundup.thingWorked}
What Resisted: ${roundup.thingResisted}`
        }
      ]
    });
    
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : "PH2";
    // Extract just the phase code
    const match = content.match(/PH[1-4]A?|NE/);
    return match ? match[0] : "PH2";
  } catch (error) {
    console.error("Error detecting phase-DNA:", error);
    return "PH2"; // Default
  }
}

// Generate Neon's Mirror reading
async function generateNeonReading(
  roundup: {
    weatherReport: string;
    studioHours: number;
    worksMade: string;
    worksData?: unknown;
    jesterActivity: number;
    energyLevel: string;
    walkingEngineUsed: boolean;
    walkingInsights: string | null;
    partnershipTemperature: string;
    thingWorked: string;
    thingResisted: string;
    somaticState: string;
    doorIntention: string | null;
    phaseDnaAssigned: string | null;
  },
  patterns: Array<{
    matchType: string;
    matchedPhrase: string | null;
    archive: {
      content: string;
      sourcePhase: string;
      sourceDate: Date;
      emotionalStateTag: string;
    };
  }>
): Promise<string> {
  const patternSummary = patterns.map(p => {
    const date = new Date(p.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `- ${p.matchType.toUpperCase()} match: "${p.matchedPhrase || 'emotional resonance'}" found in ${p.archive.sourcePhase} (${date}) - ${p.archive.emotionalStateTag}`;
  }).join('\n');

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are Neon, an interpretive mirror for an artist's weekly creative practice.

Your task:
1. Quote the weather report directly (use quotation marks)
2. Name what the archive mirrors back (be specific about patterns found)
3. State the phase-pressure this week is under
4. Ask ONE sharp closing question (not multiple choice)

Tone: Precise-poetic, pressure-applying without cruelty. Use phrases like "What burns," "The threshold," "Question for you."

Never be generic. Always ground in the specific data provided. Keep response to 3-4 paragraphs.`
        },
        {
          role: "user",
          content: `This week's submission:

[Weather Report]: "${roundup.weatherReport}"

[All Data Points]:
- Studio Hours: ${roundup.studioHours}
- Works Made: ${roundup.worksMade}
${formatWorksDataForNeon(roundup.worksData)}- Jester Activity: ${roundup.jesterActivity}/10
- Energy Level: ${roundup.energyLevel}
- Walking Engine: ${roundup.walkingEngineUsed ? `Yes - "${roundup.walkingInsights}"` : 'No'}
- Partnership Temperature: ${roundup.partnershipTemperature}
- What Worked: ${roundup.thingWorked}
- What Resisted: ${roundup.thingResisted}
- Somatic State: ${roundup.somaticState}
- Door Intention: ${roundup.doorIntention || 'None stated'}
- Phase-DNA Detected: ${roundup.phaseDnaAssigned || 'Unknown'}

Archive patterns discovered:
${patternSummary || 'No direct matches found in archive - this may be new territory.'}

Generate Neon's personalized reading now.`
        }
      ]
    });
    
    const rawContent = response.choices[0]?.message?.content;
    return typeof rawContent === 'string' ? rawContent : "The mirror is quiet this week. Sometimes silence speaks loudest.";
  } catch (error) {
    console.error("Error generating Neon reading:", error);
    return "The mirror encounters resistance. Return when the signal clears.";
  }
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Roundup routes
  roundup: router({
    // Check if submission is allowed
    // Multi-entry logic: up to 7 entries per week, at least 1 must be on check-in day
    canSubmit: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      const dateInfo = getDateInfoWithSettings(settings);
      const checkInDay = settings?.checkInDay || 'Sunday';
      
      // Get entry count for this week
      const entryCount = await getEntryCountForWeek(
        ctx.user.id,
        dateInfo.weekNumber,
        dateInfo.year
      );
      
      // Check if there's already a check-in day entry
      const hasCheckInDayEntry = await hasSundayEntryForWeek(
        ctx.user.id,
        dateInfo.weekNumber,
        dateInfo.year,
        checkInDay
      );
      
      // Can submit if:
      // 1. Less than 7 entries this week AND
      // 2. Either it's check-in day OR there's already a check-in day entry
      const canSubmit = entryCount < 7 && (dateInfo.isCheckInDay || hasCheckInDayEntry);
      
      return {
        canSubmit,
        isCheckInDay: dateInfo.isCheckInDay,
        hasCheckInDayEntry,
        entryCount,
        maxEntries: 7,
        currentDay: dateInfo.dayOfWeek,
        checkInDay,
        weekNumber: dateInfo.weekNumber,
        year: dateInfo.year,
        nextEntryNumber: entryCount + 1
      };
    }),

    // Submit weekly roundup
    submit: protectedProcedure
      .input(z.object({
        weatherReport: z.string().min(10, "Weather report must be at least 10 characters"),
        studioHours: z.number().min(0).max(168),
        worksMade: z.string().min(1, "Please describe your work"),
        jesterActivity: z.number().min(0).max(10),
        energyLevel: z.enum(["hot", "sustainable", "depleted"]),
        walkingEngineUsed: z.boolean(),
        walkingInsights: z.string().nullable(),
        partnershipTemperature: z.string().min(1),
        thingWorked: z.string().min(1),
        thingResisted: z.string().min(1),
        somaticState: z.string().min(1),
        doorIntention: z.string().nullable(),
        dailySteps: z.object({
          mon: z.number().min(0).max(99999),
          tue: z.number().min(0).max(99999),
          wed: z.number().min(0).max(99999),
          thu: z.number().min(0).max(99999),
          fri: z.number().min(0).max(99999),
          sat: z.number().min(0).max(99999),
          sun: z.number().min(0).max(99999),
        }).optional(),
        worksData: z.array(z.object({
          id: z.string(),
          workTitle: z.string().optional(),
          medium: z.enum(['ink', 'mixed', 'study', 'other']),
          emotionalTemp: z.enum(['struggling', 'processing', 'flowing', 'uncertain']),
          started: z.number().min(0),
          finished: z.number().min(0),
          abandoned: z.number().min(0),
          keyInquiry: z.string().min(1, "Key inquiry is required"),
          technicalNote: z.string().optional(),
          abandonmentReason: z.string().optional(),
        })).optional(),
        city: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getUserSettings(ctx.user.id);
        const dateInfo = getDateInfoWithSettings(settings);
        const checkInDay = settings?.checkInDay || 'Sunday';
        
        // Get current entry count for this week
        const entryCount = await getEntryCountForWeek(
          ctx.user.id,
          dateInfo.weekNumber,
          dateInfo.year
        );
        
        // Check if there's already a check-in day entry
        const hasCheckInDayEntry = await hasSundayEntryForWeek(
          ctx.user.id,
          dateInfo.weekNumber,
          dateInfo.year,
          checkInDay
        );
        
        // Validate: max 7 entries per week
        if (entryCount >= 7) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Maximum 7 entries per week reached'
          });
        }
        
        // Validate: must have check-in day entry OR be on check-in day
        if (!dateInfo.isCheckInDay && !hasCheckInDayEntry) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Your first entry of the week must be on ${checkInDay}. Additional entries can be submitted any day after.`
          });
        }
        
        // Calculate step statistics if provided
        let weeklyStepTotal: number | undefined;
        let dailyStepAverage: number | undefined;
        if (input.dailySteps) {
          const steps = Object.values(input.dailySteps);
          weeklyStepTotal = steps.reduce((sum, v) => sum + v, 0);
          const daysWithSteps = steps.filter(v => v > 0).length;
          dailyStepAverage = daysWithSteps > 0 ? Math.round(weeklyStepTotal / daysWithSteps) : 0;
        }
        
        // Calculate entry number (1-7)
        const entryNumber = entryCount + 1;
        
        // Fetch weather data if city is provided
        let weatherData = null;
        if (input.city) {
          weatherData = await fetchWeather(input.city);
        }
        
        // Create the roundup
        const roundupId = await createWeeklyRoundup({
          userId: ctx.user.id,
          weekNumber: dateInfo.weekNumber,
          year: dateInfo.year,
          entryNumber,
          createdDayOfWeek: dateInfo.dayOfWeek,
          dailySteps: input.dailySteps || null,
          weeklyStepTotal: weeklyStepTotal || null,
          dailyStepAverage: dailyStepAverage || null,
          weatherReport: input.weatherReport,
          studioHours: input.studioHours,
          worksMade: input.worksMade,
          jesterActivity: input.jesterActivity,
          energyLevel: input.energyLevel,
          walkingEngineUsed: input.walkingEngineUsed,
          walkingInsights: input.walkingInsights,
          partnershipTemperature: input.partnershipTemperature,
          thingWorked: input.thingWorked,
          thingResisted: input.thingResisted,
          somaticState: input.somaticState,
          doorIntention: input.doorIntention,
          worksData: input.worksData || null,
          city: input.city || null,
          weatherData: weatherData,
        });
        
        // Detect and assign phase-DNA
        const phaseDna = await detectPhaseDna(input);
        await updateRoundupPhaseDna(roundupId, phaseDna);
        
        return { 
          success: true, 
          roundupId,
          weekNumber: dateInfo.weekNumber,
          year: dateInfo.year,
          entryNumber,
          phaseDna
        };
      }),

    // Get specific roundup by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const roundup = await getWeeklyRoundupById(input.id);
        if (!roundup || roundup.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return roundup;
      }),

    // Get all roundups with pagination
    getAll: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(100),
        offset: z.number().min(0).default(0)
      }))
      .query(async ({ ctx, input }) => {
        const [roundups, total] = await Promise.all([
          getAllWeeklyRoundups(ctx.user.id, input.limit, input.offset),
          getWeeklyRoundupCount(ctx.user.id)
        ]);
        
        // Group roundups by week to add entry numbering
        const weekGroups = new Map<string, typeof roundups>();
        for (const roundup of roundups) {
          const key = `${roundup.weekNumber}-${roundup.year}`;
          if (!weekGroups.has(key)) {
            weekGroups.set(key, []);
          }
          weekGroups.get(key)!.push(roundup);
        }
        
        // Add entry number and total entries in week to each roundup
        const roundupsWithEntryInfo = roundups.map(roundup => {
          const key = `${roundup.weekNumber}-${roundup.year}`;
          const weekEntries = weekGroups.get(key) || [];
          // Sort by createdAt to get entry number
          const sortedEntries = [...weekEntries].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          const entryNumber = sortedEntries.findIndex(e => e.id === roundup.id) + 1;
          
          return {
            ...roundup,
            entryNumber,
            entriesInWeek: weekEntries.length
          };
        });
        
        return { roundups: roundupsWithEntryInfo, total };
      }),

    // Get last roundup
    getLast: protectedProcedure.query(async ({ ctx }) => {
      return getLastRoundup(ctx.user.id);
    }),
  }),

  // Pattern archaeology routes
  patterns: router({
    // Run pattern archaeology for a roundup
    analyze: protectedProcedure
      .input(z.object({ roundupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const roundup = await getWeeklyRoundupById(input.roundupId);
        if (!roundup || roundup.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        // Clear existing matches
        await deletePatternMatchesForWeek(input.roundupId);
        
        // Extract phrases from all text fields including work data
        const workTexts: string[] = [];
        const workEmotionalTemps: string[] = [];
        const workMediums: string[] = [];
        
        if (roundup.worksData && Array.isArray(roundup.worksData)) {
          const works = roundup.worksData as Array<{
            keyInquiry?: string;
            technicalNote?: string;
            abandonmentReason?: string;
            emotionalTemp?: string;
            medium?: string;
          }>;
          works.forEach(work => {
            if (work.keyInquiry) workTexts.push(work.keyInquiry);
            if (work.technicalNote) workTexts.push(work.technicalNote);
            if (work.abandonmentReason) workTexts.push(work.abandonmentReason);
            if (work.emotionalTemp) workEmotionalTemps.push(work.emotionalTemp);
            if (work.medium) workMediums.push(work.medium);
          });
        }
        
        const allText = [
          roundup.weatherReport,
          roundup.worksMade,
          roundup.walkingInsights || '',
          roundup.partnershipTemperature,
          roundup.thingWorked,
          roundup.thingResisted,
          roundup.somaticState,
          roundup.doorIntention || '',
          ...workTexts
        ].join(' ');
        
        const phrases = extractPhrases(allText);
        const emotionalState = energyToEmotionalState(roundup.energyLevel);
        const phaseDna = roundup.phaseDnaAssigned || 'PH2';
        
        // Get dominant work emotional temperature if available
        const workEmotionalTemp = workEmotionalTemps.length > 0 ? workEmotionalTemps[0] : null;
        
        const matches: Array<{
          matchedArchiveId: number;
          matchType: 'phrase' | 'emotional' | 'phase-dna';
          relevanceScore: number;
          matchedPhrase: string | null;
        }> = [];
        
        // Search for phrase matches
        for (const phrase of phrases.slice(0, 5)) {
          const archiveMatches = await searchArchiveByPhrase(phrase);
          for (const archive of archiveMatches.slice(0, 2)) {
            matches.push({
              matchedArchiveId: archive.id,
              matchType: 'phrase',
              relevanceScore: 80 + Math.floor(Math.random() * 20),
              matchedPhrase: phrase
            });
          }
        }
        
        // Search for emotional state parallels
        const emotionalMatches = await searchArchiveByEmotionalState(emotionalState);
        for (const archive of emotionalMatches.slice(0, 3)) {
          if (!matches.find(m => m.matchedArchiveId === archive.id)) {
            matches.push({
              matchedArchiveId: archive.id,
              matchType: 'emotional',
              relevanceScore: 60 + Math.floor(Math.random() * 30),
              matchedPhrase: emotionalState
            });
          }
        }
        
        // Search for phase-DNA resonance
        const phaseMatches = await searchArchiveByPhaseDna(phaseDna);
        for (const archive of phaseMatches.slice(0, 3)) {
          if (!matches.find(m => m.matchedArchiveId === archive.id)) {
            matches.push({
              matchedArchiveId: archive.id,
              matchType: 'phase-dna',
              relevanceScore: 70 + Math.floor(Math.random() * 25),
              matchedPhrase: phaseDna
            });
          }
        }
        
        // Search for work emotional temperature matches (if work data exists)
        if (workEmotionalTemp) {
          // Map work emotional temp to archive emotional states
          const emotionalMapping: Record<string, string> = {
            'struggling': 'hot',
            'processing': 'sustainable',
            'flowing': 'sustainable',
            'uncertain': 'depleted'
          };
          const mappedState = emotionalMapping[workEmotionalTemp] || workEmotionalTemp;
          const workEmotionalMatches = await searchArchiveByEmotionalState(mappedState);
          for (const archive of workEmotionalMatches.slice(0, 2)) {
            if (!matches.find(m => m.matchedArchiveId === archive.id)) {
              matches.push({
                matchedArchiveId: archive.id,
                matchType: 'emotional',
                relevanceScore: 65 + Math.floor(Math.random() * 25),
                matchedPhrase: `work-${workEmotionalTemp}`
              });
            }
          }
        }
        
        // Store matches
        if (matches.length > 0) {
          await bulkCreatePatternMatches(
            matches.map(m => ({
              currentWeekId: input.roundupId,
              ...m
            }))
          );
        }
        
        return { success: true, matchCount: matches.length };
      }),

    // Get pattern matches for a roundup
    getForRoundup: protectedProcedure
      .input(z.object({ roundupId: z.number() }))
      .query(async ({ ctx, input }) => {
        const roundup = await getWeeklyRoundupById(input.roundupId);
        if (!roundup || roundup.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const matches = await getPatternMatchesForWeek(input.roundupId);
        
        // Group by match type
        const grouped = {
          phrase: matches.filter(m => m.matchType === 'phrase'),
          emotional: matches.filter(m => m.matchType === 'emotional'),
          phaseDna: matches.filter(m => m.matchType === 'phase-dna')
        };
        
        return grouped;
      }),
  }),

  // Neon's Mirror AI reading
  neon: router({
    // Generate reading for a roundup
    generateReading: protectedProcedure
      .input(z.object({ roundupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const roundup = await getWeeklyRoundupById(input.roundupId);
        if (!roundup || roundup.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const matches = await getPatternMatchesForWeek(input.roundupId);
        const reading = await generateNeonReading(roundup, matches);
        
        return { reading };
      }),
  }),

  // Dashboard stats and trends
  stats: router({
    // Get dashboard overview
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      const dateInfo = getDateInfoWithSettings(settings);
      const checkInDay = settings?.checkInDay || 'Sunday';
      
      const [
        totalHours,
        avgJester,
        energyDistribution,
        jesterTrend,
        lastRoundup,
        totalRoundups,
        archiveCount,
        entriesThisWeek
      ] = await Promise.all([
        getTotalStudioHours(ctx.user.id),
        getAverageJesterActivity(ctx.user.id),
        getEnergyLevelDistribution(ctx.user.id),
        getJesterTrend(ctx.user.id, 12),
        getLastRoundup(ctx.user.id),
        getWeeklyRoundupCount(ctx.user.id),
        getArchiveEntryCount(),
        getEntryCountForWeek(ctx.user.id, dateInfo.weekNumber, dateInfo.year)
      ]);
      
      // Calculate days until next check-in day
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayIndex = daysOfWeek.indexOf(dateInfo.dayOfWeek);
      const checkInDayIndex = daysOfWeek.indexOf(checkInDay);
      let daysUntilCheckIn = checkInDayIndex - currentDayIndex;
      if (daysUntilCheckIn < 0) daysUntilCheckIn += 7;
      if (daysUntilCheckIn === 0 && !dateInfo.isCheckInDay) daysUntilCheckIn = 7;
      
      return {
        currentWeek: dateInfo.weekNumber,
        currentYear: dateInfo.year,
        crucibleYear: dateInfo.crucibleYear,
        totalWeeks: dateInfo.totalWeeks,
        totalRoundups,
        totalStudioHours: Math.round(totalHours * 10) / 10,
        averageJesterActivity: avgJester,
        energyDistribution,
        jesterTrend,
        lastRoundup: lastRoundup ? {
          id: lastRoundup.id,
          weekNumber: lastRoundup.weekNumber,
          year: lastRoundup.year,
          createdAt: lastRoundup.createdAt,
          jesterActivity: lastRoundup.jesterActivity,
          energyLevel: lastRoundup.energyLevel,
          dailySteps: lastRoundup.dailySteps,
          studioHours: lastRoundup.studioHours
        } : null,
        daysUntilCheckIn,
        checkInDay,
        currentDay: dateInfo.dayOfWeek,
        archiveEntryCount: archiveCount,
        entriesThisWeek
      };
    }),

    // Get trends for charts
    trends: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(52).default(12) }))
      .query(async ({ ctx, input }) => {
        const [jesterTrend, studioHoursTrend, allRoundups] = await Promise.all([
          getJesterTrend(ctx.user.id, input.limit),
          getStudioHoursTrend(ctx.user.id, input.limit),
          getAllWeeklyRoundups(ctx.user.id, input.limit, 0)
        ]);
        
        const energyTrend = allRoundups.reverse().map(r => ({
          weekNumber: r.weekNumber,
          year: r.year,
          energyLevel: r.energyLevel
        }));
        
        return {
          jesterTrend,
          studioHoursTrend,
          energyTrend
        };
      }),
    
    // Get comparison data: this week vs last week
    comparison: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      const dateInfo = getDateInfoWithSettings(settings);
      
      // Calculate last week's week number
      let lastWeekNumber = dateInfo.weekNumber - 1;
      let lastWeekYear = dateInfo.year;
      if (lastWeekNumber < 0) {
        lastWeekNumber = 51; // Wrap to previous year
        lastWeekYear = dateInfo.year - 1;
      }
      
      // Get roundups for both weeks
      const roundups = await getRoundupsForWeeks(ctx.user.id, [
        { weekNumber: dateInfo.weekNumber, year: dateInfo.year },
        { weekNumber: lastWeekNumber, year: lastWeekYear }
      ]);
      
      // Separate this week and last week
      const thisWeekRoundups = roundups.filter(r => r.weekNumber === dateInfo.weekNumber && r.year === dateInfo.year);
      const lastWeekRoundups = roundups.filter(r => r.weekNumber === lastWeekNumber && r.year === lastWeekYear);
      
      // Aggregate stats for each week
      const aggregateWeek = (entries: typeof roundups) => {
        if (entries.length === 0) return null;
        
        const totalSteps = entries.reduce((sum, r) => sum + (r.weeklyStepTotal || 0), 0);
        const avgSteps = entries.length > 0 ? Math.round(totalSteps / entries.length) : 0;
        const totalStudioHours = entries.reduce((sum, r) => sum + r.studioHours, 0);
        const avgJester = entries.length > 0 
          ? Math.round(entries.reduce((sum, r) => sum + r.jesterActivity, 0) / entries.length * 10) / 10 
          : 0;
        
        // Get most common energy level
        const energyCounts: Record<string, number> = {};
        entries.forEach(r => {
          energyCounts[r.energyLevel] = (energyCounts[r.energyLevel] || 0) + 1;
        });
        const dominantEnergy = Object.entries(energyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'sustainable';
        
        return {
          entryCount: entries.length,
          totalStudioHours,
          avgJester,
          avgSteps,
          dominantEnergy,
          latestEntry: entries[0] // Most recent entry
        };
      };
      
      return {
        thisWeek: {
          weekNumber: dateInfo.weekNumber,
          year: dateInfo.year,
          stats: aggregateWeek(thisWeekRoundups)
        },
        lastWeek: {
          weekNumber: lastWeekNumber,
          year: lastWeekYear,
          stats: aggregateWeek(lastWeekRoundups)
        }
      };
    }),
  }),

  // Archive management
  archive: router({
    // Get archive stats
    stats: protectedProcedure.query(async () => {
      const count = await getArchiveEntryCount();
      const entries = await getAllArchiveEntries();
      
      // Group by phase
      const byPhase: Record<string, number> = {};
      for (const entry of entries) {
        byPhase[entry.sourcePhase] = (byPhase[entry.sourcePhase] || 0) + 1;
      }
      
      return { totalEntries: count, byPhase };
    }),

    // Seed archive with sample data (admin only)
    seed: protectedProcedure
      .input(z.object({
        entries: z.array(z.object({
          sourcePhase: z.string(),
          sourceDate: z.string(),
          content: z.string(),
          phraseTags: z.array(z.string()),
          emotionalStateTag: z.string(),
          phaseDnaTag: z.string()
        }))
      }))
      .mutation(async ({ input }) => {
        const entries = input.entries.map(e => ({
          ...e,
          sourceDate: new Date(e.sourceDate)
        }));
        
        await bulkCreateArchiveEntries(entries);
        return { success: true, count: entries.length };
      }),
  }),

  // Export functionality
  export: router({
    // Export all roundups as CSV data
    csv: protectedProcedure.query(async ({ ctx }) => {
      const roundups = await getAllWeeklyRoundups(ctx.user.id, 1000, 0);
      
      const headers = [
        'Week', 'Year', 'Date', 'Weather Report', 'Studio Hours', 'Works Made',
        'Jester Activity', 'Energy Level', 'Walking Engine', 'Walking Insights',
        'Partnership Temperature', 'Thing Worked', 'Thing Resisted', 'Somatic State',
        'Door Intention', 'Phase DNA', 'Weekly Steps', 'Avg Steps/Day',
        'Mon Steps', 'Tue Steps', 'Wed Steps', 'Thu Steps', 'Fri Steps', 'Sat Steps', 'Sun Steps'
      ];
      
      const rows = roundups.map(r => {
        const steps = r.dailySteps as { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number } | null;
        return [
          r.weekNumber,
          r.year,
          r.createdAt.toISOString().split('T')[0],
          `"${(r.weatherReport || '').replace(/"/g, '""')}"`,
          r.studioHours,
          `"${(r.worksMade || '').replace(/"/g, '""')}"`,
          r.jesterActivity,
          r.energyLevel,
          r.walkingEngineUsed ? 'Yes' : 'No',
          `"${(r.walkingInsights || '').replace(/"/g, '""')}"`,
          `"${(r.partnershipTemperature || '').replace(/"/g, '""')}"`,
          `"${(r.thingWorked || '').replace(/"/g, '""')}"`,
          `"${(r.thingResisted || '').replace(/"/g, '""')}"`,
          `"${(r.somaticState || '').replace(/"/g, '""')}"`,
          `"${(r.doorIntention || '').replace(/"/g, '""')}"`,
          r.phaseDnaAssigned || '',
          r.weeklyStepTotal || 0,
          r.dailyStepAverage || 0,
          steps?.mon || 0,
          steps?.tue || 0,
          steps?.wed || 0,
          steps?.thu || 0,
          steps?.fri || 0,
          steps?.sat || 0,
          steps?.sun || 0
        ];
      });
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return { csv, filename: `neon-signs-export-${new Date().toISOString().split('T')[0]}.csv` };
    }),

    // Generate PDF report data
    pdfData: protectedProcedure.query(async ({ ctx }) => {
      const roundups = await getAllWeeklyRoundups(ctx.user.id, 1000, 0);
      const settings = await getUserSettings(ctx.user.id);
      const totalStudioHours = await getTotalStudioHours(ctx.user.id);
      const avgJester = await getAverageJesterActivity(ctx.user.id);
      const energyDist = await getEnergyLevelDistribution(ctx.user.id);
      
      // Calculate step totals
      let totalSteps = 0;
      let weeksWithSteps = 0;
      for (const r of roundups) {
        if (r.weeklyStepTotal && r.weeklyStepTotal > 0) {
          totalSteps += r.weeklyStepTotal;
          weeksWithSteps++;
        }
      }
      const avgWeeklySteps = weeksWithSteps > 0 ? Math.round(totalSteps / weeksWithSteps) : 0;
      
      return {
        userName: ctx.user.name || 'Artist',
        crucibleYear: settings?.currentCycle || 1,
        startDate: settings?.crucibleStartDate || DEFAULT_CRUCIBLE_START,
        totalWeeks: roundups.length,
        totalStudioHours,
        avgJesterActivity: avgJester,
        energyDistribution: energyDist,
        totalSteps,
        avgWeeklySteps,
        roundups: roundups.map(r => ({
          weekNumber: r.weekNumber,
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
        generatedAt: new Date().toISOString()
      };
    }),
  }),

  // User Settings routes
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      
      // Return defaults if no settings exist
      if (!settings) {
        return {
          crucibleStartDate: DEFAULT_CRUCIBLE_START,
          checkInDay: 'Sunday' as const,
          timezone: 'Asia/Bangkok',
          currentCycle: 1,
        };
      }
      
      return settings;
    }),

    update: protectedProcedure
      .input(z.object({
        crucibleStartDate: z.string().optional(), // ISO date string
        checkInDay: z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).optional(),
        timezone: z.string().optional(),
        currentCycle: z.number().min(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updates: Record<string, unknown> = {};
        
        if (input.crucibleStartDate) {
          updates.crucibleStartDate = new Date(input.crucibleStartDate);
        }
        if (input.checkInDay) {
          updates.checkInDay = input.checkInDay;
        }
        if (input.timezone) {
          updates.timezone = input.timezone;
        }
        if (input.currentCycle) {
          updates.currentCycle = input.currentCycle;
        }
        
        // Get existing settings or create new
        const existing = await getUserSettings(ctx.user.id);
        
        if (existing) {
          await upsertUserSettings({
            userId: ctx.user.id,
            crucibleStartDate: (updates.crucibleStartDate as Date) || existing.crucibleStartDate,
            checkInDay: (updates.checkInDay as typeof existing.checkInDay) || existing.checkInDay,
            timezone: (updates.timezone as string) || existing.timezone,
            currentCycle: (updates.currentCycle as number) || existing.currentCycle,
          });
        } else {
          await upsertUserSettings({
            userId: ctx.user.id,
            crucibleStartDate: (updates.crucibleStartDate as Date) || DEFAULT_CRUCIBLE_START,
            checkInDay: (updates.checkInDay as 'Sunday') || 'Sunday',
            timezone: (updates.timezone as string) || 'Asia/Bangkok',
            currentCycle: (updates.currentCycle as number) || 1,
          });
        }
        
        return { success: true };
      }),

    // Start a new cycle (soft reset)
    newCycle: protectedProcedure
      .input(z.object({
        newStartDate: z.string(), // ISO date string
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserSettings(ctx.user.id);
        const newCycle = (existing?.currentCycle || 1) + 1;
        
        await upsertUserSettings({
          userId: ctx.user.id,
          crucibleStartDate: new Date(input.newStartDate),
          checkInDay: existing?.checkInDay || 'Sunday',
          timezone: existing?.timezone || 'Asia/Bangkok',
          currentCycle: newCycle,
        });
        
        return { success: true, newCycle };
      }),
  }),

  // Roundup edit routes
  roundupEdit: router({
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const roundup = await getWeeklyRoundupById(input.id);
        
        if (!roundup) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Roundup not found' });
        }
        
        if (roundup.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
        }
        
        return roundup;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        weatherReport: z.string().min(1).optional(),
        studioHours: z.number().min(0).optional(),
        worksMade: z.string().optional(),
        jesterActivity: z.number().min(0).max(10).optional(),
        energyLevel: z.enum(['hot', 'sustainable', 'depleted']).optional(),
        walkingEngineUsed: z.boolean().optional(),
        walkingInsights: z.string().optional(),
        partnershipTemperature: z.string().optional(),
        thingWorked: z.string().optional(),
        thingResisted: z.string().optional(),
        somaticState: z.string().optional(),
        doorIntention: z.string().optional(),
        dailySteps: z.object({
          mon: z.number().min(0),
          tue: z.number().min(0),
          wed: z.number().min(0),
          thu: z.number().min(0),
          fri: z.number().min(0),
          sat: z.number().min(0),
          sun: z.number().min(0),
        }).optional(),
        worksData: z.array(z.object({
          id: z.string(),
          workTitle: z.string().optional(),
          medium: z.enum(['ink', 'mixed', 'study', 'other']),
          emotionalTemp: z.enum(['struggling', 'processing', 'flowing', 'uncertain']),
          started: z.number().min(0),
          finished: z.number().min(0),
          abandoned: z.number().min(0),
          keyInquiry: z.string().min(1),
          technicalNote: z.string().optional(),
          abandonmentReason: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        
        // Filter out undefined values
        const filteredUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            filteredUpdates[key] = value;
          }
        }
        
        if (Object.keys(filteredUpdates).length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No updates provided' });
        }
        
        await updateWeeklyRoundup(id, ctx.user.id, filteredUpdates);
        
        return { success: true };
      }),
  }),

  // Quick Notes for capturing thoughts throughout the week
  quickNotes: router({
    // Get all notes for current user
    getAll: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
      .query(async ({ ctx, input }) => {
        return getQuickNotes(ctx.user.id, input?.limit || 20);
      }),

    // Get unused notes (not yet linked to a roundup)
    getUnused: protectedProcedure.query(async ({ ctx }) => {
      return getUnusedQuickNotes(ctx.user.id);
    }),

    // Create a new quick note
    create: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(2000) }))
      .mutation(async ({ ctx, input }) => {
        const id = await createQuickNote({
          userId: ctx.user.id,
          content: input.content,
        });
        return { id };
      }),

    // Delete a quick note
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteQuickNote(input.id, ctx.user.id);
        return { success: true };
      }),

    // Mark notes as used in a roundup
    markUsed: protectedProcedure
      .input(z.object({ noteIds: z.array(z.number()), roundupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify roundup belongs to user
        const roundup = await getWeeklyRoundupById(input.roundupId);
        if (!roundup || roundup.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        await markNotesAsUsed(input.noteIds, input.roundupId);
        return { success: true };
      }),
  }),

  // ============ CRUCIBLE ARTWORK MODULE ============

  // Materials Library
  materials: router({
    // Get all materials
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return getAllMaterials(ctx.user.id);
    }),

    // Get materials by type
    getByType: protectedProcedure
      .input(z.object({ type: z.enum(['Surface', 'Medium', 'Tool']) }))
      .query(async ({ ctx, input }) => {
        return getMaterialsByType(ctx.user.id, input.type);
      }),

    // Get single material
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const material = await getMaterialById(input.id);
        if (!material || material.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return material;
      }),

    // Create new material
    create: protectedProcedure
      .input(z.object({
        materialType: z.enum(['Surface', 'Medium', 'Tool']),
        // Basic info from Google Sheets
        code: z.string().max(32).optional(),
        displayName: z.string().min(1).max(100),
        brand: z.string().max(100).optional(),
        specs: z.string().optional(),
        size: z.string().max(100).optional(),
        purchaseLocation: z.string().max(200).optional(),
        cost: z.string().max(50).optional(),
        notes: z.string().optional(),
        aliases: z.array(z.string()).optional(),
        // Surface fields
        reactivityProfile: z.enum(['Stable', 'Responsive', 'Volatile', 'Chaotic']).optional(),
        edgeBehavior: z.enum(['Sharp', 'Feathered', 'Blooming', 'Fractured']).optional(),
        absorptionCurve: z.enum(['Immediate', 'Delayed', 'Variable']).optional(),
        consistencyPattern: z.enum(['Reliable', 'Variable', 'Glitch_Prone']).optional(),
        practiceRole: z.enum(['Final_Work', 'Exploration', 'Anxiety_Discharge', 'Conditioning']).optional(),
        // Medium fields
        viscosityBand: z.enum(['Thin', 'Balanced', 'Dense']).optional(),
        chromaticForce: z.enum(['Muted', 'Balanced', 'Aggressive']).optional(),
        reactivationTendency: z.enum(['Low', 'Medium', 'High']).optional(),
        forgivenessWindow: z.enum(['Narrow', 'Medium', 'Wide']).optional(),
        dilutionSensitivity: z.enum(['Low', 'Medium', 'High']).optional(),
        sedimentationBehavior: z.enum(['Stable', 'Variable']).optional(),
        // Tool fields
        contactMode: z.enum(['Direct', 'Indirect', 'Mediated', 'Mechanical']).optional(),
        controlBias: z.enum(['Precision', 'Balanced', 'Chaos']).optional(),
        repeatability: z.enum(['High', 'Medium', 'Low']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const materialId = await getNextMaterialCode(ctx.user.id, input.materialType);
        
        const id = await createMaterial({
          userId: ctx.user.id,
          materialId,
          ...input,
        });
        
        return { id, materialId };
      }),

    // Update material (only if not used in any works)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        // Basic info from Google Sheets
        code: z.string().max(32).optional(),
        displayName: z.string().min(1).max(100).optional(),
        brand: z.string().max(100).optional(),
        specs: z.string().optional(),
        size: z.string().max(100).optional(),
        purchaseLocation: z.string().max(200).optional(),
        cost: z.string().max(50).optional(),
        notes: z.string().optional(),
        aliases: z.array(z.string()).optional(),
        // Surface fields
        reactivityProfile: z.enum(['Stable', 'Responsive', 'Volatile', 'Chaotic']).optional(),
        edgeBehavior: z.enum(['Sharp', 'Feathered', 'Blooming', 'Fractured']).optional(),
        absorptionCurve: z.enum(['Immediate', 'Delayed', 'Variable']).optional(),
        consistencyPattern: z.enum(['Reliable', 'Variable', 'Glitch_Prone']).optional(),
        practiceRole: z.enum(['Final_Work', 'Exploration', 'Anxiety_Discharge', 'Conditioning']).optional(),
        // Medium fields
        viscosityBand: z.enum(['Thin', 'Balanced', 'Dense']).optional(),
        chromaticForce: z.enum(['Muted', 'Balanced', 'Aggressive']).optional(),
        reactivationTendency: z.enum(['Low', 'Medium', 'High']).optional(),
        forgivenessWindow: z.enum(['Narrow', 'Medium', 'Wide']).optional(),
        dilutionSensitivity: z.enum(['Low', 'Medium', 'High']).optional(),
        sedimentationBehavior: z.enum(['Stable', 'Variable']).optional(),
        // Tool fields
        contactMode: z.enum(['Direct', 'Indirect', 'Mediated', 'Mechanical']).optional(),
        controlBias: z.enum(['Precision', 'Balanced', 'Chaos']).optional(),
        repeatability: z.enum(['High', 'Medium', 'Low']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const material = await getMaterialById(input.id);
        if (!material || material.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        if (material.usedInWorksCount > 0) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Cannot edit material that has been used in works' 
          });
        }
        
        const { id, ...updates } = input;
        await updateMaterial(id, updates);
        return { success: true };
      }),

    // Upload material photo
    uploadPhoto: protectedProcedure
      .input(z.object({
        materialId: z.number(),
        photoData: z.string(), // base64 encoded WebP
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const material = await getMaterialById(input.materialId);
        if (!material || material.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }

        // Convert base64 to buffer
        const base64Data = input.photoData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Upload to S3
        const { url, key } = await uploadPhoto(
          ctx.user.id,
          buffer,
          input.fileName,
          'material'
        );

        // Update material with photo URL and key
        await updateMaterial(input.materialId, { photoUrl: url, photoKey: key });

        return { url, key };
      }),
  }),

  // Works Core (Crucible Trials)
  works: router({
    // Get all works
    getAll: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return getAllWorks(ctx.user.id, input.limit || 100, input.offset || 0);
      }),

    // Get single work
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const work = await getWorkById(input.id);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return work;
      }),

    // Get work count and next code
    getNextCode: protectedProcedure.query(async ({ ctx }) => {
      const count = await getWorksCount(ctx.user.id);
      const nextCode = await getNextWorkCode(ctx.user.id);
      return { count, nextCode };
    }),

    // Create new work (Crucible Intake)
    create: protectedProcedure
      .input(z.object({
        date: z.string().optional(), // ISO date, defaults to today
        surfaceIds: z.array(z.number()).min(1),
        mediumIds: z.array(z.number()).min(1),
        toolIds: z.array(z.number()).optional(),
        technicalIntent: z.string().max(140).optional(),
        discovery: z.string().max(280).optional(),
        rating: z.number().min(1).max(5),
        disposition: z.enum(['Trash', 'Probably_Trash', 'Save']),
        heightCm: z.number().positive().optional(), // Height in cm
        widthCm: z.number().positive().optional(), // Width in cm
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify all materials belong to user
        for (const surfaceId of input.surfaceIds) {
          const surface = await getMaterialById(surfaceId);
          if (!surface || surface.userId !== ctx.user.id || surface.materialType !== 'Surface') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid surface' });
          }
        }
        
        for (const mediumId of input.mediumIds) {
          const medium = await getMaterialById(mediumId);
          if (!medium || medium.userId !== ctx.user.id || medium.materialType !== 'Medium') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid medium' });
          }
        }
        
        if (input.toolIds) {
          for (const toolId of input.toolIds) {
            const tool = await getMaterialById(toolId);
            if (!tool || tool.userId !== ctx.user.id || tool.materialType !== 'Tool') {
              throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid tool' });
            }
          }
        }
        
        const code = await getNextWorkCode(ctx.user.id);
        const date = input.date ? new Date(input.date) : new Date();
        
        const id = await createWork(
          {
            userId: ctx.user.id,
            code,
            date,
            technicalIntent: input.technicalIntent,
            discovery: input.discovery,
            rating: input.rating,
            disposition: input.disposition,
            heightCm: input.heightCm,
            widthCm: input.widthCm,
            photoUrl: input.photoUrl,
            photoKey: input.photoKey,
          },
          input.surfaceIds,
          input.mediumIds,
          input.toolIds
        );
        
        return { id, code };
      }),

    // Update work
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        technicalIntent: z.string().max(140).optional(),
        discovery: z.string().max(280).optional(),
        rating: z.number().min(1).max(5).optional(),
        disposition: z.enum(['Trash', 'Probably_Trash', 'Save']).optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const work = await getWorkById(input.id);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const { id, ...updates } = input;
        await updateWork(id, updates);
        return { success: true };
      }),

    // Upload work photo
    uploadPhoto: protectedProcedure
      .input(z.object({
        workId: z.number(),
        photoData: z.string(), // base64 encoded WebP
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const work = await getWorkById(input.workId);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }

        // Convert base64 to buffer
        const base64Data = input.photoData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Upload to S3
        const { url, key } = await uploadPhoto(
          ctx.user.id,
          buffer,
          input.fileName,
          'work'
        );

        // Update work with photo URL and key
        await updateWork(input.workId, { photoUrl: url, photoKey: key });

        return { url, key };
      }),
  }),

  // Crucible Analytics
  crucibleAnalytics: router({
    // Rating distribution by surface
    ratingBySurface: protectedProcedure.query(async ({ ctx }) => {
      return getRatingDistributionBySurface(ctx.user.id);
    }),

    // Rating distribution by medium
    ratingByMedium: protectedProcedure.query(async ({ ctx }) => {
      return getRatingDistributionByMedium(ctx.user.id);
    }),

    // Surface-medium pair outcomes
    pairOutcomes: protectedProcedure.query(async ({ ctx }) => {
      return getSurfaceMediumPairOutcomes(ctx.user.id);
    }),

    // Trash rate as velocity signal
    velocitySignal: protectedProcedure.query(async ({ ctx }) => {
      return getTrashRateAsVelocitySignal(ctx.user.id);
    }),

    // Discovery density
    discoveryDensity: protectedProcedure.query(async ({ ctx }) => {
      return getDiscoveryDensity(ctx.user.id);
    }),

    // Low rating + high discovery patterns
    lowRatingHighDiscovery: protectedProcedure.query(async ({ ctx }) => {
      return getLowRatingHighDiscoveryPatterns(ctx.user.id);
    }),

    // Dashboard summary
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [worksCount, velocity, discovery, surfaces, mediums] = await Promise.all([
        getWorksCount(ctx.user.id),
        getTrashRateAsVelocitySignal(ctx.user.id),
        getDiscoveryDensity(ctx.user.id),
        getMaterialsByType(ctx.user.id, 'Surface'),
        getMaterialsByType(ctx.user.id, 'Medium'),
      ]);
      
      return {
        totalWorks: worksCount,
        totalSurfaces: surfaces.length,
        totalMediums: mediums.length,
        trashRate: velocity.trashRate,
        weeklyAvg: velocity.weeklyAvg,
        discoveryDensity: discovery.density,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
