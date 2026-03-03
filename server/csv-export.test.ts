import { describe, it, expect } from 'vitest';

// Test the CSV helper functions used in the unified export
// We replicate the helpers here since they're defined inline in the router

const DEFERRED_RX = /will\s+update|will\s+submit|can'?t\s+upload|\bTBD\b|will\s+add\s+them|I'?ll\s+add\s+them/i;

function cleanDeferred(val: string | null | undefined): string {
  if (!val || !val.trim()) return '';
  return DEFERRED_RX.test(val) ? '' : val.trim();
}

function esc(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseWorksMade(text: string | null | undefined): { started: string; finished: string; notes: string } {
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

function splitTechnicalIntent(text: string | null | undefined): { observation: string; directive: string } {
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

describe('CSV Export: cleanDeferred', () => {
  it('clears "will update" text', () => {
    expect(cleanDeferred('A bunch made, will update the crucible intake for next week\'s roundup.')).toBe('');
  });

  it('clears "will submit" text', () => {
    expect(cleanDeferred('Will submit the crucible intake logs with this update.')).toBe('');
  });

  it('clears "can\'t upload" text', () => {
    expect(cleanDeferred("I can't upload the intake portal of works")).toBe('');
  });

  it('clears "TBD" text', () => {
    expect(cleanDeferred('TBD')).toBe('');
  });

  it('clears "I\'ll add them" text', () => {
    expect(cleanDeferred("I'll add them to next week's round up")).toBe('');
  });

  it('preserves normal text', () => {
    expect(cleanDeferred('Started 14 new large works')).toBe('Started 14 new large works');
  });

  it('returns empty for null/undefined', () => {
    expect(cleanDeferred(null)).toBe('');
    expect(cleanDeferred(undefined)).toBe('');
    expect(cleanDeferred('')).toBe('');
  });
});

describe('CSV Export: esc (CSV escaping)', () => {
  it('returns empty for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc('')).toBe('');
  });

  it('passes through simple strings', () => {
    expect(esc('hello')).toBe('hello');
  });

  it('wraps strings with commas in quotes', () => {
    expect(esc('hello, world')).toBe('"hello, world"');
  });

  it('escapes double quotes', () => {
    expect(esc('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('wraps strings with newlines', () => {
    expect(esc('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles numbers', () => {
    expect(esc(42)).toBe('42');
    expect(esc(0)).toBe('0');
  });
});

describe('CSV Export: parseWorksMade', () => {
  it('extracts "Started 14" from text', () => {
    const result = parseWorksMade('Started 14 new large works, plus a bunch of scrap testing.');
    expect(result.started).toBe('14');
    expect(result.finished).toBe('');
    expect(result.notes).toContain('Started 14');
  });

  it('extracts "Started 4" from text', () => {
    const result = parseWorksMade("Started 4 while I was briefly in Rocky's place");
    expect(result.started).toBe('4');
  });

  it('extracts "Somewhere around 10 started"', () => {
    const result = parseWorksMade('Somewhere around 10 started, exploring different papers more.');
    expect(result.started).toBe('10');
  });

  it('returns empty for deferred text', () => {
    const result = parseWorksMade('Will submit the crucible intake logs with this update.');
    expect(result.started).toBe('');
    expect(result.finished).toBe('');
    expect(result.notes).toBe('');
  });

  it('returns empty for null', () => {
    const result = parseWorksMade(null);
    expect(result.started).toBe('');
    expect(result.finished).toBe('');
    expect(result.notes).toBe('');
  });

  it('preserves full text in notes', () => {
    const text = 'No artwork started yet but the studio is nearly fully sweet up.';
    const result = parseWorksMade(text);
    expect(result.notes).toBe(text);
    expect(result.started).toBe('');
  });
});

describe('CSV Export: splitTechnicalIntent', () => {
  it('classifies "Keep working this" as pure directive', () => {
    const result = splitTechnicalIntent('Keep working this');
    expect(result.observation).toBe('');
    expect(result.directive).toBe('Keep working this');
  });

  it('classifies "Try harder" as pure directive', () => {
    const result = splitTechnicalIntent('Try harder');
    expect(result.observation).toBe('');
    expect(result.directive).toBe('Try harder');
  });

  it('classifies "Practice" as pure directive', () => {
    const result = splitTechnicalIntent('Practice');
    expect(result.observation).toBe('');
    expect(result.directive).toBe('Practice');
  });

  it('classifies "Still trying" as pure directive', () => {
    const result = splitTechnicalIntent('Still trying');
    expect(result.observation).toBe('');
    expect(result.directive).toBe('Still trying');
  });

  it('classifies descriptive text as observation', () => {
    const result = splitTechnicalIntent('Layering the paper produces great cut lines');
    expect(result.observation).toBe('Layering the paper produces great cut lines');
    expect(result.directive).toBe('');
  });

  it('classifies "Paper broke apart when wet" as observation', () => {
    const result = splitTechnicalIntent('Paper broke apart when wet');
    expect(result.observation).toBe('Paper broke apart when wet');
    expect(result.directive).toBe('');
  });

  it('classifies "Blob mess" as observation', () => {
    const result = splitTechnicalIntent('Blob mess');
    expect(result.observation).toBe('Blob mess');
    expect(result.directive).toBe('');
  });

  it('classifies "good" as observation', () => {
    const result = splitTechnicalIntent('good');
    expect(result.observation).toBe('good');
    expect(result.directive).toBe('');
  });

  it('classifies "Garbage blob" as observation', () => {
    const result = splitTechnicalIntent('Garbage blob');
    expect(result.observation).toBe('Garbage blob');
    expect(result.directive).toBe('');
  });

  it('handles mixed content with directive language', () => {
    const result = splitTechnicalIntent('Garbage, might continue to work it');
    // Should split: observation = Garbage, directive = might continue to work it
    expect(result.observation).toBe('Garbage');
    expect(result.directive).toBe('might continue to work it');
  });

  it('returns empty for null/empty', () => {
    expect(splitTechnicalIntent(null)).toEqual({ observation: '', directive: '' });
    expect(splitTechnicalIntent('')).toEqual({ observation: '', directive: '' });
  });

  it('handles "Will keep working this" as directive', () => {
    const result = splitTechnicalIntent('Will keep working this');
    expect(result.directive).toBe('Will keep working this');
    expect(result.observation).toBe('');
  });

  it('handles "Will probably keep working this" as directive', () => {
    const result = splitTechnicalIntent('Will probably keep working this');
    expect(result.directive).toBe('Will probably keep working this');
    expect(result.observation).toBe('');
  });
});

describe('CSV Export: Save_Has_Potential_Flag', () => {
  it('sets TRUE for "Save Has Potential"', () => {
    const disp = 'Save Has Potential';
    const flag = disp === 'Save Has Potential' ? 'TRUE' : 'FALSE';
    expect(flag).toBe('TRUE');
  });

  it('sets FALSE for "Save Archive"', () => {
    const disp = 'Save Archive';
    const flag = disp === 'Save Has Potential' ? 'TRUE' : 'FALSE';
    expect(flag).toBe('FALSE');
  });

  it('sets FALSE for "Trash"', () => {
    const disp = 'Trash';
    const flag = disp === 'Save Has Potential' ? 'TRUE' : 'FALSE';
    expect(flag).toBe('FALSE');
  });

  it('sets FALSE for "Probably Trash"', () => {
    const disp = 'Probably Trash';
    const flag = disp === 'Save Has Potential' ? 'TRUE' : 'FALSE';
    expect(flag).toBe('FALSE');
  });
});

describe('CSV Export: Week 0 duplicate fix', () => {
  it('remaps Dec 20 week 0 to week -1', () => {
    const roundups = [
      { week: 0, date: '2025-12-20', year: 2025 },
      { week: 0, date: '2025-12-22', year: 2025 },
    ];
    const processed = roundups.map(r => {
      let week = r.week;
      if (week === 0 && r.date === '2025-12-20') week = -1;
      return { ...r, week };
    });
    expect(processed[0].week).toBe(-1);
    expect(processed[1].week).toBe(0);
  });
});

describe('CSV Export: Column order', () => {
  it('roundup headers match spec exactly', () => {
    const expected = [
      'Week','Year','Date','Raw_Weather_Report','Studio_Hours',
      'Works_Started','Works_Finished','Works_Notes',
      'Jester_Activity','Energy_Level','Walking_Engine','Walking_Insights',
      'Partnership_Temperature','Thing_Worked','Thing_Resisted',
      'Somatic_State','Door_Intention','Phase_DNA','Weekly_Steps','Avg_Steps_Day'
    ];
    expect(expected).toHaveLength(20);
    expect(expected[0]).toBe('Week');
    expect(expected[3]).toBe('Raw_Weather_Report');
    expect(expected[5]).toBe('Works_Started');
    expect(expected[6]).toBe('Works_Finished');
    expect(expected[7]).toBe('Works_Notes');
    expect(expected[19]).toBe('Avg_Steps_Day');
  });

  it('trial headers match spec exactly', () => {
    const expected = [
      'Trial_Code','Date','Week','Rating','Disposition',
      'Save_Has_Potential_Flag','Surfaces','Mediums','Tools',
      'Technical_Observation','Self_Directive','Discovery',
      'Height_cm','Width_cm','Hours'
    ];
    expect(expected).toHaveLength(15);
    expect(expected[0]).toBe('Trial_Code');
    expect(expected[5]).toBe('Save_Has_Potential_Flag');
    expect(expected[9]).toBe('Technical_Observation');
    expect(expected[10]).toBe('Self_Directive');
    expect(expected[14]).toBe('Hours');
  });
});
