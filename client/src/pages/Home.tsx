import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Calendar, Clock, Zap, Activity, TrendingUp, Archive, ChevronRight, Footprints, StickyNote, X, Send, ArrowUpRight, ArrowDownRight, Minus, FlaskConical, Heart } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

function NeonLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] flex items-center justify-center">
          <span className="text-xl font-bold text-black">N</span>
        </div>
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight neon-text-cyan">NEON SIGNS</h1>
        <p className="text-xs text-muted-foreground">The Mirror That Glows</p>
      </div>
    </div>
  );
}

function EnergyBadge({ level }: { level: string }) {
  const config = {
    hot: { emoji: '🔥', label: 'Hot', color: 'var(--energy-hot)' },
    sustainable: { emoji: '⚡', label: 'Sustainable', color: 'var(--energy-sustainable)' },
    depleted: { emoji: '🌙', label: 'Depleted', color: 'var(--energy-depleted)' },
  };
  const { emoji, label, color } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color }}>
      <span>{emoji}</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

function JesterBadge({ value }: { value: number }) {
  let color = 'var(--jester-clear)';
  let label = 'Clear';
  let icon = '✓';
  
  if (value >= 9) {
    color = 'var(--jester-critical)';
    label = 'Critical';
    icon = '⚠';
  } else if (value >= 6) {
    color = 'var(--jester-alert)';
    label = 'Active';
    icon = '⚠';
  } else if (value >= 3) {
    color = 'var(--jester-watch)';
    label = 'Watch';
    icon = '◉';
  }
  
  return (
    <div className="flex items-center gap-2" style={{ color }}>
      <span className="data-code text-2xl font-bold">{value}/10</span>
      <span className="text-sm font-medium">{icon} {label}</span>
    </div>
  );
}

function DeltaIndicator({ delta, inverted = false, suffix = '' }: { delta: number | null; inverted?: boolean; suffix?: string }) {
  if (delta === null || delta === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const isPositive = inverted ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  const colorClass = isPositive ? 'text-[var(--status-save)]' : 'text-[var(--status-trash)]';
  const sign = delta > 0 ? '+' : '';
  
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {sign}{typeof delta === 'number' && Math.abs(delta) >= 100 ? Math.round(delta / 1000) + 'k' : delta}{suffix}
    </span>
  );
}

