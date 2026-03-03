import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Calendar, Clock, Zap, Activity, TrendingUp, Archive, FileText, ChevronRight, Settings, Footprints, StickyNote, Plus, X, Send, ArrowUpRight, ArrowDownRight, Minus, Flame, Layers, BarChart3, Palette, FlaskConical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

function NeonLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] flex items-center justify-center neon-glow-cyan">
          <span className="text-xl font-bold text-black">N</span>
        </div>
        <div className="absolute inset-0 bg-[var(--neon-cyan)] opacity-30 blur-xl rounded-lg" />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight neon-text-cyan">NEON SIGNS</h1>
        <p className="text-xs text-muted-foreground">The Mirror That Glows</p>
      </div>
    </div>
  );
}

function JesterSparkline({ data }: { data: { weekNumber: number; jesterActivity: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-12 flex items-center text-muted-foreground text-sm">
        <span className="neon-text-purple opacity-50">No data yet</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <RechartsTooltip
          contentStyle={{
            background: '#050508',
            border: '1px solid var(--neon-magenta)',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(255, 20, 147, 0.3)',
          }}
          formatter={(value: number) => [`${value}/10`, 'Jester']}
          labelFormatter={(label: number) => `Week ${label}`}
        />
        <Line
          type="monotone"
          dataKey="jesterActivity"
          stroke="var(--neon-magenta)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--neon-magenta)', stroke: 'var(--neon-cyan)', strokeWidth: 2 }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(255, 20, 147, 0.6))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EnergyBadge({ level }: { level: string }) {
  const config = {
    hot: { emoji: '🔥', label: 'Hot', className: 'neon-text-amber' },
    sustainable: { emoji: '⚡', label: 'Sustainable', className: 'neon-text-cyan' },
    depleted: { emoji: '🌙', label: 'Depleted', className: 'neon-text-purple' },
  };
  const { emoji, label, className } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{emoji}</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

// Decorative geometric element
function GeoDecoration({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 opacity-30 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2 L22 17 L2 17 Z" />
    </svg>
  );
}

// Quick Notes Widget for capturing thoughts throughout the week
function QuickNotesWidget() {
  const [newNote, setNewNote] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
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
      <div className="p-4 border-b border-[var(--neon-amber)]/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 neon-text-amber" />
            <h3 className="font-semibold neon-text-amber">Quick Notes</h3>
            {notes && notes.length > 0 && (
              <span className="text-xs bg-[var(--neon-amber)]/20 text-[var(--neon-amber)] px-2 py-0.5 rounded-full">
                {notes.length}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground hover:text-[var(--neon-amber)]"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Capture thoughts throughout the week for your next roundup
        </p>
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
        
        {/* Notes list */}
        {isExpanded && (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : notes && notes.length > 0 ? (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-2 p-2 rounded-lg bg-[var(--neon-amber)]/5 border border-[var(--neon-amber)]/10"
                >
                  <p className="flex-1 text-sm text-foreground/80">{note.content}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNote.mutate({ id: note.id })}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                No notes yet. Start capturing your thoughts!
              </p>
            )}
          </div>
        )}
        
        {/* Collapsed preview */}
        {!isExpanded && notes && notes.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Latest: "{notes[0].content.slice(0, 50)}{notes[0].content.length > 50 ? '...' : ''}"
          </div>
        )}
      </div>
    </div>
  );
}

// Week Comparison Widget - This week vs last week
function ComparisonWidget() {
  const { data: comparison, isLoading } = trpc.stats.comparison.useQuery();
  
  if (isLoading) {
    return (
      <div className="cyber-card rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  
  if (!comparison?.thisWeek.stats && !comparison?.lastWeek.stats) {
    return null; // Don't show if no data
  }
  
  const thisWeek = comparison?.thisWeek.stats;
  const lastWeek = comparison?.lastWeek.stats;
  
  // Calculate deltas
  const getDelta = (current: number | undefined, previous: number | undefined) => {
    if (current === undefined || previous === undefined) return null;
    return current - previous;
  };
  
  const studioHoursDelta = getDelta(thisWeek?.totalStudioHours, lastWeek?.totalStudioHours);
  const jesterDelta = getDelta(thisWeek?.avgJester, lastWeek?.avgJester);
  const stepsDelta = getDelta(thisWeek?.avgSteps, lastWeek?.avgSteps);
  
  const DeltaIndicator = ({ delta, inverted = false }: { delta: number | null; inverted?: boolean }) => {
    if (delta === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    const isPositive = inverted ? delta < 0 : delta > 0;
    const isNegative = inverted ? delta > 0 : delta < 0;
    
    if (delta === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (isPositive) return <ArrowUpRight className="h-4 w-4 text-[var(--neon-cyan)]" />;
    if (isNegative) return <ArrowDownRight className="h-4 w-4 text-[var(--neon-magenta)]" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  
  const formatDelta = (delta: number | null, suffix: string = '') => {
    if (delta === null) return '-';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta}${suffix}`;
  };
  
  return (
    <div className="cyber-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--neon-purple)]/20">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 neon-text-purple" />
          <h3 className="font-semibold neon-text-purple">Week Comparison</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Week {comparison?.thisWeek.weekNumber} vs Week {comparison?.lastWeek.weekNumber}
        </p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* This Week Column */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">This Week</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Studio</span>
                <span className="font-medium neon-text-cyan">{thisWeek?.totalStudioHours ?? '-'}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jester</span>
                <span className="font-medium neon-text-magenta">{thisWeek?.avgJester ?? '-'}/10</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Steps</span>
                <span className="font-medium neon-text-amber">{thisWeek?.avgSteps ? (thisWeek.avgSteps / 1000).toFixed(1) + 'k' : '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entries</span>
                <span className="font-medium">{thisWeek?.entryCount ?? 0}</span>
              </div>
            </div>
          </div>
          
          {/* Last Week Column */}
          <div className="border-l border-[var(--neon-purple)]/20 pl-4">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Last Week</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Studio</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{lastWeek?.totalStudioHours ?? '-'}h</span>
                  <DeltaIndicator delta={studioHoursDelta} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jester</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{lastWeek?.avgJester ?? '-'}/10</span>
                  <DeltaIndicator delta={jesterDelta} inverted />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Steps</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{lastWeek?.avgSteps ? (lastWeek.avgSteps / 1000).toFixed(1) + 'k' : '-'}</span>
                  <DeltaIndicator delta={stepsDelta} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entries</span>
                <span className="font-medium">{lastWeek?.entryCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Delta Summary */}
        {(studioHoursDelta !== null || jesterDelta !== null || stepsDelta !== null) && (
          <div className="mt-4 pt-4 border-t border-[var(--neon-purple)]/20">
            <p className="text-xs text-muted-foreground mb-2">Changes from last week:</p>
            <div className="flex flex-wrap gap-3">
              {studioHoursDelta !== null && studioHoursDelta !== 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${studioHoursDelta > 0 ? 'bg-[var(--neon-cyan)]/20 neon-text-cyan' : 'bg-[var(--neon-magenta)]/20 neon-text-magenta'}`}>
                  {formatDelta(studioHoursDelta, 'h')} studio
                </span>
              )}
              {jesterDelta !== null && jesterDelta !== 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${jesterDelta < 0 ? 'bg-[var(--neon-cyan)]/20 neon-text-cyan' : 'bg-[var(--neon-magenta)]/20 neon-text-magenta'}`}>
                  {formatDelta(jesterDelta)} jester
                </span>
              )}
              {stepsDelta !== null && Math.abs(stepsDelta) >= 100 && (
                <span className={`text-xs px-2 py-1 rounded-full ${stepsDelta > 0 ? 'bg-[var(--neon-cyan)]/20 neon-text-cyan' : 'bg-[var(--neon-magenta)]/20 neon-text-magenta'}`}>
                  {formatDelta(Math.round(stepsDelta / 1000), 'k')} steps
                </span>
              )}
            </div>
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
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
            <div className="absolute inset-0 blur-xl bg-[var(--neon-cyan)] opacity-30" />
          </div>
          <p className="text-muted-foreground neon-text-purple">Entering the mirror...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
          {/* Background glow effects */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--neon-cyan)] opacity-5 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--neon-magenta)] opacity-5 blur-[100px] rounded-full" />
          
          <div className="text-center space-y-8 max-w-2xl relative z-10">
            {/* Neon Sign Effect */}
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
            
            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
              <div className="cyber-card p-6 rounded-lg geo-corner-tl geo-corner-br">
                <Calendar className="h-8 w-8 mb-3 neon-text-cyan mx-auto" />
                <h3 className="font-semibold mb-2 neon-text-white">Weekly Roundups</h3>
                <p className="text-sm text-muted-foreground">11 fields capturing your creative practice every Sunday</p>
              </div>
              <div className="cyber-card p-6 rounded-lg geo-corner-tl geo-corner-br">
                <Archive className="h-8 w-8 mb-3 neon-text-magenta mx-auto" />
                <h3 className="font-semibold mb-2 neon-text-white">Pattern Archaeology</h3>
                <p className="text-sm text-muted-foreground">Search 7 years of archived entries for resonance</p>
              </div>
              <div className="cyber-card p-6 rounded-lg geo-corner-tl geo-corner-br">
                <Zap className="h-8 w-8 mb-3 neon-text-amber mx-auto" />
                <h3 className="font-semibold mb-2 neon-text-white">Neon's Mirror</h3>
                <p className="text-sm text-muted-foreground">AI-generated readings with precise-poetic insight</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <div className="tattoo-line w-48 mx-auto mb-4" />
          Designed for the Crucible Year, Bangkok 2025-2026
        </footer>
      </div>
    );
  }

  // Authenticated Dashboard
  const weekProgress = stats ? (stats.currentWeek / (stats.totalWeeks || 52)) * 100 : 0;
  const jesterTrendData = stats?.jesterTrend?.map(t => ({
    weekNumber: t.weekNumber,
    jesterActivity: t.jesterActivity
  })) || [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--neon-magenta)]/20 sticky top-0 bg-[var(--void-black)]/95 backdrop-blur z-50">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--neon-magenta)] to-transparent opacity-50" />
        <div className="container py-3 sm:py-4 flex items-center justify-between">
          <Link href="/">
            <NeonLogo />
          </Link>
          <TooltipProvider delayDuration={300}>
            <nav className="flex items-center gap-1.5 sm:gap-2">
              {/* History */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/history">
                    <button className="nav-icon-btn group" aria-label="History">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--neon-cyan)] group-hover:drop-shadow-[0_0_8px_var(--neon-cyan)]" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black border-[var(--neon-cyan)]/50">
                  <p className="text-xs">History</p>
                </TooltipContent>
              </Tooltip>

              {/* Materials */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/materials">
                    <button className="nav-icon-btn group" aria-label="Materials">
                      <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--neon-amber)] group-hover:drop-shadow-[0_0_8px_var(--neon-amber)]" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black border-[var(--neon-amber)]/50">
                  <p className="text-xs">Materials</p>
                </TooltipContent>
              </Tooltip>

              {/* Crucible Intake */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/crucible/intake">
                    <button className="nav-icon-btn group" aria-label="Crucible Intake">
                      <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--neon-magenta)] group-hover:drop-shadow-[0_0_8px_var(--neon-magenta)]" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black border-[var(--neon-magenta)]/50">
                  <p className="text-xs">Crucible Intake</p>
                </TooltipContent>
              </Tooltip>

              {/* Works Browser */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/crucible/works">
                    <button className="nav-icon-btn group" aria-label="Works">
                      <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--neon-cyan)] group-hover:drop-shadow-[0_0_8px_var(--neon-cyan)]" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black border-[var(--neon-cyan)]/50">
                  <p className="text-xs">Works</p>
                </TooltipContent>
              </Tooltip>

              {/* Analytics */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/analytics">
                    <button className="nav-icon-btn group" aria-label="Command Center">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--neon-purple)] group-hover:drop-shadow-[0_0_8px_var(--neon-purple)]" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black border-[var(--neon-purple)]/50">
                  <p className="text-xs">Command Center</p>
                </TooltipContent>
              </Tooltip>

              {/* Settings */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/settings">
                    <button className="nav-icon-btn group" aria-label="Settings">
                      <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-[var(--neon-cyan)] group-hover:drop-shadow-[0_0_8px_var(--neon-cyan)]" />
                    </button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-black border-[var(--neon-cyan)]/50">
                  <p className="text-xs">Settings</p>
                </TooltipContent>
              </Tooltip>

              {/* User name - hidden on mobile */}
              <span className="hidden sm:block text-xs text-muted-foreground pl-2 border-l border-gray-700 ml-1">
                {user?.name || 'Artist'}
              </span>
            </nav>
          </TooltipProvider>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Status Widget */}
        <div className="cyber-card rounded-xl overflow-hidden">
          <CardContent className="relative p-6 sm:p-8">
            {/* Decorative elements */}
            <GeoDecoration className="absolute top-4 right-4 text-[var(--neon-cyan)]" />
            <GeoDecoration className="absolute bottom-4 left-4 text-[var(--neon-magenta)]" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {stats?.crucibleYear && stats.crucibleYear > 1 
                      ? `Crucible Year ${stats.crucibleYear}` 
                      : 'Crucible Year Progress'}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold neon-text-cyan">
                      Week {stats?.currentWeek ?? 0}
                    </span>
                    <span className="text-xl text-muted-foreground">of {stats?.totalWeeks || 52}</span>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={weekProgress} className="h-2 bg-[var(--void-black)]" />
                  <div 
                    className="absolute top-0 left-0 h-2 rounded-full neon-progress-gradient"
                    style={{ width: `${weekProgress}%`, boxShadow: 'var(--glow-dual)' }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats?.totalRoundups || 0} roundups submitted
                  {stats?.entriesThisWeek !== undefined && stats.entriesThisWeek > 0 && (
                    <span className="ml-2 neon-text-cyan">• {stats.entriesThisWeek}/7 this week</span>
                  )}
                </p>
              </div>
              
              <div className="flex flex-col items-center sm:items-end gap-2">
                {stats?.daysUntilCheckIn === 0 ? (
                  <Link href="/roundup">
                    <Button size="lg" className="cyber-button-primary px-6 py-5">
                      <Calendar className="mr-2 h-5 w-5" />
                      Submit This Week's Roundup
                    </Button>
                  </Link>
                ) : (
                  <div className="text-center sm:text-right p-4 rounded-lg bg-[var(--void-black)]/50 border border-[var(--neon-magenta)]/20">
                    <p className="text-sm text-muted-foreground">Next check-in in</p>
                    <p className="text-3xl font-bold neon-text-magenta">
                      {stats?.daysUntilCheckIn || 0} days
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({stats?.checkInDay || 'Sunday'})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="cyber-stat-card rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Studio Hours</span>
            </div>
            <p className="text-3xl font-bold neon-text-cyan">{stats?.totalStudioHours || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">total accumulated</p>
          </div>

          <div className="cyber-stat-card rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Avg Jester</span>
            </div>
            <p className="text-3xl font-bold neon-text-magenta">{stats?.averageJesterActivity || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">out of 10</p>
          </div>

          <div className="cyber-stat-card rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Energy Trend</span>
            </div>
            {stats?.lastRoundup ? (
              <EnergyBadge level={stats.lastRoundup.energyLevel} />
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">last week</p>
          </div>

          <div className="cyber-stat-card rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Archive className="h-4 w-4" />
              <span className="text-sm font-medium">Archive</span>
            </div>
            <p className="text-3xl font-bold neon-text-amber">{stats?.archiveEntryCount || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">entries searchable</p>
          </div>
        </div>

        {/* Step Counter Stats */}
        {stats?.lastRoundup?.dailySteps && (
          <div className="cyber-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Footprints className="h-5 w-5 neon-text-cyan" />
              <h3 className="text-lg font-semibold">Step Tracker — Last Week</h3>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                const steps = (stats.lastRoundup?.dailySteps as Record<string, number>)?.[day] || 0;
                const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
                const barHeight = Math.min((steps / 15000) * 100, 100);
                return (
                  <div key={day} className="text-center">
                    <div className="h-20 bg-[var(--void-black)] rounded-lg relative overflow-hidden mb-1">
                      <div 
                        className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${
                          steps >= 8000 ? 'bg-[var(--neon-cyan)]' : 
                          steps >= 5000 ? 'bg-[var(--neon-amber)]' : 
                          steps > 0 ? 'bg-[var(--neon-magenta)]' : 'bg-muted/20'
                        }`}
                        style={{ 
                          height: `${barHeight}%`,
                          boxShadow: steps >= 8000 ? '0 0 10px var(--neon-cyan)' : 
                                     steps >= 5000 ? '0 0 10px var(--neon-amber)' : 
                                     steps > 0 ? '0 0 10px var(--neon-magenta)' : 'none'
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{dayLabel}</p>
                    <p className={`text-xs font-medium ${
                      steps >= 8000 ? 'neon-text-cyan' : 
                      steps >= 5000 ? 'neon-text-amber' : 
                      steps > 0 ? 'neon-text-magenta' : 'text-muted-foreground'
                    }`}>
                      {steps > 0 ? (steps / 1000).toFixed(1) + 'k' : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-[var(--neon-cyan)]/20">
              <div>
                <p className="text-xs text-muted-foreground">Weekly Total</p>
                <p className="text-xl font-bold neon-text-cyan">
                  {Object.values(stats.lastRoundup.dailySteps as Record<string, number>).reduce((a, b) => a + b, 0).toLocaleString()} steps
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Daily Average</p>
                {(() => {
                  const values = Object.values(stats.lastRoundup?.dailySteps as Record<string, number> || {});
                  const daysWithSteps = values.filter(v => v > 0).length;
                  const total = values.reduce((a, b) => a + b, 0);
                  const avg = daysWithSteps > 0 ? Math.round(total / daysWithSteps) : 0;
                  return (
                    <p className={`text-xl font-bold ${
                      avg >= 8000 ? 'neon-text-cyan' : 
                      avg >= 5000 ? 'neon-text-amber' : 
                      'neon-text-magenta'
                    }`}>
                      {avg.toLocaleString()} steps/day
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Jester Trend & Last Roundup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="cyber-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 neon-text-magenta" />
              <h3 className="text-lg font-semibold">Jester Activity Trend</h3>
            </div>
            <JesterSparkline data={jesterTrendData} />
            <div className="tattoo-line mt-4" />
            <p className="text-xs text-muted-foreground mt-3">
              0 = fully present, 10 = fully performing
            </p>
          </div>

          <div className="cyber-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 neon-text-cyan" />
              <h3 className="text-lg font-semibold">Last Roundup</h3>
            </div>
            {stats?.lastRoundup ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[var(--neon-purple)]/10">
                  <span className="text-muted-foreground">Week</span>
                  <span className="font-medium neon-text-cyan">
                    {stats.lastRoundup.weekNumber}, {stats.lastRoundup.year}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--neon-purple)]/10">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {new Date(stats.lastRoundup.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[var(--neon-purple)]/10">
                  <span className="text-muted-foreground">Jester</span>
                  <span className="font-medium neon-text-magenta">{stats.lastRoundup.jesterActivity}/10</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Energy</span>
                  <EnergyBadge level={stats.lastRoundup.energyLevel} />
                </div>
                <Link href={`/results/${stats.lastRoundup.id}`}>
                  <Button className="cyber-button-secondary w-full mt-4">
                    View Full Results
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="neon-text-purple">No roundups yet</p>
                <p className="text-sm mt-2">Submit your first one this Sunday</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Notes Widget */}
        <QuickNotesWidget />

        {/* Week Comparison Widget */}
        <ComparisonWidget />

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/roundup">
            <div className="cyber-card rounded-xl p-6 cursor-pointer group hover:border-[var(--neon-cyan)] transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[var(--neon-cyan)]/10 flex items-center justify-center group-hover:neon-glow-cyan transition-shadow">
                  <Calendar className="h-7 w-7 neon-text-cyan" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:neon-text-cyan transition-all">Weekly Roundup Form</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats?.daysUntilCheckIn === 0 
                      ? "Ready to submit today!" 
                      : `Available in ${stats?.daysUntilCheckIn || 0} days`}
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-[var(--neon-cyan)] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href="/history">
            <div className="cyber-card rounded-xl p-6 cursor-pointer group hover:border-[var(--neon-magenta)] transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[var(--neon-magenta)]/10 flex items-center justify-center group-hover:neon-glow-magenta transition-shadow">
                  <FileText className="h-7 w-7 neon-text-magenta" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:neon-text-magenta transition-all">History & Trends</h3>
                  <p className="text-sm text-muted-foreground">
                    View all {stats?.totalRoundups || 0} roundups and charts
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-[var(--neon-magenta)] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href="/crucible/intake">
            <div className="cyber-card rounded-xl p-6 cursor-pointer group hover:border-[var(--neon-amber)] transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[var(--neon-amber)]/10 flex items-center justify-center group-hover:neon-glow-amber transition-shadow">
                  <Flame className="h-7 w-7 neon-text-amber" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:neon-text-amber transition-all">Crucible Intake</h3>
                  <p className="text-sm text-muted-foreground">
                    Log a material trial — 60 second capture
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-[var(--neon-amber)] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link href="/analytics">
            <div className="cyber-card rounded-xl p-6 cursor-pointer group hover:border-[var(--neon-purple)] transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[var(--neon-purple)]/10 flex items-center justify-center group-hover:neon-glow-purple transition-shadow">
                  <BarChart3 className="h-7 w-7 neon-text-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg group-hover:neon-text-purple transition-all">Command Center</h3>
                  <p className="text-sm text-muted-foreground">
                    Unified analytics — studio, trials & materials
                  </p>
                </div>
                <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-[var(--neon-purple)] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-8">
        <div className="container">
          <div className="tattoo-line mb-4" />
          <p className="text-center text-sm text-muted-foreground">
            NEON SIGNS — Crucible Year Engine
          </p>
        </div>
      </footer>
    </div>
  );
}
