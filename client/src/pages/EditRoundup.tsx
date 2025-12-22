import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-neon-magenta/30">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Please log in to edit roundups.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !roundup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-destructive/30">
          <CardContent className="p-6">
            <p className="text-destructive">Roundup not found or access denied.</p>
            <Link href="/history">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/history">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">
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
              className="bg-neon-cyan hover:bg-neon-cyan/80 text-background"
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
          <Card className="border-neon-cyan/20 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cloud className="h-5 w-5 text-neon-cyan" />
                Weather Report
              </CardTitle>
              <CardDescription>
                How are you feeling? What's the emotional weather this week?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={weatherReport}
                onChange={(e) => setWeatherReport(e.target.value)}
                placeholder="Describe your internal weather..."
                className="min-h-[100px] bg-background border-border"
              />
            </CardContent>
          </Card>

          {/* Studio Hours & Works Made */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-neon-magenta" />
                  Studio Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={studioHours}
                  onChange={(e) => setStudioHours(parseFloat(e.target.value) || 0)}
                  className="bg-background border-border"
                />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-neon-blue" />
                  Works Made
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={worksMade}
                  onChange={(e) => setWorksMade(e.target.value)}
                  placeholder="Started: X / Finished: Y"
                  className="bg-background border-border"
                />
              </CardContent>
            </Card>
          </div>

          {/* Jester Activity */}
          <Card className="border-neon-magenta/20 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-neon-magenta" />
                Jester Activity
              </CardTitle>
              <CardDescription>
                0 = fully present, 10 = fully performing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider
                value={[jesterActivity]}
                onValueChange={([v]) => setJesterActivity(v)}
                min={0}
                max={10}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Present</span>
                <span className="text-2xl font-bold text-neon-magenta">{jesterActivity}</span>
                <span>Performing</span>
              </div>
            </CardContent>
          </Card>

          {/* Energy Level */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-yellow-500" />
                Energy Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={energyLevel} onValueChange={(v) => setEnergyLevel(v as typeof energyLevel)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">🔥 Hot (high energy, sustainable)</SelectItem>
                  <SelectItem value="sustainable">⚡ Sustainable (balanced)</SelectItem>
                  <SelectItem value="depleted">💨 Depleted (low energy)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Walking Engine */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Footprints className="h-5 w-5 text-green-500" />
                Walking Engine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="walking-toggle">Did you use the walking engine this week?</Label>
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
                  className="bg-background border-border"
                />
              )}
            </CardContent>
          </Card>

          {/* Partnership Temperature */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5 text-pink-500" />
                Partnership/Solitude Temperature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={partnershipTemperature}
                onChange={(e) => setPartnershipTemperature(e.target.value)}
                placeholder="How are you feeling about connection vs. solitude?"
                className="bg-background border-border"
              />
            </CardContent>
          </Card>

          {/* Thing Worked / Resisted */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-green-500/20 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  One Thing That Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={thingWorked}
                  onChange={(e) => setThingWorked(e.target.value)}
                  placeholder="What worked well this week?"
                  className="bg-background border-border min-h-[80px]"
                />
              </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <XCircle className="h-5 w-5 text-red-500" />
                  One Thing That Resisted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={thingResisted}
                  onChange={(e) => setThingResisted(e.target.value)}
                  placeholder="What resisted or blocked you?"
                  className="bg-background border-border min-h-[80px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Somatic State */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-purple-500" />
                Somatic State
              </CardTitle>
              <CardDescription>
                How did the week feel in your body?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={somaticState}
                onChange={(e) => setSomaticState(e.target.value)}
                placeholder="Describe physical sensations, tension, energy..."
                className="bg-background border-border"
              />
            </CardContent>
          </Card>

          {/* Door Intention */}
          <Card className="border-neon-cyan/20 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DoorOpen className="h-5 w-5 text-neon-cyan" />
                Door Intention (Optional)
              </CardTitle>
              <CardDescription>
                A soft hold for the week ahead
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={doorIntention}
                onChange={(e) => setDoorIntention(e.target.value)}
                placeholder="What intention do you carry forward?"
                className="bg-background border-border"
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={updateRoundup.isPending}
            className="w-full bg-neon-cyan hover:bg-neon-cyan/80 text-background py-6 text-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {updateRoundup.isPending ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
}
