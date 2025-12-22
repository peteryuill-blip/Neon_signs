import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link, useParams, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Save,
  Cloud,
  Clock,
  Palette,
  Sparkles,
  Zap,
  Footprints,
  Heart,
  CheckCircle,
  XCircle,
  Activity,
  DoorOpen,
  Loader2
} from "lucide-react";

export default function EditRoundup() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  
  const roundupId = parseInt(id || "0");
  
  const { data: roundup, isLoading: roundupLoading, error } = trpc.roundupEdit.get.useQuery(
    { id: roundupId },
    { enabled: !!user && roundupId > 0 }
  );
  
  const updateRoundup = trpc.roundupEdit.update.useMutation({
    onSuccess: () => {
      utils.roundup.getAll.invalidate();
      utils.stats.dashboard.invalidate();
      toast.success("Roundup updated successfully");
      setLocation("/history");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
  
  // Form state
  const [weatherReport, setWeatherReport] = useState("");
  const [studioHours, setStudioHours] = useState(0);
  const [worksMade, setWorksMade] = useState("");
  const [jesterActivity, setJesterActivity] = useState(5);
  const [energyLevel, setEnergyLevel] = useState<"hot" | "sustainable" | "depleted">("sustainable");
  const [walkingEngineUsed, setWalkingEngineUsed] = useState(false);
  const [walkingInsights, setWalkingInsights] = useState("");
  const [partnershipTemperature, setPartnershipTemperature] = useState("");
  const [thingWorked, setThingWorked] = useState("");
  const [thingResisted, setThingResisted] = useState("");
  const [somaticState, setSomaticState] = useState("");
  const [doorIntention, setDoorIntention] = useState("");
  
  // Initialize form when roundup loads
  useEffect(() => {
    if (roundup) {
      setWeatherReport(roundup.weatherReport || "");
      setStudioHours(roundup.studioHours || 0);
      setWorksMade(roundup.worksMade || "");
      setJesterActivity(roundup.jesterActivity || 5);
      setEnergyLevel(roundup.energyLevel || "sustainable");
      setWalkingEngineUsed(roundup.walkingEngineUsed || false);
      setWalkingInsights(roundup.walkingInsights || "");
      setPartnershipTemperature(roundup.partnershipTemperature || "");
      setThingWorked(roundup.thingWorked || "");
      setThingResisted(roundup.thingResisted || "");
      setSomaticState(roundup.somaticState || "");
      setDoorIntention(roundup.doorIntention || "");
    }
  }, [roundup]);
  
  const handleSave = () => {
    updateRoundup.mutate({
      id: roundupId,
      weatherReport,
      studioHours,
      worksMade,
      jesterActivity,
      energyLevel,
      walkingEngineUsed,
      walkingInsights: walkingEngineUsed ? walkingInsights : undefined,
      partnershipTemperature,
      thingWorked,
      thingResisted,
      somaticState,
      doorIntention: doorIntention || undefined,
    });
  };
  
  if (authLoading || roundupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
            <div className="absolute inset-0 blur-xl bg-[var(--neon-cyan)] opacity-30" />
          </div>
          <p className="text-muted-foreground">Loading roundup...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 neon-text-magenta">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to edit roundups.</p>
        </div>
      </div>
    );
  }
  
  if (error || !roundup) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 neon-text-magenta">Roundup Not Found</h2>
          <p className="text-muted-foreground mb-6">This roundup doesn't exist or access denied.</p>
          <Link href="/history">
            <Button className="cyber-button-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--neon-cyan)]/20 sticky top-0 bg-[var(--void-black)]/95 backdrop-blur z-50">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent opacity-50" />
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold neon-text-white">
                  Edit Week {roundup.weekNumber}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(roundup.createdAt).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSave}
              disabled={updateRoundup.isPending}
              className="cyber-button-primary"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateRoundup.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Weather Report */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-5 w-5 neon-text-cyan" />
                <h3 className="text-lg font-semibold neon-text-cyan">Weather Report</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                How are you feeling? What's the emotional weather this week?
              </p>
              <Textarea
                value={weatherReport}
                onChange={(e) => setWeatherReport(e.target.value)}
                placeholder="Describe your internal weather..."
                className="cyber-input min-h-[100px]"
              />
            </div>
          </div>

          {/* Studio Hours & Works Made */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 neon-text-magenta" />
                  <h3 className="text-lg font-semibold neon-text-magenta">Studio Hours</h3>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={studioHours}
                  onChange={(e) => setStudioHours(parseFloat(e.target.value) || 0)}
                  className="cyber-input"
                />
              </div>
            </div>

            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="h-5 w-5 neon-text-purple" />
                  <h3 className="text-lg font-semibold neon-text-purple">Works Made</h3>
                </div>
                <Input
                  value={worksMade}
                  onChange={(e) => setWorksMade(e.target.value)}
                  placeholder="Started: X / Finished: Y"
                  className="cyber-input"
                />
              </div>
            </div>
          </div>

          {/* Jester Activity */}
          <div className="cyber-card rounded-xl overflow-hidden" style={{ borderColor: 'rgba(255, 20, 147, 0.3)' }}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 neon-text-magenta" />
                <h3 className="text-lg font-semibold neon-text-magenta">Jester Activity</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                0 = fully present, 10 = fully performing
              </p>
              <Slider
                value={[jesterActivity]}
                onValueChange={([v]) => setJesterActivity(v)}
                min={0}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>Present</span>
                <span className="text-3xl font-bold neon-text-magenta">{jesterActivity}</span>
                <span>Performing</span>
              </div>
            </div>
          </div>

          {/* Energy Level */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 neon-text-amber" />
                <h3 className="text-lg font-semibold neon-text-amber">Energy Level</h3>
              </div>
              <Select value={energyLevel} onValueChange={(v) => setEnergyLevel(v as typeof energyLevel)}>
                <SelectTrigger className="cyber-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[var(--void-black)] border-[var(--neon-cyan)]/30">
                  <SelectItem value="hot" className="hover:bg-[var(--neon-amber)]/10 focus:bg-[var(--neon-amber)]/10">
                    🔥 Hot (high energy, sustainable)
                  </SelectItem>
                  <SelectItem value="sustainable" className="hover:bg-[var(--neon-cyan)]/10 focus:bg-[var(--neon-cyan)]/10">
                    ⚡ Sustainable (balanced)
                  </SelectItem>
                  <SelectItem value="depleted" className="hover:bg-[var(--neon-purple)]/10 focus:bg-[var(--neon-purple)]/10">
                    🌙 Depleted (low energy)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Walking Engine */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Footprints className="h-5 w-5 neon-text-cyan" />
                <h3 className="text-lg font-semibold neon-text-cyan">Walking Engine</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="walking-toggle" className="text-foreground/80">
                    Did you use the walking engine this week?
                  </Label>
                  <Switch
                    id="walking-toggle"
                    checked={walkingEngineUsed}
                    onCheckedChange={setWalkingEngineUsed}
                  />
                </div>
                {walkingEngineUsed && (
                  <Textarea
                    value={walkingInsights}
                    onChange={(e) => setWalkingInsights(e.target.value)}
                    placeholder="What insights emerged from walking?"
                    className="cyber-input"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Partnership Temperature */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 neon-text-magenta" />
                <h3 className="text-lg font-semibold neon-text-magenta">Partnership/Solitude Temperature</h3>
              </div>
              <Textarea
                value={partnershipTemperature}
                onChange={(e) => setPartnershipTemperature(e.target.value)}
                placeholder="How are you feeling about connection vs. solitude?"
                className="cyber-input"
              />
            </div>
          </div>

          {/* Thing Worked / Resisted */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="cyber-card rounded-xl overflow-hidden" style={{ borderColor: 'rgba(0, 240, 255, 0.3)' }}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 neon-text-cyan" />
                  <h3 className="text-lg font-semibold neon-text-cyan">One Thing That Worked</h3>
                </div>
                <Textarea
                  value={thingWorked}
                  onChange={(e) => setThingWorked(e.target.value)}
                  placeholder="What worked well this week?"
                  className="cyber-input min-h-[80px]"
                />
              </div>
            </div>

            <div className="cyber-card rounded-xl overflow-hidden" style={{ borderColor: 'rgba(255, 20, 147, 0.3)' }}>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <XCircle className="h-5 w-5 neon-text-magenta" />
                  <h3 className="text-lg font-semibold neon-text-magenta">One Thing That Resisted</h3>
                </div>
                <Textarea
                  value={thingResisted}
                  onChange={(e) => setThingResisted(e.target.value)}
                  placeholder="What resisted or blocked you?"
                  className="cyber-input min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Somatic State */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 neon-text-purple" />
                <h3 className="text-lg font-semibold neon-text-purple">Somatic State</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                How did the week feel in your body?
              </p>
              <Textarea
                value={somaticState}
                onChange={(e) => setSomaticState(e.target.value)}
                placeholder="Describe physical sensations, tension, energy..."
                className="cyber-input"
              />
            </div>
          </div>

          {/* Door Intention */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <DoorOpen className="h-5 w-5 neon-text-cyan" />
                <h3 className="text-lg font-semibold neon-text-cyan">Door Intention (Optional)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                A soft hold for the week ahead
              </p>
              <Textarea
                value={doorIntention}
                onChange={(e) => setDoorIntention(e.target.value)}
                placeholder="What intention do you carry forward?"
                className="cyber-input"
              />
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={updateRoundup.isPending}
            className="w-full cyber-button-primary py-6 text-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {updateRoundup.isPending ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
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
