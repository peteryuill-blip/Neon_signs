import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertTriangle,
  Loader2
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
            <div className="absolute inset-0 blur-xl bg-[var(--neon-cyan)] opacity-30" />
          </div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 neon-text-magenta">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access settings.</p>
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
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 neon-text-cyan" />
                <h1 className="text-xl font-bold neon-text-white">Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <div className="space-y-8">
          {/* Crucible Year Configuration */}
          <div className="cyber-card rounded-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 neon-text-cyan" />
                <h2 className="text-lg font-semibold neon-text-cyan">Crucible Year Configuration</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Configure when your Crucible Year starts and how weeks are calculated.
              </p>
              
              <div className="space-y-6">
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
                    className="cyber-input"
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
                    <SelectTrigger className="cyber-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--void-black)] border-[var(--neon-cyan)]/30">
                      {DAYS.map((day) => (
                        <SelectItem 
                          key={day} 
                          value={day}
                          className="hover:bg-[var(--neon-cyan)]/10 focus:bg-[var(--neon-cyan)]/10"
                        >
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
                    <SelectTrigger className="cyber-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--void-black)] border-[var(--neon-cyan)]/30">
                      {TIMEZONES.map((tz) => (
                        <SelectItem 
                          key={tz.value} 
                          value={tz.value}
                          className="hover:bg-[var(--neon-cyan)]/10 focus:bg-[var(--neon-cyan)]/10"
                        >
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
                  <div className="p-4 rounded-lg bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/30">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 neon-text-cyan" />
                      <span className="text-muted-foreground">Current Cycle:</span>
                      <span className="font-semibold neon-text-cyan">
                        Crucible Year {settings.currentCycle}
                      </span>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleSave} 
                  disabled={updateSettings.isPending}
                  className="w-full cyber-button-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateSettings.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Divider */}
          <div className="tattoo-line" />
          
          {/* New Cycle / Reset */}
          <div className="cyber-card rounded-xl overflow-hidden" style={{ borderColor: 'rgba(255, 20, 147, 0.3)' }}>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-5 w-5 neon-text-magenta" />
                <h2 className="text-lg font-semibold neon-text-magenta">Start New Cycle</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Begin a new Crucible Year while preserving all historical data.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--neon-magenta)]/5 border border-[var(--neon-magenta)]/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 neon-text-magenta mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-2">What happens:</p>
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
                    className="cyber-input"
                    style={{ borderColor: 'rgba(255, 20, 147, 0.3)' }}
                  />
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full border-[var(--neon-magenta)]/50 text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10 hover:border-[var(--neon-magenta)]"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start New Crucible Year
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[var(--void-black)] border-[var(--neon-magenta)]/30">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="neon-text-magenta">Start New Crucible Year?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        This will reset your week counter to Week 0 and begin a new cycle. 
                        All your existing roundups will be preserved and accessible in History.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-[var(--neon-cyan)]/30 hover:bg-[var(--neon-cyan)]/10">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleNewCycle}
                        className="bg-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/80 text-white"
                      >
                        {newCycle.isPending ? "Starting..." : "Start New Cycle"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
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
