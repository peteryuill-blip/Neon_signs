import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Calendar, Clock, Zap, Activity, TrendingUp, Archive, FileText, ChevronRight, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

function NeonLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] flex items-center justify-center neon-glow-cyan">
          <span className="text-xl font-bold text-background">N</span>
        </div>
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
    return <div className="h-12 flex items-center text-muted-foreground text-sm">No data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <Tooltip
          contentStyle={{
            background: 'oklch(0.15 0.02 280)',
            border: '1px solid oklch(0.28 0.03 280)',
            borderRadius: '8px',
            color: 'oklch(0.95 0.01 280)',
          }}
          formatter={(value: number) => [`${value}/10`, 'Jester']}
          labelFormatter={(label) => `Week ${label}`}
        />
        <Line
          type="monotone"
          dataKey="jesterActivity"
          stroke="var(--neon-magenta)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--neon-magenta)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EnergyBadge({ level }: { level: string }) {
  const config = {
    hot: { emoji: '🔥', label: 'Hot', color: 'text-orange-400' },
    sustainable: { emoji: '⚙️', label: 'Sustainable', color: 'text-green-400' },
    depleted: { emoji: '🪫', label: 'Depleted', color: 'text-red-400' },
  };
  const { emoji, label, color } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.stats.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading) {
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
      <div className="min-h-screen flex flex-col bg-background">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="text-center space-y-8 max-w-2xl">
            {/* Neon Sign Effect */}
            <div className="relative inline-block">
              <h1 className="text-5xl sm:text-7xl font-bold tracking-tight neon-text-cyan">
                NEON SIGNS
              </h1>
              <div className="absolute -inset-4 bg-[var(--neon-cyan)] opacity-10 blur-3xl rounded-full" />
            </div>
            
            <p className="text-xl sm:text-2xl font-neon-mirror italic text-muted-foreground">
              The Mirror That Glows
            </p>
            
            <p className="text-lg text-foreground/80 max-w-lg mx-auto">
              Weekly roundup engine for your creative practice. 
              Pattern archaeology across 7 years of archived entries.
              AI-generated readings that mirror your journey.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="neon-glow-cyan bg-primary hover:bg-primary/90"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Enter the Mirror
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <Calendar className="h-8 w-8 mb-3 neon-text-cyan mx-auto" />
                <h3 className="font-semibold mb-1">Weekly Roundups</h3>
                <p className="text-sm text-muted-foreground">11 fields capturing your creative practice every Sunday</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <Archive className="h-8 w-8 mb-3 neon-text-magenta mx-auto" />
                <h3 className="font-semibold mb-1">Pattern Archaeology</h3>
                <p className="text-sm text-muted-foreground">Search 7 years of archived entries for resonance</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                <Zap className="h-8 w-8 mb-3 neon-text-blue mx-auto" />
                <h3 className="font-semibold mb-1">Neon's Mirror</h3>
                <p className="text-sm text-muted-foreground">AI-generated readings with precise-poetic insight</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/50">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container py-4 flex items-center justify-between">
          <NeonLogo />
          <nav className="flex items-center gap-4">
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <FileText className="h-4 w-4 mr-2" />
                History
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {user?.name || 'Artist'}
            </span>
          </nav>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Status Widget */}
        <Card className="border-border/50 bg-card/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/5 to-[var(--neon-magenta)]/5" />
          <CardContent className="relative p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {stats?.crucibleYear && stats.crucibleYear > 1 
                      ? `Crucible Year ${stats.crucibleYear}` 
                      : 'Crucible Year Progress'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold neon-text-cyan">
                      Week {stats?.currentWeek ?? 0}
                    </span>
                    <span className="text-muted-foreground">of {stats?.totalWeeks || 52}</span>
                  </div>
                </div>
                <Progress value={weekProgress} className="h-2 bg-secondary" />
                <p className="text-sm text-muted-foreground">
                  {stats?.totalRoundups || 0} roundups submitted
                </p>
              </div>
              
              <div className="flex flex-col items-center sm:items-end gap-2">
                {stats?.daysUntilCheckIn === 0 ? (
                  <Link href="/roundup">
                    <Button size="lg" className="neon-glow-cyan bg-primary hover:bg-primary/90 w-full sm:w-auto">
                      <Calendar className="mr-2 h-5 w-5" />
                      Submit This Week's Roundup
                    </Button>
                  </Link>
                ) : (
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-muted-foreground">Next check-in in</p>
                    <p className="text-2xl font-bold neon-text-magenta">
                      {stats?.daysUntilCheckIn || 0} days
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({stats?.checkInDay || 'Sunday'})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Studio Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.totalStudioHours || 0}</p>
              <p className="text-xs text-muted-foreground">total accumulated</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Avg Jester
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.averageJesterActivity || 0}</p>
              <p className="text-xs text-muted-foreground">out of 10</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Energy Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.lastRoundup ? (
                <EnergyBadge level={stats.lastRoundup.energyLevel} />
              ) : (
                <p className="text-muted-foreground">No data</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">last week</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Archive className="h-4 w-4" />
                Archive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.archiveEntryCount || 0}</p>
              <p className="text-xs text-muted-foreground">entries searchable</p>
            </CardContent>
          </Card>
        </div>

        {/* Jester Trend & Last Roundup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 neon-text-magenta" />
                Jester Activity Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JesterSparkline data={jesterTrendData} />
              <p className="text-xs text-muted-foreground mt-2">
                0 = fully present, 10 = fully performing
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 neon-text-cyan" />
                Last Roundup
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.lastRoundup ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Week</span>
                    <span className="font-medium">
                      {stats.lastRoundup.weekNumber}, {stats.lastRoundup.year}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {new Date(stats.lastRoundup.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Jester</span>
                    <span className="font-medium">{stats.lastRoundup.jesterActivity}/10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Energy</span>
                    <EnergyBadge level={stats.lastRoundup.energyLevel} />
                  </div>
                  <Link href={`/results/${stats.lastRoundup.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      View Full Results
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No roundups yet</p>
                  <p className="text-sm mt-1">Submit your first one this Sunday</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/roundup">
            <Card className="border-border/50 bg-card/50 hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:neon-glow-cyan transition-shadow">
                  <Calendar className="h-6 w-6 neon-text-cyan" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Weekly Roundup Form</h3>
                  <p className="text-sm text-muted-foreground">
                    {stats?.daysUntilCheckIn === 0 
                      ? "Ready to submit today!" 
                      : `Available in ${stats?.daysUntilCheckIn || 0} days`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="border-border/50 bg-card/50 hover:border-accent/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:neon-glow-magenta transition-shadow">
                  <FileText className="h-6 w-6 neon-text-magenta" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">History & Trends</h3>
                  <p className="text-sm text-muted-foreground">
                    View all {stats?.totalRoundups || 0} roundups and charts
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>NEON SIGNS — The Mirror That Glows</p>
          <p className="mt-1">Crucible Year, Bangkok {stats?.currentYear || 2025}</p>
        </div>
      </footer>
    </div>
  );
}
