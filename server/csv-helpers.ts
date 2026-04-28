/**
 * CSV Export Helpers — extracted from routers.ts for maintainability
 */

// Detect deferred/placeholder text
const DEFERRED_RX = /will\s+update|will\s+submit|can'?t\s+upload|\bTBD\b|will\s+add\s+them|I'?ll\s+add\s+them/i;

export function cleanDeferred(val: string | null | undefined): string {
  if (!val || !val.trim()) return '';
  return DEFERRED_RX.test(val) ? '' : val.trim();
}

// CSV-escape a value
export function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Parse Works Made into Started / Finished / Notes
export function parseWorksMade(text: string | null | undefined): { started: string; finished: string; notes: string } {
  const cleaned = cleanDeferred(text);
  if (!cleaned) return { started: '', finished: '', notes: '' };
  let started = '';
  let finished = '';
  const sMatch = cleaned.match(/[Ss]tarted\s+(\d+)/)
    || cleaned.match(/(\d+)\s+started/)
    || cleaned.match(/[Ss]omewhere\s+around\s+(\d+)\s+started/)
    || cleaned.match(/[Aa]round\s+(\d+)\s+started/);
  if (sMatch) started = sMatch[1];
  const fMatch = cleaned.match(/[Ff]inished\s+(\d+)/) || cleaned.match(/(\d+)\s+finished/);
  if (fMatch) finished = fMatch[1];
  return { started, finished, notes: cleaned };
}

// Split Technical Intent into Observation vs Self-Directive
export function splitTechnicalIntent(text: string | null | undefined): { observation: string; directive: string } {
  const cleaned = cleanDeferred(text);
  if (!cleaned) return { observation: '', directive: '' };

  const pureDirectives = /^(keep\s+working\s+this|keep\s+going|continue\s+working\s+it|try\s+harder|practice|still\s+trying|meh|will\s+keep\s+working\s+this|will\s+probably\s+keep\s+working\s+this)$/i;
  if (pureDirectives.test(cleaned)) return { observation: '', directive: cleaned };

  const directiveRx = /keep\s+working|keep\s+going|keep\s+grinding|continue\s+working|try\s+harder|will\s+keep\s+working|will\s+probably\s+keep|might\s+continue/i;
  const hasDirective = directiveRx.test(cleaned);

  if (hasDirective) {
    const parts = cleaned.split(/[,.]/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const firstIsDir = directiveRx.test(parts[0]);
      const lastIsDir = directiveRx.test(parts.slice(1).join(', '));
      if (firstIsDir && !lastIsDir) return { observation: parts.slice(1).join(', '), directive: parts[0] };
      if (!firstIsDir && lastIsDir) return { observation: parts[0], directive: parts.slice(1).join(', ') };
    }
    return { observation: cleaned, directive: '' };
  }

  return { observation: cleaned, directive: '' };
}

// Column headers
export const ROUNDUP_HEADERS = [
  'Week','Year','Date','Raw_Weather_Report','Studio_Hours',
  'Works_Started','Works_Finished','Works_Notes',
  'Jester_Activity','Energy_Level','Walking_Engine','Walking_Insights',
  'Partnership_Temperature','Thing_Worked','Thing_Resisted',
  'Somatic_State','Door_Intention','Phase_DNA','Weekly_Steps','Avg_Steps_Day','Steps_Mon','Steps_Tue','Steps_Wed','Steps_Thu','Steps_Fri','Steps_Sat','Steps_Sun'
];

export const TRIAL_HEADERS = [
  'Trial_Code','Date','Week','Rating','Disposition',
  'Save_Has_Potential_Flag','Surfaces','Mediums','Tools',
  'Technical_Observation','Self_Directive','Discovery',
  'Height_cm','Width_cm','Hours'
];

// Build the full unified CSV string
export function buildUnifiedCSV(data: {
  roundups: Array<{
    week: number; year: number; date: string; weatherReport: string; studioHours: number;
    worksMade: string; jesterActivity: number; energyLevel: string; walkingEngineUsed: boolean;
    walkingInsights: string | null; partnershipTemperature: string; thingWorked: string;
    thingResisted: string; somaticState: string; doorIntention: string | null; phaseDna: string | null;
    weeklySteps: number | null; avgDailySteps: number | null; dailySteps: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number } | null;
  }>;
  trials: Array<{
    code: string; date: string; week: number; rating: number | null; disposition: string;
    surfaces: string; mediums: string; tools: string; technicalIntent: string | null;
    discovery: string | null; heightCm: number | null; widthCm: number | null; hours: number | null;
  }>;
}): string {
  const esc = escapeCSV;

  // Fix Week 0 duplicate: Dec 20 → -1, Dec 22 → 0
  const processedRoundups = data.roundups.map(r => {
    let week = r.week;
    if (week === 0 && r.date === '2025-12-20') week = -1;
    return { ...r, week };
  });
  processedRoundups.sort((a, b) => b.week - a.week);

  const roundupRows = processedRoundups.map(r => {
    const works = parseWorksMade(r.worksMade);
    return [
      esc(r.week), esc(r.year), esc(r.date),
      esc(cleanDeferred(r.weatherReport)),
      esc(cleanDeferred(String(r.studioHours))),
      esc(works.started), esc(works.finished), esc(works.notes),
      esc(cleanDeferred(String(r.jesterActivity))),
      esc(cleanDeferred(r.energyLevel)),
      esc(r.walkingEngineUsed ? 'Yes' : 'No'),
      esc(cleanDeferred(r.walkingInsights)),
      esc(cleanDeferred(r.partnershipTemperature)),
      esc(cleanDeferred(r.thingWorked)),
      esc(cleanDeferred(r.thingResisted)),
      esc(cleanDeferred(r.somaticState)),
      esc(cleanDeferred(r.doorIntention)),
      esc(r.phaseDna || ''),
      esc(r.weeklySteps || 0),
      esc(r.avgDailySteps || 0),
      esc(r.dailySteps?.mon ?? 0),esc(r.dailySteps?.tue ?? 0),esc(r.dailySteps?.wed ?? 0),esc(r.dailySteps?.thu ?? 0),esc(r.dailySteps?.fri ?? 0),esc(r.dailySteps?.sat ?? 0),esc(r.dailySteps?.sun ?? 0)
    ];
  });

  const trialRows = data.trials.map(t => {
    const disp = t.disposition.replace(/_/g, ' ');
    const saveFlag = disp === 'Save Has Potential' ? 'TRUE' : 'FALSE';
    const intent = splitTechnicalIntent(t.technicalIntent);
    return [
      esc(t.code), esc(t.date), esc(t.week >= 0 ? t.week : ''),
      esc(t.rating ?? ''), esc(disp),
      saveFlag,
      esc(t.surfaces), esc(t.mediums), esc(t.tools),
      esc(intent.observation), esc(intent.directive),
      esc(cleanDeferred(t.discovery)),
      esc(t.heightCm ?? ''), esc(t.widthCm ?? ''), esc(t.hours ?? '')
    ];
  });

  return [
    '=== WEEKLY ROUNDUPS ===',
    ROUNDUP_HEADERS.join(','),
    ...roundupRows.map(r => r.join(',')),
    '',
    '=== CRUCIBLE TRIALS ===',
    TRIAL_HEADERS.join(','),
    ...trialRows.map(r => r.join(','))
  ].join('\n');
}
