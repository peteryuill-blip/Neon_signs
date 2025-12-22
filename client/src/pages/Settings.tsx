import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  Calendar, 
  Clock, 
  Globe, 
  RefreshCw,
  Save,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TIMEZONES = [
  { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "Europe/London", label: "London (UTC+0)" },
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+11)" },
];

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
] as const;

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  
  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      utils.stats.dashboard.invalidate();
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
  
  const newCycle = trpc.settings.newCycle.useMutation({
    onSuccess: (data) => {
      utils.settings.get.invalidate();
      utils.stats.dashboard.invalidate();
      toast.success(`Started Crucible Year ${data.newCycle}!`);
    },
    onError: (error) => {
      toast.error(`Failed to start new cycle: ${error.message}`);
    },
  });
  
  // Form state
  const [startDate, setStartDate] = useState("");
  const [checkInDay, setCheckInDay] = useState<typeof DAYS[number]>("Sunday");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [newCycleDate, setNewCycleDate] = useState("");
  
  // Initialize form when settings load
  useEffect(() => {
    if (settings) {
      const date = new Date(settings.crucibleStartDate);
      setStartDate(date.toISOString().split('T')[0]);
      setCheckInDay(settings.checkInDay);
      setTimezone(settings.timezone);
    }
  }, [settings]);
  
  const handleSave = () => {
    updateSettings.mutate({
      crucibleStartDate: new Date(startDate).toISOString(),
      checkInDay,
      timezone,
    });
  };
  
  const handleNewCycle = () => {
    if (!newCycleDate) {
      toast.error("Please select a start date for the new cycle");
      return;
    }
    newCycle.mutate({ newStartDate: new Date(newCycleDate).toISOString() });
  };
  
  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-neon-cyan">Loading settings...</div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border-neon-magenta/30">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Please log in to access settings.</p>
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
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-neon-cyan" />
                <h1 className="text-xl font-bold text-foreground">Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Crucible Year Configuration */}
          <Card className="border-neon-cyan/20 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-neon-cyan" />
                Crucible Year Configuration
              </CardTitle>
              <CardDescription>
                Configure when your Crucible Year starts and how weeks are calculated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-foreground">
                  Week 0 Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  This is when your Crucible Year begins (Week 0).
                </p>
              </div>
              
              {/* Check-in Day */}
              <div className="space-y-2">
                <Label htmlFor="checkInDay" className="text-foreground">
                  Check-in Day
                </Label>
                <Select value={checkInDay} onValueChange={(v) => setCheckInDay(v as typeof DAYS[number])}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The day of the week when you submit your roundups.
                </p>
              </div>
              
              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used to determine when check-in day begins and ends.
                </p>
              </div>
              
              {/* Current Cycle Info */}
              {settings && (
                <div className="p-4 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-neon-cyan" />
                    <span className="text-muted-foreground">Current Cycle:</span>
                    <span className="font-semibold text-neon-cyan">
                      Crucible Year {settings.currentCycle}
                    </span>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleSave} 
                disabled={updateSettings.isPending}
                className="w-full bg-neon-cyan hover:bg-neon-cyan/80 text-background"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
          
          <Separator className="bg-border/50" />
          
          {/* New Cycle / Reset */}
          <Card className="border-neon-magenta/20 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-neon-magenta" />
                Start New Cycle
              </CardTitle>
              <CardDescription>
                Begin a new Crucible Year while preserving all historical data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-neon-magenta/5 border border-neon-magenta/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-neon-magenta mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">What happens:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Your current data is preserved in history</li>
                      <li>Week counter resets to Week 0</li>
                      <li>Cycle number increments (e.g., Year 1 → Year 2)</li>
                      <li>You can view all previous cycles in History</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newCycleDate" className="text-foreground">
                  New Cycle Start Date
                </Label>
                <Input
                  id="newCycleDate"
                  type="date"
                  value={newCycleDate}
                  onChange={(e) => setNewCycleDate(e.target.value)}
                  className="bg-background border-border"
                />
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-neon-magenta/50 text-neon-magenta hover:bg-neon-magenta/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Start New Crucible Year
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-neon-magenta/30">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start New Crucible Year?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset your week counter to Week 0 and begin a new cycle. 
                      All your existing roundups will be preserved and accessible in History.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleNewCycle}
                      className="bg-neon-magenta hover:bg-neon-magenta/80"
                    >
                      {newCycle.isPending ? "Starting..." : "Start New Cycle"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
