import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowLeft, Calendar, AlertCircle, CheckCircle2, Save, Footprints, Plus, Trash2, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { nanoid } from "nanoid";

const DRAFT_KEY = 'neon-signs-roundup-draft';

interface DailySteps {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

// Work Entry type matching the database schema
interface WorkEntry {
  id: string;
  workTitle?: string;
  medium: 'ink' | 'mixed' | 'study' | 'other';
  emotionalTemp: 'struggling' | 'processing' | 'flowing' | 'uncertain';
  started: number;
  finished: number;
  abandoned: number;
  keyInquiry: string;
  technicalNote?: string;
  abandonmentReason?: string;
}

interface FormData {
  weatherReport: string;
  studioHours: number;
  worksMade: string;
  jesterActivity: number;
  energyLevel: 'hot' | 'sustainable' | 'depleted' | '';
  walkingEngineUsed: boolean;
  walkingInsights: string;
  partnershipTemperature: string;
  thingWorked: string;
  thingResisted: string;
  somaticState: string;
  doorIntention: string;
  dailySteps: DailySteps;
  worksData: WorkEntry[];
  worksExpanded: boolean;
}

const initialDailySteps: DailySteps = {
  mon: 0,
  tue: 0,
  wed: 0,
  thu: 0,
  fri: 0,
  sat: 0,
  sun: 0,
};

const createEmptyWorkEntry = (): WorkEntry => ({
  id: nanoid(),
  workTitle: '',
  medium: 'ink',
  emotionalTemp: 'processing',
  started: 0,
  finished: 0,
  abandoned: 0,
  keyInquiry: '',
  technicalNote: '',
  abandonmentReason: '',
});

const initialFormData: FormData = {
  weatherReport: '',
  studioHours: 0,
  worksMade: '',
  jesterActivity: 5,
  energyLevel: '',
  walkingEngineUsed: false,
  walkingInsights: '',
  partnershipTemperature: '',
  thingWorked: '',
  thingResisted: '',
  somaticState: '',
  doorIntention: '',
  dailySteps: initialDailySteps,
  worksData: [],
  worksExpanded: false,
};

const STEP_THRESHOLD_HIGH = 8000;
const STEP_THRESHOLD_LOW = 5000;

const mediumOptions = [
  { value: 'ink', label: '🖋️ Ink' },
  { value: 'mixed', label: '🎨 Mixed Media' },
  { value: 'study', label: '📚 Study' },
  { value: 'other', label: '✨ Other' },
];

const emotionalTempOptions = [
  { value: 'struggling', label: '😓 Struggling', color: 'neon-text-magenta' },
  { value: 'processing', label: '🔄 Processing', color: 'neon-text-amber' },
  { value: 'flowing', label: '🌊 Flowing', color: 'neon-text-cyan' },
  { value: 'uncertain', label: '❓ Uncertain', color: 'neon-text-purple' },
];

function getJesterColor(value: number): string {
  if (value <= 3) return 'neon-text-cyan';
  if (value <= 6) return 'neon-text-amber';
  return 'neon-text-magenta';
}

function getJesterLabel(value: number): string {
  if (value === 0) return 'Fully Present';
  if (value <= 2) return 'Mostly Present';
  if (value <= 4) return 'Balanced';
  if (value <= 6) return 'Some Performance';
  if (value <= 8) return 'Mostly Performing';
  return 'Fully Performing';
}

// Decorative number badge
function NumberBadge({ num, variant = 'cyan' }: { num: number; variant?: 'cyan' | 'magenta' | 'amber' | 'purple' | 'muted' }) {
  const colors = {
    cyan: 'bg-[var(--neon-cyan)]/10 neon-text-cyan border-[var(--neon-cyan)]/30',
    magenta: 'bg-[var(--neon-magenta)]/10 neon-text-magenta border-[var(--neon-magenta)]/30',
    amber: 'bg-[var(--neon-amber)]/10 neon-text-amber border-[var(--neon-amber)]/30',
    purple: 'bg-[var(--neon-purple)]/10 neon-text-purple border-[var(--neon-purple)]/30',
    muted: 'bg-muted/20 text-muted-foreground border-muted/30',
  };
  return (
    <span className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold border ${colors[variant]}`}>
      {num}
    </span>
  );
}

// Day labels for step input
const dayLabels: { key: keyof DailySteps; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday', short: 'Mon' },
  { key: 'tue', label: 'Tuesday', short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday', short: 'Thu' },
  { key: 'fri', label: 'Friday', short: 'Fri' },
  { key: 'sat', label: 'Saturday', short: 'Sat' },
  { key: 'sun', label: 'Sunday', short: 'Sun' },
];

// Generate works summary from structured data
function generateWorksSummary(works: WorkEntry[]): string {
  if (works.length === 0) return '';
  
  const totals = works.reduce((acc, w) => ({
    started: acc.started + w.started,
    finished: acc.finished + w.finished,
    abandoned: acc.abandoned + w.abandoned,
  }), { started: 0, finished: 0, abandoned: 0 });
  
  // Find dominant emotional temp
  const tempCounts: Record<string, number> = {};
  works.forEach(w => {
    tempCounts[w.emotionalTemp] = (tempCounts[w.emotionalTemp] || 0) + 1;
  });
  const dominantTemp = Object.entries(tempCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'processing';
  
  // Find dominant medium
  const mediumCounts: Record<string, number> = {};
  works.forEach(w => {
    mediumCounts[w.medium] = (mediumCounts[w.medium] || 0) + 1;
  });
  const dominantMedium = Object.entries(mediumCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';
  
  // Get key inquiries
  const inquiries = works.map(w => w.keyInquiry).filter(Boolean).slice(0, 2);
  
  const parts: string[] = [];
  if (totals.started > 0) parts.push(`${totals.started} started`);
  if (totals.finished > 0) parts.push(`${totals.finished} finished`);
  if (totals.abandoned > 0) parts.push(`${totals.abandoned} abandoned`);
  
  let summary = parts.join(', ');
  summary += ` — ${dominantTemp} through ${dominantMedium}`;
  if (inquiries.length > 0) {
    summary += ` (${inquiries.join('; ')})`;
  }
  
  return summary;
}

// Work Card Component
function WorkCard({ 
  work, 
  index, 
  onUpdate, 
  onRemove, 
  disabled 
}: { 
  work: WorkEntry; 
  index: number; 
  onUpdate: (id: string, updates: Partial<WorkEntry>) => void; 
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  const hasActivity = work.started > 0 || work.finished > 0;
  const needsEmotionalTemp = hasActivity && !work.emotionalTemp;
  const hasAbandoned = work.abandoned > 0;
  
  return (
    <div className="cyber-card rounded-xl p-4 space-y-4 border border-[var(--neon-amber)]/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 neon-text-amber" />
          <span className="text-sm font-medium neon-text-amber">Work #{index + 1}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(work.id)}
          disabled={disabled}
          className="text-muted-foreground hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10 h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Title (optional) */}
      <div>
        <Label className="text-xs text-muted-foreground">Title (optional)</Label>
        <Input
          value={work.workTitle || ''}
          onChange={(e) => onUpdate(work.id, { workTitle: e.target.value })}
          placeholder="e.g., Untitled Series #3"
          className="cyber-input rounded-lg mt-1"
          disabled={disabled}
        />
      </div>
      
      {/* Medium & Counts Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Medium</Label>
          <Select
            value={work.medium}
            onValueChange={(value) => onUpdate(work.id, { medium: value as WorkEntry['medium'] })}
            disabled={disabled}
          >
            <SelectTrigger className="cyber-input rounded-lg mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--near-black)] border-[var(--neon-amber)]/30">
              {mediumOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground text-center block">Started</Label>
            <Input
              type="number"
              min="0"
              value={work.started || ''}
              onChange={(e) => onUpdate(work.id, { started: parseInt(e.target.value) || 0 })}
              className="cyber-input rounded-lg mt-1 text-center"
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground text-center block">Finished</Label>
            <Input
              type="number"
              min="0"
              value={work.finished || ''}
              onChange={(e) => onUpdate(work.id, { finished: parseInt(e.target.value) || 0 })}
              className="cyber-input rounded-lg mt-1 text-center"
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground text-center block">Abandoned</Label>
            <Input
              type="number"
              min="0"
              value={work.abandoned || ''}
              onChange={(e) => onUpdate(work.id, { abandoned: parseInt(e.target.value) || 0 })}
              className="cyber-input rounded-lg mt-1 text-center"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
      
      {/* Emotional Temperature */}
      <div>
        <Label className={`text-xs ${needsEmotionalTemp ? 'neon-text-magenta' : 'text-muted-foreground'}`}>
          Emotional Temperature {hasActivity && '*'}
        </Label>
        <RadioGroup
          value={work.emotionalTemp}
          onValueChange={(value) => onUpdate(work.id, { emotionalTemp: value as WorkEntry['emotionalTemp'] })}
          className="flex flex-wrap gap-2 mt-2"
          disabled={disabled}
        >
          {emotionalTempOptions.map(opt => (
            <div key={opt.value} className="flex items-center">
              <RadioGroupItem
                value={opt.value}
                id={`${work.id}-${opt.value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`${work.id}-${opt.value}`}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer border transition-all
                  ${work.emotionalTemp === opt.value 
                    ? `bg-[var(--neon-${opt.value === 'struggling' ? 'magenta' : opt.value === 'processing' ? 'amber' : opt.value === 'flowing' ? 'cyan' : 'purple'})]/20 border-[var(--neon-${opt.value === 'struggling' ? 'magenta' : opt.value === 'processing' ? 'amber' : opt.value === 'flowing' ? 'cyan' : 'purple'})]/50 ${opt.color}` 
                    : 'bg-[var(--deep-space)] border-muted/30 text-muted-foreground hover:border-muted/50'
                  }`}
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      {/* Key Inquiry */}
      <div>
        <Label className="text-xs text-muted-foreground">Key Inquiry *</Label>
        <Input
          value={work.keyInquiry}
          onChange={(e) => onUpdate(work.id, { keyInquiry: e.target.value })}
          placeholder="What were you testing or exploring?"
          className="cyber-input rounded-lg mt-1"
          disabled={disabled}
        />
      </div>
      
      {/* Technical Note (optional) */}
      <div>
        <Label className="text-xs text-muted-foreground">Technical Note (optional)</Label>
        <Input
          value={work.technicalNote || ''}
          onChange={(e) => onUpdate(work.id, { technicalNote: e.target.value })}
          placeholder="Material or process detail"
          className="cyber-input rounded-lg mt-1"
          disabled={disabled}
        />
      </div>
      
      {/* Abandonment Reason (conditional) */}
      {hasAbandoned && (
        <div>
          <Label className="text-xs neon-text-magenta">Why abandoned?</Label>
          <Textarea
            value={work.abandonmentReason || ''}
            onChange={(e) => onUpdate(work.id, { abandonmentReason: e.target.value })}
            placeholder="What led to abandoning this work?"
            className="cyber-input rounded-lg mt-1 min-h-[60px]"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

export default function RoundupForm() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'worksDataInquiry', string>>>({});
  const [draftSaved, setDraftSaved] = useState(false);

  const { data: canSubmitData, isLoading: checkingSubmit } = trpc.roundup.canSubmit.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const submitMutation = trpc.roundup.submit.useMutation({
    onSuccess: (data) => {
      localStorage.removeItem(DRAFT_KEY);
      toast.success('Roundup submitted successfully!');
      setLocation(`/results/${data.roundupId}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit roundup');
    },
  });

  // Calculate step statistics
  const stepStats = useMemo(() => {
    const steps = formData.dailySteps;
    const values = Object.values(steps);
    const total = values.reduce((sum, v) => sum + v, 0);
    const daysWithSteps = values.filter(v => v > 0).length;
    const average = daysWithSteps > 0 ? Math.round(total / daysWithSteps) : 0;
    
    // Auto-suggest walking engine status
    let suggestion: 'yes' | 'no' | 'neutral' = 'neutral';
    if (average >= STEP_THRESHOLD_HIGH) {
      suggestion = 'yes';
    } else if (average > 0 && average < STEP_THRESHOLD_LOW) {
      suggestion = 'no';
    }
    
    return { total, average, daysWithSteps, suggestion };
  }, [formData.dailySteps]);

  // Calculate works summary
  const worksSummary = useMemo(() => {
    return generateWorksSummary(formData.worksData);
  }, [formData.worksData]);

  // Auto-update worksMade when worksData changes
  useEffect(() => {
    if (formData.worksExpanded && formData.worksData.length > 0) {
      const summary = generateWorksSummary(formData.worksData);
      if (summary && summary !== formData.worksMade) {
        setFormData(prev => ({ ...prev, worksMade: summary }));
      }
    }
  }, [formData.worksData, formData.worksExpanded]);


  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure dailySteps has all keys
        if (parsed.dailySteps) {
          parsed.dailySteps = { ...initialDailySteps, ...parsed.dailySteps };
        }
        // Ensure worksData is an array
        if (!Array.isArray(parsed.worksData)) {
          parsed.worksData = [];
        }
        setFormData(prev => ({ ...prev, ...parsed }));
        toast.info('Draft restored from previous session');
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  }, []);

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [formData]);

  useEffect(() => {
    const timer = setTimeout(saveDraft, 1000);
    return () => clearTimeout(timer);
  }, [formData, saveDraft]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const updateSteps = (day: keyof DailySteps, value: number) => {
    setFormData(prev => ({
      ...prev,
      dailySteps: { ...prev.dailySteps, [day]: value },
    }));
  };

  // Work entry handlers
  const addWorkEntry = () => {
    setFormData(prev => ({
      ...prev,
      worksData: [...prev.worksData, createEmptyWorkEntry()],
    }));
  };

  const updateWorkEntry = (id: string, updates: Partial<WorkEntry>) => {
    setFormData(prev => ({
      ...prev,
      worksData: prev.worksData.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
  };

  const removeWorkEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      worksData: prev.worksData.filter(w => w.id !== id),
    }));
  };

  const toggleWorksExpanded = () => {
    setFormData(prev => {
      const newExpanded = !prev.worksExpanded;
      // If expanding and no works yet, add one empty card
      if (newExpanded && prev.worksData.length === 0) {
        return { ...prev, worksExpanded: newExpanded, worksData: [createEmptyWorkEntry()] };
      }
      return { ...prev, worksExpanded: newExpanded };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData | 'worksDataInquiry', string>> = {};

    if (!formData.weatherReport || formData.weatherReport.length < 10) {
      newErrors.weatherReport = 'Weather report must be at least 10 characters';
    }
    if (formData.studioHours < 0) {
      newErrors.studioHours = 'Studio hours cannot be negative';
    }
    if (!formData.worksMade.trim()) {
      newErrors.worksMade = 'Please describe your work this week';
    }
    if (!formData.energyLevel) {
      newErrors.energyLevel = 'Please select your energy level';
    }
    if (!formData.partnershipTemperature.trim()) {
      newErrors.partnershipTemperature = 'Please describe partnership/solitude temperature';
    }
    if (!formData.thingWorked.trim()) {
      newErrors.thingWorked = 'Please describe one thing that worked';
    }
    if (!formData.thingResisted.trim()) {
      newErrors.thingResisted = 'Please describe one thing that resisted';
    }
    if (!formData.somaticState.trim()) {
      newErrors.somaticState = 'Please describe your somatic state';
    }
    
    // Validate work entries if expanded
    if (formData.worksExpanded && formData.worksData.length > 0) {
      const hasInvalidWork = formData.worksData.some(w => !w.keyInquiry.trim());
      if (hasInvalidWork) {
        newErrors.worksDataInquiry = 'Each work entry requires a key inquiry';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    // Prepare worksData for submission (only if expanded and has entries)
    const worksDataToSubmit = formData.worksExpanded && formData.worksData.length > 0 
      ? formData.worksData.map(w => ({
          ...w,
          workTitle: w.workTitle || undefined,
          technicalNote: w.technicalNote || undefined,
          abandonmentReason: w.abandonmentReason || undefined,
        }))
      : undefined;

    submitMutation.mutate({
      weatherReport: formData.weatherReport,
      studioHours: formData.studioHours,
      worksMade: formData.worksMade,
      jesterActivity: formData.jesterActivity,
      energyLevel: formData.energyLevel as 'hot' | 'sustainable' | 'depleted',
      walkingEngineUsed: stepStats.average >= STEP_THRESHOLD_HIGH, // Auto-set based on step average
      walkingInsights: formData.walkingInsights || null,
      partnershipTemperature: formData.partnershipTemperature,
      thingWorked: formData.thingWorked,
      thingResisted: formData.thingResisted,
      somaticState: formData.somaticState,
      doorIntention: formData.doorIntention || null,
      dailySteps: formData.dailySteps,
      worksData: worksDataToSubmit,
    });
  };

  if (authLoading || checkingSubmit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
            <div className="absolute inset-0 blur-xl bg-[var(--neon-cyan)] opacity-30" />
          </div>
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 neon-text-magenta" />
          <h2 className="text-xl font-semibold mb-2 neon-text-white">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to submit your weekly roundup.</p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="cyber-button-primary">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const canSubmit = canSubmitData?.canSubmit ?? false;
  const isCheckInDay = canSubmitData?.isCheckInDay ?? false;
  const hasCheckInDayEntry = canSubmitData?.hasCheckInDayEntry ?? false;
  const entryCount = canSubmitData?.entryCount ?? 0;
  const maxEntries = canSubmitData?.maxEntries ?? 7;
  const checkInDay = canSubmitData?.checkInDay ?? 'Sunday';
  const nextEntryNumber = canSubmitData?.nextEntryNumber ?? 1;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--neon-magenta)]/20 sticky top-0 bg-[var(--void-black)]/95 backdrop-blur z-50">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--neon-magenta)] to-transparent opacity-50" />
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold neon-text-white">Weekly Roundup</h1>
              <p className="text-sm text-muted-foreground">
                Week {canSubmitData?.weekNumber}, {canSubmitData?.year}
              </p>
            </div>
          </div>
          {draftSaved && (
            <div className="flex items-center gap-2 text-sm neon-text-cyan">
              <Save className="h-4 w-4" />
              Draft saved
            </div>
          )}
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Status Banner */}
        {!canSubmit && (
          <div className="cyber-card rounded-xl mb-6 p-4">
            {entryCount >= maxEntries ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--neon-amber)]/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 neon-text-amber" />
                </div>
                <div className="flex-1">
                  <p className="font-medium neon-text-amber">Maximum entries reached ({maxEntries}/{maxEntries})</p>
                  <p className="text-sm text-muted-foreground">
                    You've submitted the maximum number of entries for this week.
                  </p>
                </div>
                <Link href="/history">
                  <Button className="cyber-button-secondary">View History</Button>
                </Link>
              </div>
            ) : !isCheckInDay && !hasCheckInDayEntry ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--neon-magenta)]/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 neon-text-magenta" />
                </div>
                <div>
                  <p className="font-medium neon-text-magenta">First entry must be on {checkInDay}</p>
                  <p className="text-sm text-muted-foreground">
                    Current day: {canSubmitData?.currentDay}. Submit your first entry on {checkInDay}, then you can add more any day.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--neon-cyan)]/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 neon-text-cyan" />
                </div>
                <div>
                  <p className="font-medium neon-text-cyan">Ready to submit</p>
                  <p className="text-sm text-muted-foreground">
                    Entry {nextEntryNumber} of {maxEntries} for this week
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weather Report */}
          <div className="cyber-form rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <NumberBadge num={1} variant="cyan" />
              <div>
                <h3 className="font-semibold neon-text-white">Weather Report</h3>
                <p className="text-sm text-muted-foreground">Emotional/atmospheric summary of your week</p>
              </div>
            </div>
            <Textarea
              value={formData.weatherReport}
              onChange={(e) => updateField('weatherReport', e.target.value)}
              placeholder="How did this week feel? What was the emotional weather?"
              className="cyber-input min-h-[100px] rounded-lg"
              disabled={!canSubmit}
            />
            {errors.weatherReport && (
              <p className="text-sm neon-text-magenta mt-2">{errors.weatherReport}</p>
            )}
          </div>

          {/* Studio Hours */}
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={2} variant="cyan" />
              <h3 className="font-semibold">Studio Hours</h3>
            </div>
            <Input
              type="number"
              min="0"
              max="168"
              step="0.5"
              value={formData.studioHours}
              onChange={(e) => updateField('studioHours', parseFloat(e.target.value) || 0)}
              className="cyber-input rounded-lg"
              disabled={!canSubmit}
            />
            {errors.studioHours && (
              <p className="text-sm neon-text-magenta mt-2">{errors.studioHours}</p>
            )}
          </div>

          {/* Works Made - Expanded Section */}
          <div className="cyber-form rounded-xl p-6 border border-[var(--neon-amber)]/30">
            <div className="flex items-center gap-3 mb-4">
              <NumberBadge num={3} variant="amber" />
              <div className="flex-1">
                <h3 className="font-semibold neon-text-white">Works Made</h3>
                <p className="text-sm text-muted-foreground">Track your creative output</p>
              </div>
              <Palette className="h-5 w-5 neon-text-amber" />
            </div>
            
            {/* Quick Entry (always visible) */}
            <Textarea
              value={formData.worksMade}
              onChange={(e) => updateField('worksMade', e.target.value)}
              placeholder="Major progress or pieces completed"
              className="cyber-input min-h-[80px] rounded-lg"
              disabled={!canSubmit || (formData.worksExpanded && formData.worksData.length > 0)}
            />
            {errors.worksMade && (
              <p className="text-sm neon-text-magenta mt-2">{errors.worksMade}</p>
            )}
            
            {/* Expand Toggle */}
            <Button
              type="button"
              variant="ghost"
              onClick={toggleWorksExpanded}
              disabled={!canSubmit}
              className="w-full mt-4 text-muted-foreground hover:text-[var(--neon-amber)] hover:bg-[var(--neon-amber)]/10 border border-dashed border-muted/30 hover:border-[var(--neon-amber)]/30"
            >
              {formData.worksExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Collapse Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Expand Details (add structured work entries)
                </>
              )}
            </Button>
            
            {/* Expanded Work Cards */}
            {formData.worksExpanded && (
              <div className="mt-4 space-y-4">
                {formData.worksData.map((work, index) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    index={index}
                    onUpdate={updateWorkEntry}
                    onRemove={removeWorkEntry}
                    disabled={!canSubmit}
                  />
                ))}
                
                {/* Add Another Work Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addWorkEntry}
                  disabled={!canSubmit}
                  className="w-full border-dashed border-[var(--neon-amber)]/30 text-[var(--neon-amber)] hover:bg-[var(--neon-amber)]/10 hover:border-[var(--neon-amber)]/50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Work
                </Button>
                
                {errors.worksDataInquiry && (
                  <p className="text-sm neon-text-magenta">{errors.worksDataInquiry}</p>
                )}
                
                {/* Works Summary Preview */}
                {formData.worksData.length > 0 && worksSummary && (
                  <div className="bg-[var(--deep-space)] rounded-lg p-4 border border-[var(--neon-amber)]/20">
                    <Label className="text-xs text-muted-foreground">Auto-generated Summary</Label>
                    <p className="text-sm neon-text-amber mt-1">{worksSummary}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Jester Activity Slider */}
          <div className="cyber-form rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <NumberBadge num={4} variant="magenta" />
              <div>
                <h3 className="font-semibold neon-text-white">Jester Activity Level</h3>
                <p className="text-sm text-muted-foreground">0 = fully present, 10 = fully performing</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="neon-text-cyan">Fully Present</span>
                <span className={`font-bold ${getJesterColor(formData.jesterActivity)}`}>
                  {formData.jesterActivity} — {getJesterLabel(formData.jesterActivity)}
                </span>
                <span className="neon-text-magenta">Fully Performing</span>
              </div>
              <Slider
                value={[formData.jesterActivity]}
                onValueChange={([value]) => updateField('jesterActivity', value)}
                min={0}
                max={10}
                step={1}
                disabled={!canSubmit}
                className="[&_[role=slider]]:bg-[var(--neon-magenta)] [&_[role=slider]]:border-[var(--neon-cyan)] [&_[role=slider]]:shadow-[0_0_10px_var(--neon-magenta)]"
              />
              <div className="h-2 rounded-full jester-slider-track opacity-60" />
            </div>
          </div>

          {/* Energy Level */}
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={5} variant="amber" />
              <h3 className="font-semibold">Energy Level</h3>
            </div>
            <Select
              value={formData.energyLevel}
              onValueChange={(value) => updateField('energyLevel', value as FormData['energyLevel'])}
              disabled={!canSubmit}
            >
              <SelectTrigger className="cyber-input rounded-lg">
                <SelectValue placeholder="Select energy level" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--near-black)] border-[var(--neon-magenta)]/30">
                <SelectItem value="hot">🔥 Hot — High intensity, creative fire</SelectItem>
                <SelectItem value="sustainable">⚡ Sustainable — Balanced, steady pace</SelectItem>
                <SelectItem value="depleted">🌙 Depleted — Low energy, need rest</SelectItem>
              </SelectContent>
            </Select>
            {errors.energyLevel && (
              <p className="text-sm neon-text-magenta mt-2">{errors.energyLevel}</p>
            )}
          </div>

          {/* Step Tracking - 7 Day Input */}
          <div className="cyber-form rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <NumberBadge num={6} variant="cyan" />
              <div className="flex-1">
                <h3 className="font-semibold neon-text-white">Walking Engine — Step Tracker</h3>
                <p className="text-sm text-muted-foreground">Enter your daily step count for the week</p>
              </div>
              <Footprints className="h-5 w-5 neon-text-cyan" />
            </div>
            
            {/* 7-Day Step Input Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayLabels.map(({ key, short }) => (
                <div key={key} className="text-center">
                  <Label className="text-xs text-muted-foreground block mb-1">{short}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="99999"
                    value={formData.dailySteps[key] || ''}
                    onChange={(e) => updateSteps(key, parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="cyber-input rounded-lg text-center text-sm px-1 h-10"
                    disabled={!canSubmit}
                  />
                </div>
              ))}
            </div>

            {/* Step Summary */}
            <div className="bg-[var(--deep-space)] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weekly Total</span>
                <span className="font-bold neon-text-cyan text-lg">
                  {stepStats.total.toLocaleString()} steps
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Daily Average</span>
                <span className={`font-bold text-lg ${
                  stepStats.average >= STEP_THRESHOLD_HIGH 
                    ? 'neon-text-cyan' 
                    : stepStats.average >= STEP_THRESHOLD_LOW 
                      ? 'neon-text-amber' 
                      : 'neon-text-magenta'
                }`}>
                  {stepStats.average.toLocaleString()} steps/day
                </span>
              </div>
              
              {/* Visual Bar */}
              <div className="space-y-1">
                <div className="h-3 bg-[var(--void-black)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      stepStats.average >= STEP_THRESHOLD_HIGH 
                        ? 'bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-cyan)]' 
                        : stepStats.average >= STEP_THRESHOLD_LOW 
                          ? 'bg-gradient-to-r from-[var(--neon-amber)] to-[var(--neon-amber)]' 
                          : 'bg-gradient-to-r from-[var(--neon-magenta)] to-[var(--neon-magenta)]'
                    }`}
                    style={{ width: `${Math.min((stepStats.average / 15000) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0</span>
                  <span className="neon-text-magenta">5k (low)</span>
                  <span className="neon-text-cyan">8k+ (active)</span>
                  <span>15k</span>
                </div>
              </div>

              {/* Auto-suggestion indicator */}
              {stepStats.daysWithSteps > 0 && (
                <div className={`text-xs px-3 py-2 rounded-lg ${
                  stepStats.suggestion === 'yes' 
                    ? 'bg-[var(--neon-cyan)]/10 neon-text-cyan border border-[var(--neon-cyan)]/30' 
                    : stepStats.suggestion === 'no'
                      ? 'bg-[var(--neon-magenta)]/10 neon-text-magenta border border-[var(--neon-magenta)]/30'
                      : 'bg-muted/10 text-muted-foreground border border-muted/30'
                }`}>
                  {stepStats.suggestion === 'yes' && '✓ Walking Engine: Active (avg ≥ 8,000 steps)'}
                  {stepStats.suggestion === 'no' && '✗ Walking Engine: Low activity (avg < 5,000 steps)'}
                  {stepStats.suggestion === 'neutral' && '○ Walking Engine: Moderate activity'}
                </div>
              )}
            </div>

            {/* Walking Insights */}
            <div className="mt-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Walking Insights</Label>
              <Textarea
                value={formData.walkingInsights}
                onChange={(e) => updateField('walkingInsights', e.target.value)}
                placeholder="What surfaced during your walks? Thoughts, ideas, realizations..."
                className="cyber-input min-h-[80px] rounded-lg"
                disabled={!canSubmit}
              />
            </div>
          </div>

          {/* Partnership Temperature */}
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={7} variant="purple" />
              <h3 className="font-semibold">Partnership / Solitude Temperature</h3>
            </div>
            <Textarea
              value={formData.partnershipTemperature}
              onChange={(e) => updateField('partnershipTemperature', e.target.value)}
              placeholder="How was the balance between collaboration and solitude?"
              className="cyber-input min-h-[80px] rounded-lg"
              disabled={!canSubmit}
            />
            {errors.partnershipTemperature && (
              <p className="text-sm neon-text-magenta mt-2">{errors.partnershipTemperature}</p>
            )}
          </div>

          {/* Thing Worked / Resisted */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="cyber-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <NumberBadge num={8} variant="cyan" />
                <h3 className="font-semibold">One Thing That Worked</h3>
              </div>
              <Textarea
                value={formData.thingWorked}
                onChange={(e) => updateField('thingWorked', e.target.value)}
                placeholder="A win, breakthrough, or success"
                className="cyber-input min-h-[80px] rounded-lg"
                disabled={!canSubmit}
              />
              {errors.thingWorked && (
                <p className="text-sm neon-text-magenta mt-2">{errors.thingWorked}</p>
              )}
            </div>

            <div className="cyber-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <NumberBadge num={9} variant="magenta" />
                <h3 className="font-semibold">One Thing That Resisted</h3>
              </div>
              <Textarea
                value={formData.thingResisted}
                onChange={(e) => updateField('thingResisted', e.target.value)}
                placeholder="A challenge, friction, or obstacle"
                className="cyber-input min-h-[80px] rounded-lg"
                disabled={!canSubmit}
              />
              {errors.thingResisted && (
                <p className="text-sm neon-text-magenta mt-2">{errors.thingResisted}</p>
              )}
            </div>
          </div>

          {/* Somatic State */}
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={10} variant="amber" />
              <h3 className="font-semibold">Somatic State</h3>
            </div>
            <Textarea
              value={formData.somaticState}
              onChange={(e) => updateField('somaticState', e.target.value)}
              placeholder="How does your body feel? Any physical sensations or tensions?"
              className="cyber-input min-h-[80px] rounded-lg"
              disabled={!canSubmit}
            />
            {errors.somaticState && (
              <p className="text-sm neon-text-magenta mt-2">{errors.somaticState}</p>
            )}
          </div>

          {/* Door Intention */}
          <div className="cyber-form rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <NumberBadge num={11} variant="purple" />
              <div>
                <h3 className="font-semibold neon-text-white">Door Intention Whisper</h3>
                <p className="text-sm text-muted-foreground">Optional: A quiet intention for the week ahead</p>
              </div>
            </div>
            <Textarea
              value={formData.doorIntention}
              onChange={(e) => updateField('doorIntention', e.target.value)}
              placeholder="What do you whisper to yourself as you step through the door into next week?"
              className="cyber-input min-h-[80px] rounded-lg"
              disabled={!canSubmit}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    type="submit"
                    size="lg"
                    className={`w-full py-6 text-lg font-semibold transition-all duration-300 ${
                      canSubmit 
                        ? 'cyber-button-primary' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                    disabled={!canSubmit || submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Weekly Roundup
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {!canSubmit && (
                <TooltipContent className="bg-[var(--near-black)] border-[var(--neon-magenta)]/30">
                  {entryCount >= maxEntries 
                    ? `Maximum ${maxEntries} entries reached for this week`
                    : !hasCheckInDayEntry && !isCheckInDay
                    ? `First entry must be on ${checkInDay}. Current day: ${canSubmitData?.currentDay}`
                    : `Entry ${nextEntryNumber} of ${maxEntries} ready to submit`
                  }
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-8">
        <div className="container max-w-2xl">
          <div className="tattoo-line" />
        </div>
      </footer>
    </div>
  );
}
