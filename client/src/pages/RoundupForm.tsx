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
import { Loader2, ArrowLeft, Calendar, AlertCircle, CheckCircle2, Save } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

const DRAFT_KEY = 'neon-signs-roundup-draft';

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
}

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
};

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

export default function RoundupForm() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
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

  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    submitMutation.mutate({
      weatherReport: formData.weatherReport,
      studioHours: formData.studioHours,
      worksMade: formData.worksMade,
      jesterActivity: formData.jesterActivity,
      energyLevel: formData.energyLevel as 'hot' | 'sustainable' | 'depleted',
      walkingEngineUsed: formData.walkingEngineUsed,
      walkingInsights: formData.walkingInsights || null,
      partnershipTemperature: formData.partnershipTemperature,
      thingWorked: formData.thingWorked,
      thingResisted: formData.thingResisted,
      somaticState: formData.somaticState,
      doorIntention: formData.doorIntention || null,
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
  const alreadySubmitted = canSubmitData?.alreadySubmitted ?? false;
  const checkInDay = canSubmitData?.checkInDay ?? 'Sunday';

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
            {alreadySubmitted ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--neon-cyan)]/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 neon-text-cyan" />
                </div>
                <div className="flex-1">
                  <p className="font-medium neon-text-cyan">Already submitted this week</p>
                  <p className="text-sm text-muted-foreground">
                    You can view your results or wait until next {checkInDay}.
                  </p>
                </div>
                <Link href={`/results/${canSubmitData?.existingRoundupId}`}>
                  <Button className="cyber-button-secondary">View Results</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--neon-magenta)]/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 neon-text-magenta" />
                </div>
                <div>
                  <p className="font-medium neon-text-magenta">Submissions open on {checkInDay}s only</p>
                  <p className="text-sm text-muted-foreground">
                    Current day: {canSubmitData?.currentDay}
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

          {/* Studio Hours & Works Made */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="cyber-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <NumberBadge num={3} variant="cyan" />
                <h3 className="font-semibold">Works Made</h3>
              </div>
              <Textarea
                value={formData.worksMade}
                onChange={(e) => updateField('worksMade', e.target.value)}
                placeholder="Major progress or pieces completed"
                className="cyber-input min-h-[80px] rounded-lg"
                disabled={!canSubmit}
              />
              {errors.worksMade && (
                <p className="text-sm neon-text-magenta mt-2">{errors.worksMade}</p>
              )}
            </div>
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

          {/* Walking Engine */}
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={6} variant="cyan" />
              <h3 className="font-semibold">Walking Engine</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="walkingEngine"
                  checked={formData.walkingEngineUsed}
                  onCheckedChange={(checked) => updateField('walkingEngineUsed', !!checked)}
                  disabled={!canSubmit}
                  className="border-[var(--neon-cyan)] data-[state=checked]:bg-[var(--neon-cyan)] data-[state=checked]:border-[var(--neon-cyan)]"
                />
                <Label htmlFor="walkingEngine" className="cursor-pointer">
                  Did you use the walking engine this week?
                </Label>
              </div>
              {formData.walkingEngineUsed && (
                <Textarea
                  value={formData.walkingInsights}
                  onChange={(e) => updateField('walkingInsights', e.target.value)}
                  placeholder="What surfaced during your walks?"
                  className="cyber-input min-h-[80px] rounded-lg"
                  disabled={!canSubmit}
                />
              )}
            </div>
          </div>

          {/* Partnership Temperature */}
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={7} variant="purple" />
              <h3 className="font-semibold">Partnership/Solitude Temperature</h3>
            </div>
            <Textarea
              value={formData.partnershipTemperature}
              onChange={(e) => updateField('partnershipTemperature', e.target.value)}
              placeholder="How did connection and solitude feel this week?"
              className="cyber-input min-h-[80px] rounded-lg"
              disabled={!canSubmit}
            />
            {errors.partnershipTemperature && (
              <p className="text-sm neon-text-magenta mt-2">{errors.partnershipTemperature}</p>
            )}
          </div>

          {/* Thing Worked / Thing Resisted */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="cyber-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <NumberBadge num={8} variant="cyan" />
                <h3 className="font-semibold">One Thing That Worked</h3>
              </div>
              <Textarea
                value={formData.thingWorked}
                onChange={(e) => updateField('thingWorked', e.target.value)}
                placeholder="What succeeded this week?"
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
                placeholder="What pushed back this week?"
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
              <NumberBadge num={10} variant="purple" />
              <div>
                <h3 className="font-semibold">Somatic State</h3>
                <p className="text-sm text-muted-foreground">Where did you feel this week in your body?</p>
              </div>
            </div>
            <Textarea
              value={formData.somaticState}
              onChange={(e) => updateField('somaticState', e.target.value)}
              placeholder="Shoulders? Chest? Stomach? What sensations?"
              className="cyber-input min-h-[80px] rounded-lg"
              disabled={!canSubmit}
            />
            {errors.somaticState && (
              <p className="text-sm neon-text-magenta mt-2">{errors.somaticState}</p>
            )}
          </div>

          {/* Door Intention (Optional) */}
          <div className="cyber-card rounded-xl p-5 opacity-80">
            <div className="flex items-center gap-3 mb-3">
              <NumberBadge num={11} variant="muted" />
              <div>
                <h3 className="font-semibold">Door Intention Whisper</h3>
                <p className="text-sm text-muted-foreground">A quiet intention for the week ahead (optional)</p>
              </div>
            </div>
            <Textarea
              value={formData.doorIntention}
              onChange={(e) => updateField('doorIntention', e.target.value)}
              placeholder="What do you whisper to the door as you leave?"
              className="cyber-input min-h-[60px] rounded-lg"
              disabled={!canSubmit}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <div className="tattoo-line mb-6" />
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
                  {alreadySubmitted 
                    ? "You've already submitted this week's roundup"
                    : `Come back ${checkInDay} (Bangkok time). Current day: ${canSubmitData?.currentDay}`
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
