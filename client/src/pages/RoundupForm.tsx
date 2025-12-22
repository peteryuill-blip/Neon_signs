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
  if (value <= 3) return 'text-green-400';
  if (value <= 6) return 'text-yellow-400';
  return 'text-red-400';
}

function getJesterLabel(value: number): string {
  if (value === 0) return 'Fully Present';
  if (value <= 2) return 'Mostly Present';
  if (value <= 4) return 'Balanced';
  if (value <= 6) return 'Some Performance';
  if (value <= 8) return 'Mostly Performing';
  return 'Fully Performing';
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
      // Clear draft on successful submission
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
    // Clear error when field is updated
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin neon-text-cyan" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to submit your weekly roundup.</p>
            <Button onClick={() => window.location.href = getLoginUrl()}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSubmit = canSubmitData?.canSubmit ?? false;
  const isSunday = canSubmitData?.isSunday ?? false;
  const alreadySubmitted = canSubmitData?.alreadySubmitted ?? false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Weekly Roundup</h1>
              <p className="text-sm text-muted-foreground">
                Week {canSubmitData?.weekNumber}, {canSubmitData?.year}
              </p>
            </div>
          </div>
          {draftSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Save className="h-4 w-4" />
              Draft saved
            </div>
          )}
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Status Banner */}
        {!canSubmit && (
          <Card className="mb-6 border-border/50 bg-card/50">
            <CardContent className="py-4">
              {alreadySubmitted ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="font-medium">Already submitted this week</p>
                    <p className="text-sm text-muted-foreground">
                      You can view your results or wait until next Sunday.
                    </p>
                  </div>
                  <Link href={`/results/${canSubmitData?.existingRoundupId}`} className="ml-auto">
                    <Button variant="outline" size="sm">View Results</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 neon-text-magenta" />
                  <div>
                    <p className="font-medium">Submissions open on Sundays only</p>
                    <p className="text-sm text-muted-foreground">
                      Current day: {canSubmitData?.currentDay} (Bangkok time, UTC+7)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weather Report */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">1</span>
                Weather Report
              </CardTitle>
              <CardDescription>
                Emotional/atmospheric summary of your week (2-3 sentences)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.weatherReport}
                onChange={(e) => updateField('weatherReport', e.target.value)}
                placeholder="How did this week feel? What was the emotional weather?"
                className="min-h-[100px] bg-input border-border"
                disabled={!canSubmit}
              />
              {errors.weatherReport && (
                <p className="text-sm text-destructive mt-1">{errors.weatherReport}</p>
              )}
            </CardContent>
          </Card>

          {/* Studio Hours & Works Made */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">2</span>
                  Studio Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min="0"
                  max="168"
                  step="0.5"
                  value={formData.studioHours}
                  onChange={(e) => updateField('studioHours', parseFloat(e.target.value) || 0)}
                  className="bg-input border-border"
                  disabled={!canSubmit}
                />
                {errors.studioHours && (
                  <p className="text-sm text-destructive mt-1">{errors.studioHours}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">3</span>
                  Works Made
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.worksMade}
                  onChange={(e) => updateField('worksMade', e.target.value)}
                  placeholder="Major progress or pieces completed"
                  className="min-h-[80px] bg-input border-border"
                  disabled={!canSubmit}
                />
                {errors.worksMade && (
                  <p className="text-sm text-destructive mt-1">{errors.worksMade}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jester Activity Slider */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">4</span>
                Jester Activity Level
              </CardTitle>
              <CardDescription>
                0 = fully present, 10 = fully performing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Fully Present</span>
                <span className={`font-bold ${getJesterColor(formData.jesterActivity)}`}>
                  {formData.jesterActivity} — {getJesterLabel(formData.jesterActivity)}
                </span>
                <span className="text-red-400">Fully Performing</span>
              </div>
              <Slider
                value={[formData.jesterActivity]}
                onValueChange={([value]) => updateField('jesterActivity', value)}
                min={0}
                max={10}
                step={1}
                disabled={!canSubmit}
                className="[&_[role=slider]]:bg-primary"
              />
              <div className="h-2 rounded-full jester-slider-track opacity-50" />
            </CardContent>
          </Card>

          {/* Energy Level */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">5</span>
                Energy Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={formData.energyLevel}
                onValueChange={(value) => updateField('energyLevel', value as FormData['energyLevel'])}
                disabled={!canSubmit}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select energy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">🔥 Hot — High intensity, creative fire</SelectItem>
                  <SelectItem value="sustainable">⚙️ Sustainable — Balanced, steady pace</SelectItem>
                  <SelectItem value="depleted">🪫 Depleted — Low energy, need rest</SelectItem>
                </SelectContent>
              </Select>
              {errors.energyLevel && (
                <p className="text-sm text-destructive mt-1">{errors.energyLevel}</p>
              )}
            </CardContent>
          </Card>

          {/* Walking Engine */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">6</span>
                Walking Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="walkingEngine"
                  checked={formData.walkingEngineUsed}
                  onCheckedChange={(checked) => updateField('walkingEngineUsed', !!checked)}
                  disabled={!canSubmit}
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
                  className="min-h-[80px] bg-input border-border"
                  disabled={!canSubmit}
                />
              )}
            </CardContent>
          </Card>

          {/* Partnership Temperature */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">7</span>
                Partnership/Solitude Temperature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.partnershipTemperature}
                onChange={(e) => updateField('partnershipTemperature', e.target.value)}
                placeholder="How did connection and solitude feel this week?"
                className="min-h-[80px] bg-input border-border"
                disabled={!canSubmit}
              />
              {errors.partnershipTemperature && (
                <p className="text-sm text-destructive mt-1">{errors.partnershipTemperature}</p>
              )}
            </CardContent>
          </Card>

          {/* Thing Worked / Thing Resisted */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm neon-text-cyan">8</span>
                  One Thing That Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.thingWorked}
                  onChange={(e) => updateField('thingWorked', e.target.value)}
                  placeholder="What succeeded this week?"
                  className="min-h-[80px] bg-input border-border"
                  disabled={!canSubmit}
                />
                {errors.thingWorked && (
                  <p className="text-sm text-destructive mt-1">{errors.thingWorked}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-sm neon-text-magenta">9</span>
                  One Thing That Resisted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.thingResisted}
                  onChange={(e) => updateField('thingResisted', e.target.value)}
                  placeholder="What pushed back this week?"
                  className="min-h-[80px] bg-input border-border"
                  disabled={!canSubmit}
                />
                {errors.thingResisted && (
                  <p className="text-sm text-destructive mt-1">{errors.thingResisted}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Somatic State */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--neon-blue)]/20 flex items-center justify-center text-sm neon-text-blue">10</span>
                Somatic State
              </CardTitle>
              <CardDescription>
                Where did you feel this week in your body?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.somaticState}
                onChange={(e) => updateField('somaticState', e.target.value)}
                placeholder="Shoulders? Chest? Stomach? What sensations?"
                className="min-h-[80px] bg-input border-border"
                disabled={!canSubmit}
              />
              {errors.somaticState && (
                <p className="text-sm text-destructive mt-1">{errors.somaticState}</p>
              )}
            </CardContent>
          </Card>

          {/* Door Intention (Optional) */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">11</span>
                Door Intention Whisper
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </CardTitle>
              <CardDescription>
                A quiet intention for the week ahead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.doorIntention}
                onChange={(e) => updateField('doorIntention', e.target.value)}
                placeholder="What do you whisper to the door as you leave?"
                className="min-h-[60px] bg-input border-border"
                disabled={!canSubmit}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full neon-glow-cyan bg-primary hover:bg-primary/90"
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
                <TooltipContent>
                  {alreadySubmitted 
                    ? "You've already submitted this week's roundup"
                    : `Come back Sunday (Bangkok time). Current day: ${canSubmitData?.currentDay}`
                  }
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </form>
      </main>
    </div>
  );
}
