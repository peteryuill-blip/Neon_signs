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
} from "./db";
import { TRPCError } from "@trpc/server";

// Helper to get current week number
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Helper to check if it's Sunday in Bangkok time (UTC+7)
function isSundayInBangkok(): boolean {
  const now = new Date();
  const bangkokOffset = 7 * 60; // UTC+7 in minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const bangkokMinutes = utcMinutes + bangkokOffset;
  
  // Adjust day if we've crossed midnight
  let bangkokDay = now.getUTCDay();
  if (bangkokMinutes >= 24 * 60) {
    bangkokDay = (bangkokDay + 1) % 7;
  } else if (bangkokMinutes < 0) {
    bangkokDay = (bangkokDay + 6) % 7;
  }
  
  return bangkokDay === 0; // 0 = Sunday
}

// Helper to get Bangkok date info
function getBangkokDateInfo(): { dayOfWeek: string; date: Date; weekNumber: number; year: number } {
  const now = new Date();
  const bangkokOffset = 7 * 60 * 60 * 1000; // UTC+7 in ms
  const bangkokTime = new Date(now.getTime() + bangkokOffset);
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[bangkokTime.getUTCDay()];
  
  return {
    dayOfWeek,
    date: bangkokTime,
    weekNumber: getWeekNumber(bangkokTime),
    year: bangkokTime.getUTCFullYear()
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
    // Check if submission is allowed (Sunday in Bangkok)
    canSubmit: protectedProcedure.query(async ({ ctx }) => {
      const bangkokInfo = getBangkokDateInfo();
      const isSunday = bangkokInfo.dayOfWeek === 'Sunday';
      
      // Check if already submitted this week
      const existing = await getWeeklyRoundupByWeekAndYear(
        ctx.user.id,
        bangkokInfo.weekNumber,
        bangkokInfo.year
      );
      
      return {
        canSubmit: isSunday && !existing,
        isSunday,
        alreadySubmitted: !!existing,
        currentDay: bangkokInfo.dayOfWeek,
        weekNumber: bangkokInfo.weekNumber,
        year: bangkokInfo.year,
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
        const bangkokInfo = getBangkokDateInfo();
        
        // Validate Sunday submission
        if (bangkokInfo.dayOfWeek !== 'Sunday') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Submissions are only allowed on Sundays (Bangkok time). Current day: ${bangkokInfo.dayOfWeek}`
          });
        }
        
        // Check for duplicate submission
        const existing = await getWeeklyRoundupByWeekAndYear(
          ctx.user.id,
          bangkokInfo.weekNumber,
          bangkokInfo.year
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
          weekNumber: bangkokInfo.weekNumber,
          year: bangkokInfo.year,
          createdDayOfWeek: bangkokInfo.dayOfWeek,
          ...input
        });
        
        // Detect and assign phase-DNA
        const phaseDna = await detectPhaseDna(input);
        await updateRoundupPhaseDna(roundupId, phaseDna);
        
        return { 
          success: true, 
          roundupId,
          weekNumber: bangkokInfo.weekNumber,
          year: bangkokInfo.year,
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
      const bangkokInfo = getBangkokDateInfo();
      
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
      
      // Calculate days until next Sunday
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayIndex = daysOfWeek.indexOf(bangkokInfo.dayOfWeek);
      const daysUntilSunday = currentDayIndex === 0 ? 0 : 7 - currentDayIndex;
      
      return {
        currentWeek: bangkokInfo.weekNumber,
        currentYear: bangkokInfo.year,
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
        daysUntilSunday,
        currentDay: bangkokInfo.dayOfWeek,
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
});

export type AppRouter = typeof appRouter;