// Quick Notes Widget
function QuickNotesWidget() {
  const [newNote, setNewNote] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const utils = trpc.useUtils();
  
  const { data: notes, isLoading } = trpc.quickNotes.getUnused.useQuery();
  
  const createNote = trpc.quickNotes.create.useMutation({
    onSuccess: () => {
      setNewNote("");
      utils.quickNotes.getUnused.invalidate();
      toast.success("Note saved!");
    },
    onError: () => {
      toast.error("Failed to save note");
    }
  });
  
  const deleteNote = trpc.quickNotes.delete.useMutation({
    onSuccess: () => {
      utils.quickNotes.getUnused.invalidate();
    }
  });

  const handleSubmit = () => {
    if (newNote.trim()) {
      createNote.mutate({ content: newNote.trim() });
    }
  };

  return (
    <div className="cyber-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 neon-text-amber" />
            <h3 className="font-semibold">Quick Notes</h3>
            {notes && notes.length > 0 && (
              <span className="text-xs bg-[var(--neon-amber)]/15 text-[var(--neon-amber)] px-2 py-0.5 rounded-full data-code">
                {notes.length} saved
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-[var(--neon-amber)] text-xs"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {/* New note input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Quick thought, insight, or observation..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="cyber-input min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newNote.trim() || createNote.isPending}
            className="cyber-button-primary h-auto px-3"
          >
            {createNote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Notes list - always visible when expanded */}
        {isExpanded && (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : notes && notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--neon-amber)]/5 border border-[var(--border-subtle)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80">{note.content}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {new Date(note.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {new Date(note.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNote.mutate({ id: note.id })}
                    className="h-6 w-6 text-muted-foreground hover:text-red-400 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No notes yet. Capture thoughts for your next roundup.
              </p>
            )}
          </div>
        )}
        
        {/* Collapsed preview */}
        {!isExpanded && notes && notes.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Latest: "{notes[0].content.slice(0, 60)}{notes[0].content.length > 60 ? '...' : ''}"
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.stats.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 300000, // 5 min cache
  });
  const { data: comparison } = trpc.stats.comparison.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 300000,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
          <p className="text-muted-foreground">Entering the mirror...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--neon-cyan)] opacity-5 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--neon-magenta)] opacity-5 blur-[100px] rounded-full" />
          
          <div className="text-center space-y-8 max-w-2xl relative z-10">
            <div className="relative inline-block">
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight neon-text-cyan neon-breathe">
                NEON SIGNS
              </h1>
              <div className="absolute -inset-8 bg-[var(--neon-cyan)] opacity-10 blur-3xl rounded-full" />
            </div>
            
            <p className="text-xl sm:text-2xl font-neon-mirror text-[var(--neon-magenta)]" style={{ textShadow: 'var(--text-glow-magenta)' }}>
              The Mirror That Glows
            </p>
            
            <p className="text-lg text-foreground/80 max-w-lg mx-auto leading-relaxed">
              Weekly roundup engine for your creative practice. 
              Pattern archaeology across 7 years of archived entries.
              AI-generated readings that mirror your journey.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="cyber-button-primary px-8 py-6 text-lg"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Enter the Mirror
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
              <div className="cyber-card p-6 rounded-lg">
                <Calendar className="h-8 w-8 mb-3 neon-text-cyan mx-auto" />
                <h3 className="font-semibold mb-2">Weekly Roundups</h3>
                <p className="text-sm text-muted-foreground">11 fields capturing your creative practice every Sunday</p>
              </div>
              <div className="cyber-card p-6 rounded-lg">
                <Archive className="h-8 w-8 mb-3 neon-text-magenta mx-auto" />
                <h3 className="font-semibold mb-2">Pattern Archaeology</h3>
                <p className="text-sm text-muted-foreground">Search 7 years of archived entries for resonance</p>
              </div>
              <div className="cyber-card p-6 rounded-lg">
                <Zap className="h-8 w-8 mb-3 neon-text-amber mx-auto" />
                <h3 className="font-semibold mb-2">Neon's Mirror</h3>
                <p className="text-sm text-muted-foreground">AI-generated readings with precise-poetic insight</p>
              </div>
            </div>
          </div>
        </div>
        
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <div className="tattoo-line w-48 mx-auto mb-4" />
          Designed for the Crucible Year, Bangkok 2025-2026
        </footer>
      </div>
    );
  }

  // Authenticated Dashboard - THIS WEEK focus
  const weekProgress = stats ? (stats.currentWeek / (stats.totalWeeks || 52)) * 100 : 0;
  
  // Comparison deltas
  const thisWeek = comparison?.thisWeek.stats;
  const lastWeek = comparison?.lastWeek.stats;
  const studioDelta = (thisWeek?.totalStudioHours !== undefined && lastWeek?.totalStudioHours !== undefined) 
    ? thisWeek.totalStudioHours - lastWeek.totalStudioHours : null;
  const stepsDelta = (thisWeek?.avgSteps !== undefined && lastWeek?.avgSteps !== undefined)
    ? thisWeek.avgSteps - lastWeek.avgSteps : null;
  
  // Average trials per week for delta
  const avgTrialsPerWeek = stats?.currentWeek && stats.currentWeek > 0 
    ? Math.round(75 / stats.currentWeek * 10) / 10 : 7.5; // fallback to known average

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border-default)] sticky top-0 bg-[var(--void-black)]/95 backdrop-blur z-50">
        <div className="container py-3 sm:py-4 flex items-center justify-between">
          <Link href="/">
            <NeonLogo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="data-code text-xs text-muted-foreground">
              W{stats?.currentWeek ?? 0}/{stats?.totalWeeks || 52}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.name || 'Artist'}
            </span>
          </div>
        </div>
      </header>

      <main className="container py-6 pb-24 space-y-6">
        {/* Progress Bar - Cyan only, no red */}
        <div className="cyber-card rounded-xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-3xl font-bold neon-text-cyan data-code">Week {stats?.currentWeek ?? 0}</span>
                <span className="text-sm text-muted-foreground ml-2">of {stats?.totalWeeks || 52}</span>
              </div>
              {stats?.daysUntilCheckIn === 0 ? (
                <Link href="/roundup">
                  <Button size="sm" className="cyber-button-primary">
                    <Calendar className="mr-1.5 h-4 w-4" />
                    Submit Roundup
                  </Button>
                </Link>
              ) : (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Next check-in</p>
                  <p className="text-lg font-bold neon-text-magenta data-code">{stats?.daysUntilCheckIn || 0}d</p>
                  <p className="text-xs text-muted-foreground">{stats?.checkInDay || 'Sunday'}</p>
                </div>
              )}
            </div>
            <div className="relative h-2 bg-[var(--void-black)] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full bg-[var(--neon-cyan)]"
                style={{ 
                  width: `${weekProgress}%`,
                  boxShadow: '0 0 8px var(--neon-cyan), 0 0 16px rgba(0, 240, 255, 0.3)'
                }}
              />
              {/* Quarter markers */}
              {[25, 50, 75].map(pct => (
                <div key={pct} className="absolute top-0 h-full w-px bg-[var(--border-default)]" style={{ left: `${pct}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">Q1</span>
              <span className="text-[10px] text-muted-foreground">Half</span>
              <span className="text-[10px] text-muted-foreground">Q3</span>
              <span className="text-[10px] text-muted-foreground">Done</span>
            </div>
          </CardContent>
        </div>

        {/* THIS WEEK - Primary focus */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">This Week</h2>
          <div className="grid grid-cols-3 gap-3">
            {/* Studio Hours */}
            <div className="cyber-card rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">Studio</span>
              </div>
              <p className="text-2xl font-bold neon-text-cyan data-code">
                {thisWeek?.totalStudioHours ?? stats?.lastRoundup?.studioHours ?? '—'}h
              </p>
              <DeltaIndicator delta={studioDelta} suffix="h" />
            </div>
            
            {/* Trials */}
            <div className="cyber-card rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <FlaskConical className="h-3.5 w-3.5" />
                <span className="text-xs">Trials</span>
              </div>
              <p className="text-2xl font-bold neon-text-amber data-code">
                {stats?.thisWeekTrials ?? '—'}
              </p>
              <span className="text-xs text-muted-foreground">avg {avgTrialsPerWeek}/wk</span>
            </div>
            
            {/* Steps */}
            <div className="cyber-card rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                <Footprints className="h-3.5 w-3.5" />
                <span className="text-xs">Steps</span>
              </div>
              <p className="text-2xl font-bold neon-text-magenta data-code">
                {thisWeek?.avgSteps ? (thisWeek.avgSteps / 1000).toFixed(0) + 'k' : '—'}
              </p>
              <DeltaIndicator delta={stepsDelta} />
            </div>
          </div>
        </div>

        {/* Status Row: Energy + Jester */}
        <div className="grid grid-cols-2 gap-3">
          <div className="cyber-card rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-xs">Energy</span>
            </div>
            {stats?.lastRoundup ? (
              <EnergyBadge level={stats.lastRoundup.energyLevel} />
            ) : (
              <p className="text-muted-foreground text-sm">No data</p>
            )}
          </div>
          
          <div className="cyber-card rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-xs">Jester</span>
            </div>
            <JesterBadge value={stats?.lastRoundup?.jesterActivity ?? stats?.averageJesterActivity ?? 0} />
          </div>
        </div>

        {/* Somatic State */}
        {stats?.lastRoundup?.somaticState && (
          <div className="cyber-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 neon-text-magenta" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Somatic State</span>
            </div>
            <p className="text-sm text-foreground/80 font-neon-mirror italic leading-relaxed">
              "{stats.lastRoundup.somaticState}"
            </p>
          </div>
        )}

        {/* Step Tracker — Simplified single bars */}
        {stats?.lastRoundup?.dailySteps && (
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Footprints className="h-4 w-4 neon-text-cyan" />
                <h3 className="text-sm font-semibold">Steps — Last Week</h3>
              </div>
              <div className="text-right">
                <span className="data-code text-sm neon-text-cyan">
                  {Object.values(stats.lastRoundup.dailySteps as Record<string, number>).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground ml-1">total</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                const steps = (stats.lastRoundup?.dailySteps as Record<string, number>)?.[day] || 0;
                const maxSteps = Math.max(...Object.values(stats.lastRoundup?.dailySteps as Record<string, number> || {}), 1);
                const barHeight = Math.max((steps / maxSteps) * 100, steps > 0 ? 5 : 0);
                // Single color with intensity based on relative performance
                const opacity = steps > 0 ? 0.3 + (steps / maxSteps) * 0.7 : 0.05;
                return (
                  <div key={day} className="text-center">
                    <div className="h-16 bg-[var(--void-black)] rounded relative overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                        style={{ 
                          height: `${barHeight}%`,
                          backgroundColor: `rgba(0, 240, 255, ${opacity})`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{day.charAt(0).toUpperCase()}</p>
                    <p className="text-[10px] data-code text-muted-foreground">
                      {steps > 0 ? (steps / 1000).toFixed(1) + 'k' : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Notes */}
        <QuickNotesWidget />

        {/* Last Roundup Summary */}
        {stats?.lastRoundup && (
          <div className="cyber-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 neon-text-cyan" />
                <h3 className="text-sm font-semibold">Last Roundup</h3>
                <span className="data-code text-xs text-muted-foreground">
                  W{stats.lastRoundup.weekNumber}
                </span>
              </div>
              <Link href={`/results/${stats.lastRoundup.id}`}>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:neon-text-cyan">
                  View <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Studio</p>
                <p className="data-code font-medium">{stats.lastRoundup.studioHours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jester</p>
                <p className="data-code font-medium">{stats.lastRoundup.jesterActivity}/10</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Energy</p>
                <EnergyBadge level={stats.lastRoundup.energyLevel} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 mt-4">
        <div className="container">
          <p className="text-center text-xs text-muted-foreground">
            NEON SIGNS — Crucible Year Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
