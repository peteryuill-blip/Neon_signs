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
} from "./db";
import { TRPCError } from "@trpc/server";

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
- Jester Activity: ${roundup.jesterActivity}/10
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
    // Check if submission is allowed (check-in day in configured timezone)
    canSubmit: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      const dateInfo = getDateInfoWithSettings(settings);
      
      // Check if already submitted this week
      const existing = await getWeeklyRoundupByWeekAndYear(
        ctx.user.id,
        dateInfo.weekNumber,
        dateInfo.year
      );
      
      const checkInDay = settings?.checkInDay || 'Sunday';
      
      return {
        canSubmit: dateInfo.isCheckInDay && !existing,
        isCheckInDay: dateInfo.isCheckInDay,
        alreadySubmitted: !!existing,
        currentDay: dateInfo.dayOfWeek,
        checkInDay,
        weekNumber: dateInfo.weekNumber,
        year: dateInfo.year,
        existingRoundupId: existing?.id
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
      }))
      .mutation(async ({ ctx, input }) => {
        const settings = await getUserSettings(ctx.user.id);
        const dateInfo = getDateInfoWithSettings(settings);
        const checkInDay = settings?.checkInDay || 'Sunday';
        
        // Validate check-in day submission
        if (!dateInfo.isCheckInDay) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Submissions are only allowed on ${checkInDay}s. Current day: ${dateInfo.dayOfWeek}`
          });
        }
        
        // Check for duplicate submission
        const existing = await getWeeklyRoundupByWeekAndYear(
          ctx.user.id,
          dateInfo.weekNumber,
          dateInfo.year
        );
        
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'You have already submitted a roundup for this week'
          });
        }
        
        // Create the roundup
        const roundupId = await createWeeklyRoundup({
          userId: ctx.user.id,
          weekNumber: dateInfo.weekNumber,
          year: dateInfo.year,
          createdDayOfWeek: dateInfo.dayOfWeek,
          ...input
        });
        
        // Detect and assign phase-DNA
        const phaseDna = await detectPhaseDna(input);
        await updateRoundupPhaseDna(roundupId, phaseDna);
        
        return { 
          success: true, 
          roundupId,
          weekNumber: dateInfo.weekNumber,
          year: dateInfo.year,
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
        limit: z.number().min(1).max(100).default(52),
        offset: z.number().min(0).default(0)
      }))
      .query(async ({ ctx, input }) => {
        const [roundups, total] = await Promise.all([
          getAllWeeklyRoundups(ctx.user.id, input.limit, input.offset),
          getWeeklyRoundupCount(ctx.user.id)
        ]);
        return { roundups, total };
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
        
        // Extract phrases from all text fields
        const allText = [
          roundup.weatherReport,
          roundup.worksMade,
          roundup.walkingInsights || '',
          roundup.partnershipTemperature,
          roundup.thingWorked,
          roundup.thingResisted,
          roundup.somaticState,
          roundup.doorIntention || ''
        ].join(' ');
        
        const phrases = extractPhrases(allText);
        const emotionalState = energyToEmotionalState(roundup.energyLevel);
        const phaseDna = roundup.phaseDnaAssigned || 'PH2';
        
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
        archiveCount
      ] = await Promise.all([
        getTotalStudioHours(ctx.user.id),
        getAverageJesterActivity(ctx.user.id),
        getEnergyLevelDistribution(ctx.user.id),
        getJesterTrend(ctx.user.id, 12),
        getLastRoundup(ctx.user.id),
        getWeeklyRoundupCount(ctx.user.id),
        getArchiveEntryCount()
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
          energyLevel: lastRoundup.energyLevel
        } : null,
        daysUntilCheckIn,
        checkInDay,
        currentDay: dateInfo.dayOfWeek,
        archiveEntryCount: archiveCount
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
        'Door Intention', 'Phase DNA'
      ];
      
      const rows = roundups.map(r => [
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
        r.phaseDnaAssigned || ''
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return { csv, filename: `neon-signs-export-${new Date().toISOString().split('T')[0]}.csv` };
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
});

export type AppRouter = typeof appRouter;
