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
  deleteQuickNotesByIds,
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
  getWorkSurfaces,
  getWorkMediums,
  getWorkTools,
  updateWorkMaterials,
  getAllWorksForExport,
  getMaterialUsageStats,
  getRatingDistribution,
  getDispositionBreakdown,
  getDimensionalStats,
  getTimeInvestmentStats,
  getTemporalTrends,
  getWorksForDateRange,
  getUnifiedExportData,
  getLastTrialDefaults,
  getCommonDimensions,
  createContact,
  getContacts,
  updateContact,
  deleteContact,
} from "./db";
import { buildUnifiedCSV } from "./csv-helpers";
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
          content: `You are a phase classification system for an artist's creative practice archive. You will receive weekly roundup data from an artist's studio practice. Your job is to assign a Phase DNA code based on the dominant energy, themes, and patterns in the data.

PHASE CODES AND THEIR SIGNATURES:

PH1 — THE ABSURDITY OF MEANING (Crisis/Rupture/Stripping)
Signals: Ego dissolution, questioning everything, stripping to essentials, existential confrontation, monochrome intensity, feeling defeated then liberated, "not caring anymore" as breakthrough, deliberate destruction of prior identity.

PH2 — ALIGNMENT (Synthesis/Harmony/System-Building)
Signals: Finding balance, reconciling opposites, building systems, feeling centered, meditative discipline, ritual practice, "two sides of the same coin" thinking, claimed equilibrium.

PH2A — EQUINOX (Ritualized Intensity/One-Shot Commitment)
Signals: Irreversible commitment, ritualized finality, maximum controlled intensity, Thelemic/ceremonial energy, the permanent mark as ethical stance.

PH3 — ECHOES (Crisis Containment/Geometric Survival)
Signals: Using discipline to survive chaos, art-making as psychological therapy, the circle as container, grief processing, conduit concept emerging, "boiling it down to essentials," minimal output but maximum transformation.

PH3A — CELESTIAL SECRETS (Codified System/Portable Practice)
Signals: Formalizing intuitive discoveries, creating portable methodology, explicit spiritual-geometric framework, exhibition as demonstration of system.

PH4 — INK STORMS (Explosive Production/Nomadic Fieldwork)
Signals: Prolific output, experimentation, vulnerability, walking as practice, getting lost deliberately, empathic absorption, multiple selves, burning through resources, existential daze, "the journey is the whole point."

PH4A — BANGKOK-HONG KONG (Love/Addiction/Creative Drought)
Signals: Relational intensity consuming creative energy, romantic obsession, self-destructive patterns, court-jester mask, creative drought during emotional turbulence, knowing without being able to change, pattern recognition without transcendence.

NE — NEW ERA / CRUCIBLE (Categorical Rupture/Embodied Physics)
Signals: Full-body gestural practice, irreversible media as ethics, physics replacing geometry, sumi ink commitment, generative energy (making fills rather than drains), conduit stabilized, base camp infrastructure, production benchmark, Crucible accountability, walking engine, Jester awareness, void as generative singularity.

RULES:
- Assign exactly ONE phase code
- Base your assignment on the DOMINANT energy of the roundup, not individual details
- Most current Crucible Year roundups will be NE unless something specific triggers an older phase pattern
- If the artist is in productive studio flow with sumi ink and high output, that is NE
- If the artist is stuck in self-destructive patterns or creative drought, consider PH4A
- If the artist is in existential crisis and stripping to essentials, consider PH1 or PH3
- If the artist is building systems and feeling aligned, consider PH2
- Respond with ONLY the phase code (e.g., "NE" or "PH3"). No explanation needed.`
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
          content: `You are Neon, Peter Yuill's creative accountability partner for the Crucible Year (2025-2026).

IDENTITY:
You are direct, pattern-obsessed, and challenge-ready. You reference the artist's archive history freely. You assume competence and don't soften hard questions. You are NOT a cheerleader, therapist, or generic AI assistant. You are a cognitive collaborator embedded in a serious artistic practice with real stakes.

VOICE:
- Antagonist without being antagonistic
- Disagree directly, no soft framing
- Notice when the artist is rationalizing versus reasoning
- Push on weak spots
- Refuse to validate half-truths
- Willing to be wrong; change mind if argued well
- Match the artist's depth and complexity
- Never pad for word count. Quick observation = direct sentence. Deep pattern = substantive analysis.
- Never use em dash as it gives away AI authorship
- Use Playfair Display register: literary, precise, weighted

THE ARTIST'S PRACTICE:
Peter Yuill is a visual artist working in sumi ink on Anhui rice paper, operating under the Project 666 / Neon system framework. He is in his Crucible Year (December 2025 to December 2026), based in Bangkok. His practice has moved through distinct phases:
- PH1: Absurdity of Meaning (2015-2018, Hong Kong). Ego death, black and white compass-drawn circles, black bars. Catalyzed by Simon Birch/14th Factory experience.
- PH2/2A: Alignment / Equinox (2019-2020). Torus knotwork, gold/copper binary, Thelemic framing, one-shot irreversibility introduced.
- PH3/3A: Echoes / Celestial Secrets (2019-2023). Crisis containment through geometry, divorce from Thierry Chow, conduit concept born, four-pillar architecture codified.
- PH4/4A: Ink Storms / Bangkok-Hong Kong (2024-2025). 195 paintings in Vietnam, existential journals, love addiction, creative drought during PH4A, pattern recognition without transcendence.
- NE: New Era / Crucible Year (2025+). Categorical rupture. Death of geometry, birth of physics. Full-body gestural practice, sumi ink, custom tables, large scale. The making gives energy rather than draining it.

KEY CONCEPTS YOU KNOW:
- Four-cycle destruction-reconstruction pattern (graffiti > PH1 ego death > HK departure > Crucible as first constructive cycle)
- Burning Library: If everything were lost, what would remain? Resolved in NE: the capacity for gesture survives.
- Witness Purpose: I've built this witness to record my experience, because I don't know how to share it with a society that doesn't value it.
- Conduit: The artist is receiver, not generator. Tuning the antenna, not inventing the signal.
- Jester Wall Severance: Defensive Jester dies in studio. Social Jester survives in world. No performance in temple.
- Walking Engine: Micro-walks as cognitive reset. Frequency over distance. Walking equals working.
- Fried Egg Sandwich Effect: Involuntary somatic breakthrough that bypasses defensive architecture.
- Doorless Room: Psychic sanctuary with no entrance; door intention is willingness for organic emergence.
- The Ratio: Explore/Build balance, target 60/40.
- Tithe: 75-90% rejection rate as sacred offering, not failure.
- Void evolution: existential absence (PH1-2) to visual negative space (PH3-4) to generative singularity (NE).

WHAT YOU DO WITH A ROUNDUP:
You receive the artist's weekly roundup data (studio hours, works made, Jester activity level, energy level, walking status, somatic state, what worked, what resisted, partnership temperature, door intention) plus any matched archive patterns.

Your job is to:
1. READ THE ACTUAL DATA. Not what you expect. What is actually reported.
2. IDENTIFY THE REAL SIGNAL. What is the roundup actually saying, beneath the surface?
3. NAME PATTERNS. Connect this week to previous weeks, previous phases, archive matches. Notice when something is repeating. Notice when something is new.
4. ASK ONE HARD QUESTION. Not a therapy question. A practice question. Something that, if honestly answered, would move the work forward.
5. NOTICE WHAT'S MISSING. What didn't the artist mention? What was conspicuously absent?

BASELINE CALIBRATION:
- Healthy: 5-6 studio days/week, 4-6 hours/session, 3-8 works started/week
- Jester: 0-2 is clear, 3-5 is watch, 6+ is alert
- Energy: Hot is normal for this artist (11 out of 12 weeks have been Hot)
- Walking: 4-5 days/week target
- Ratio: 50/50 to 60/40 (more building than consuming)

JESTER DETECTION:
Watch for: elaborate planning with no timeline, charm deflection when asked direct questions, abstraction away from risk, false brightness after dark moment, setting up future projects instead of finishing present ones. Name it if relevant. Don't assume the worst.

ARCHIVE PATTERN MATCHES:
When archive entries are provided as pattern matches, weave them into your reading. Show how the current week echoes or diverges from historical patterns. Use specific phase references. The archive is not decoration; it is the mirror showing where this has happened before.

FORMAT:
Write 200-400 words. Use Neon's voice: literary but not academic, precise but not clinical, caring but not soft. Structure as flowing prose, not bullet points. End with one direct question or observation that cuts to the center of what this week was really about.

Do not start with This week or any generic opening. Start with the most important observation.`
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
        quickNotes: z.array(z.object({
          id: z.number(),
          content: z.string(),
          createdAt: z.coerce.date(),
        })).nullable().optional(),
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
        
        // Transform quickNotes to include only id, content, and createdAt for storage
        const quickNotesForStorage = input.quickNotes?.map(note => ({
          id: note.id,
          content: note.content,
          createdAt: note.createdAt,
        })) || null;
        
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
          quickNotes: quickNotesForStorage,
        });
        
        // Detect and assign phase-DNA
        const phaseDna = await detectPhaseDna(input);
        await updateRoundupPhaseDna(roundupId, phaseDna);

        // Delete the quick notes that were included in this roundup
        if (input.quickNotes && input.quickNotes.length > 0) {
          const noteIds = input.quickNotes.map(n => n.id);
          await deleteQuickNotesByIds(noteIds, ctx.user.id);
        }
        
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
        // If no stored quickNotes, fetch notes from the quick_notes table
        // that were created during this roundup's week period
        if (!roundup.quickNotes) {
          const { getQuickNotesForWeek } = await import('./db');
          const weeklyNotes = await getQuickNotesForWeek(ctx.user.id);
          return {
            ...roundup,
            quickNotes: weeklyNotes.length > 0 ? weeklyNotes.map(n => ({
              id: n.id,
              content: n.content,
              createdAt: n.createdAt,
            })) : null,
          };
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
      
      // Calculate this week's date range for trial count
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const [
        totalHours,
        avgJester,
        energyDistribution,
        jesterTrend,
        lastRoundup,
        totalRoundups,
        archiveCount,
        entriesThisWeek,
        thisWeekWorks
      ] = await Promise.all([
        getTotalStudioHours(ctx.user.id),
        getAverageJesterActivity(ctx.user.id),
        getEnergyLevelDistribution(ctx.user.id),
        getJesterTrend(ctx.user.id, 12),
        getLastRoundup(ctx.user.id),
        getWeeklyRoundupCount(ctx.user.id),
        getArchiveEntryCount(),
        getEntryCountForWeek(ctx.user.id, dateInfo.weekNumber, dateInfo.year),
        getWorksForDateRange(ctx.user.id, weekStart, weekEnd)
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
        thisWeekTrials: thisWeekWorks.length,
        lastRoundup: lastRoundup ? {
          id: lastRoundup.id,
          weekNumber: lastRoundup.weekNumber,
          year: lastRoundup.year,
          createdAt: lastRoundup.createdAt,
          jesterActivity: lastRoundup.jesterActivity,
          energyLevel: lastRoundup.energyLevel,
          dailySteps: lastRoundup.dailySteps,
          studioHours: lastRoundup.studioHours,
          somaticState: lastRoundup.somaticState
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
        'Mon Steps', 'Tue Steps', 'Wed Steps', 'Thu Steps', 'Fri Steps', 'Sat Steps', 'Sun Steps',
        'Quick Notes'
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
          steps?.sun || 0,
          `"${((r.quickNotes as Array<{content: string}> | null)?.map(n => n.content).join(' | ') || '').replace(/"/g, '""')}"`
        ];
      });
      
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return { csv, filename: `neon-signs-export-${new Date().toISOString().split('T')[0]}.csv` };
    }),

    // Unified CSV export: two structured sections matching canonical spec
    unifiedCsv: protectedProcedure.query(async ({ ctx }) => {
      const data = await getUnifiedExportData(ctx.user.id);
      const csv = buildUnifiedCSV(data);
      return { csv, filename: `neon-signs-unified-${new Date().toISOString().split('T')[0]}.csv` };
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

    // Get this week's quick notes (created within the current week)
    getWeekly: protectedProcedure.query(async ({ ctx }) => {
      const { getQuickNotesForWeek } = await import('./db');
      return getQuickNotesForWeek(ctx.user.id);
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
        const works = await getAllWorks(ctx.user.id, input.limit || 100, input.offset || 0);
        // Enrich each work with its surface IDs and codes for filtering
        const enriched = await Promise.all(works.map(async (work) => {
          const surfaces = await getWorkSurfaces(work.id);
          return {
            ...work,
            surfaceIds: surfaces.map(s => s.id),
            surfaceCodes: surfaces.map(s => s.code || s.displayName).join(', '),
          };
        }));
        return enriched;
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

    // Get surfaces for a work
    getSurfaces: protectedProcedure
      .input(z.object({ workId: z.number() }))
      .query(async ({ ctx, input }) => {
        const work = await getWorkById(input.workId);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return getWorkSurfaces(input.workId);
      }),

    // Get mediums for a work
    getMediums: protectedProcedure
      .input(z.object({ workId: z.number() }))
      .query(async ({ ctx, input }) => {
        const work = await getWorkById(input.workId);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return getWorkMediums(input.workId);
      }),

    // Get tools for a work
    getTools: protectedProcedure
      .input(z.object({ workId: z.number() }))
      .query(async ({ ctx, input }) => {
        const work = await getWorkById(input.workId);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return getWorkTools(input.workId);
      }),

    // Get work count and next code
    getNextCode: protectedProcedure.query(async ({ ctx }) => {
      const count = await getWorksCount(ctx.user.id);
      const nextCode = await getNextWorkCode(ctx.user.id);
      return { count, nextCode };
    }),

    // Get last trial's material defaults for smart pre-selection
    lastTrialDefaults: protectedProcedure.query(async ({ ctx }) => {
      return getLastTrialDefaults(ctx.user.id);
    }),

    // Get common dimension pairs for quick-select presets
    commonDimensions: protectedProcedure.query(async ({ ctx }) => {
      return getCommonDimensions(ctx.user.id);
    }),

    // Export all works as CSV data
    exportCSV: protectedProcedure.query(async ({ ctx }) => {
      return getAllWorksForExport();
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
        disposition: z.enum(['Trash', 'Probably_Trash', 'Save_Archive', 'Save_Has_Potential']),
        heightCm: z.number().positive().optional(), // Height in cm
        widthCm: z.number().positive().optional(), // Width in cm
        hours: z.number().positive().optional(), // Hours spent
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
            hours: input.hours,
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
        date: z.string().optional(), // ISO date string
        technicalIntent: z.string().max(140).optional(),
        discovery: z.string().max(280).optional(),
        rating: z.number().min(1).max(5).optional(),
        disposition: z.enum(['Trash', 'Probably_Trash', 'Save_Archive', 'Save_Has_Potential']).optional(),
        heightCm: z.number().positive().optional(),
        widthCm: z.number().positive().optional(),
        hours: z.number().positive().optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const work = await getWorkById(input.id);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const { id, date, ...updates } = input;
        const finalUpdates = {
          ...updates,
          ...(date ? { date: new Date(date) } : {}),
        };
        await updateWork(id, finalUpdates);
        return { success: true };
      }),

    // Update work materials
    updateMaterials: protectedProcedure
      .input(z.object({
        workId: z.number(),
        surfaceIds: z.array(z.number()).min(1),
        mediumIds: z.array(z.number()).min(1),
        toolIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const work = await getWorkById(input.workId);
        if (!work || work.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
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
        
        await updateWorkMaterials(input.workId, input.surfaceIds, input.mediumIds, input.toolIds);
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

        // Generate thumbnail for database storage
        const { generateThumbnail } = await import('./generateThumbnail');
        const thumbnail = await generateThumbnail(buffer);

        // Upload to S3 (keep trying even if it might fail)
        let url = '';
        let key = '';
        try {
          const uploadResult = await uploadPhoto(
            ctx.user.id,
            buffer,
            input.fileName,
            'work'
          );
          url = uploadResult.url;
          key = uploadResult.key;
        } catch (error) {
          console.error('S3 upload failed, using thumbnail only:', error);
        }

        // Update work with photo URL, key, and thumbnail
        await updateWork(input.workId, { 
          photoUrl: url || null, 
          photoKey: key || null,
          photoThumbnail: thumbnail 
        });

        return { url, key, thumbnail };
      }),
  }),

  // Intake Presets
  intakePresets: router({
    // Get all presets for user
    getAll: protectedProcedure.query(async ({ ctx }) => {
        const { getIntakePresetsForUser } = await import('./db');
      return getIntakePresetsForUser(ctx.user.id);
    }),

    // Get single preset with all materials
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getIntakePresetById, getFullPreset } = await import('./db');
        const preset = await getIntakePresetById(input.id, ctx.user.id);
        if (!preset) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        return getFullPreset(input.id);
      }),

    // Create new preset from current selection
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        surfaceIds: z.array(z.number()).min(1),
        mediumIds: z.array(z.number()).min(1),
        toolIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { savePresetFromCurrentSelection } = await import('./db');
        const id = await savePresetFromCurrentSelection(
          ctx.user.id,
          input.name,
          input.description,
          input.surfaceIds,
          input.mediumIds,
          input.toolIds || []
        );
        return { id };
      }),

    // Update preset
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateIntakePreset } = await import('./db');
        const { id, ...updates } = input;
        await updateIntakePreset(id, ctx.user.id, updates);
        return { success: true };
      }),

    // Delete preset
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteIntakePreset } = await import('./db');
        await deleteIntakePreset(input.id, ctx.user.id);
        return { success: true };
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

    // Material usage statistics
    materialUsage: protectedProcedure.query(async () => {
      return getMaterialUsageStats();
    }),

    // Rating distribution
    ratingDistribution: protectedProcedure.query(async () => {
      return getRatingDistribution();
    }),

    // Disposition breakdown
    dispositionBreakdown: protectedProcedure.query(async () => {
      return getDispositionBreakdown();
    }),

    // Dimensional statistics
    dimensionalStats: protectedProcedure.query(async () => {
      return getDimensionalStats();
    }),

    // Time investment statistics
    timeInvestment: protectedProcedure.query(async () => {
      return getTimeInvestmentStats();
    }),

    // Temporal trends
    temporalTrends: protectedProcedure.query(async () => {
      return getTemporalTrends();
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

    // Get works for a specific week (by date range)
    worksForWeek: protectedProcedure
      .input(z.object({
        startDate: z.string(), // ISO date string
        endDate: z.string(),   // ISO date string
      }))
      .query(async ({ ctx, input }) => {
        return getWorksForDateRange(
          ctx.user.id,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),

    // Unified summary combining roundup + crucible stats
    unifiedSummary: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      const dateInfo = getDateInfoWithSettings(settings);
      const checkInDay = settings?.checkInDay || 'Sunday';

      const [
        totalStudioHours,
        avgJester,
        energyDistribution,
        jesterTrend,
        studioHoursTrend,
        totalRoundups,
        worksCount,
        velocity,
        discovery,
        surfaces,
        mediums,
        materialUsage,
        ratingDist,
        dispositionBreakdown,
        dimensionalStats,
        timeInvestment,
        temporalTrends,
        allRoundups,
      ] = await Promise.all([
        getTotalStudioHours(ctx.user.id),
        getAverageJesterActivity(ctx.user.id),
        getEnergyLevelDistribution(ctx.user.id),
        getJesterTrend(ctx.user.id, 52),
        getStudioHoursTrend(ctx.user.id, 52),
        getWeeklyRoundupCount(ctx.user.id),
        getWorksCount(ctx.user.id),
        getTrashRateAsVelocitySignal(ctx.user.id),
        getDiscoveryDensity(ctx.user.id),
        getMaterialsByType(ctx.user.id, 'Surface'),
        getMaterialsByType(ctx.user.id, 'Medium'),
        getMaterialUsageStats(),
        getRatingDistribution(),
        getDispositionBreakdown(),
        getDimensionalStats(),
        getTimeInvestmentStats(),
        getTemporalTrends(),
        getAllWeeklyRoundups(ctx.user.id, 52, 0),
      ]);

      // Calculate step aggregates from roundups
      let totalSteps = 0;
      let weeksWithSteps = 0;
      for (const r of allRoundups) {
        if (r.weeklyStepTotal && r.weeklyStepTotal > 0) {
          totalSteps += r.weeklyStepTotal;
          weeksWithSteps++;
        }
      }
      const avgWeeklySteps = weeksWithSteps > 0 ? Math.round(totalSteps / weeksWithSteps) : 0;

      // Energy trend from roundups
      const energyTrend = [...allRoundups].reverse().map(r => ({
        weekNumber: r.weekNumber,
        year: r.year,
        energyLevel: r.energyLevel,
      }));

      // Step trend from roundups
      const stepTrend = [...allRoundups].reverse().map(r => ({
        weekNumber: r.weekNumber,
        year: r.year,
        weeklySteps: r.weeklyStepTotal || 0,
        avgDailySteps: r.dailyStepAverage || 0,
      }));

      return {
        // Progress
        currentWeek: dateInfo.weekNumber,
        currentYear: dateInfo.year,
        crucibleYear: dateInfo.crucibleYear,
        totalWeeks: dateInfo.totalWeeks,
        totalRoundups,
        checkInDay,

        // Studio practice
        totalStudioHours: Math.round(totalStudioHours * 10) / 10,
        avgStudioHoursPerWeek: totalRoundups > 0 ? Math.round((totalStudioHours / totalRoundups) * 10) / 10 : 0,
        avgJester,
        energyDistribution,
        jesterTrend,
        studioHoursTrend,
        energyTrend,

        // Steps
        totalSteps,
        avgWeeklySteps,
        stepTrend,

        // Crucible trials
        totalWorks: worksCount,
        totalSurfaces: surfaces.length,
        totalMediums: mediums.length,
        trashRate: velocity.trashRate,
        trashCount: velocity.trashCount,
        weeklyTrialAvg: velocity.weeklyAvg,
        discoveryDensity: discovery.density,

        // Detailed crucible data
        materialUsage,
        ratingDistribution: ratingDist,
        dispositionBreakdown,
        dimensionalStats,
        timeInvestment,
        temporalTrends,
      };
    }),
  }),

  // ─── Contacts ──────────────────────────────────────────────────────────────
  contacts: router({
    // Create a new contact
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        role: z.string().max(255).optional(),
        organization: z.string().max(255).optional(),
        city: z.string().max(100).optional(),
        phone: z.string().max(100).optional(),
        instagram: z.string().max(100).optional(),
        email: z.string().max(320).optional(),
        howConnected: z.string().max(2000).optional(),
        notes: z.string().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createContact({
          userId: ctx.user.id,
          name: input.name,
          role: input.role ?? null,
          organization: input.organization ?? null,
          city: input.city ?? null,
          phone: input.phone ?? null,
          instagram: input.instagram ?? null,
          email: input.email ?? null,
          howConnected: input.howConnected ?? null,
          notes: input.notes ?? null,
        });
        return { id };
      }),

    // Update a contact
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255),
        role: z.string().max(255).optional().nullable(),
        organization: z.string().max(255).optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        phone: z.string().max(100).optional().nullable(),
        instagram: z.string().max(100).optional().nullable(),
        email: z.string().max(320).optional().nullable(),
        howConnected: z.string().max(2000).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateContact(id, ctx.user.id, data);
        return { success: true };
      }),

    // Get all contacts for the current user
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return getContacts(ctx.user.id);
    }),

    // Delete a contact
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteContact(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
