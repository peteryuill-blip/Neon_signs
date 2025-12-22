import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Download, Calendar, TrendingUp, BarChart3, Activity, Pencil } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

function EnergyBadge({ level }: { level: string }) {
  const config = {
    hot: { emoji: '🔥', label: 'Hot', className: 'neon-text-amber bg-[var(--neon-amber)]/10' },
    sustainable: { emoji: '⚡', label: 'Sustainable', className: 'neon-text-cyan bg-[var(--neon-cyan)]/10' },
    depleted: { emoji: '🌙', label: 'Depleted', className: 'neon-text-purple bg-[var(--neon-purple)]/10' },
  };
  const { emoji, label, className } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${className}`}>
      <span className="text-xs">{emoji}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'var(--void-black)',
    border: '1px solid var(--neon-cyan)',
    borderRadius: '8px',
    color: 'var(--foreground)',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
  },
};

export default function History() {
  const { loading: authLoading, isAuthenticated } = useAuth();

  const { data: roundupsData, isLoading: roundupsLoading } = trpc.roundup.getAll.useQuery(
    { limit: 52, offset: 0 },
    { enabled: isAuthenticated }
  );

  const { data: trends, isLoading: trendsLoading } = trpc.stats.trends.useQuery(
    { limit: 52 },
    { enabled: isAuthenticated }
  );

  const { data: stats } = trpc.stats.dashboard.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const exportCsv = trpc.export.csv.useQuery(undefined, {
    enabled: false,
  });

  const handleExport = async () => {
    try {
      const result = await exportCsv.refetch();
      if (result.data) {
        const blob = new Blob([result.data.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Export downloaded successfully');
      }
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (authLoading || roundupsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
            <div className="absolute inset-0 blur-xl bg-[var(--neon-cyan)] opacity-30" />
          </div>
          <p className="text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 neon-text-white">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to view history.</p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="cyber-button-primary">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const roundups = roundupsData?.roundups || [];
  const jesterData = trends?.jesterTrend || [];
  const studioData = trends?.studioHoursTrend || [];
  const energyData = trends?.energyTrend || [];

  // Create 52-week timeline data
  const currentWeek = stats?.currentWeek || 0;
  const timelineData = Array.from({ length: 52 }, (_, i) => {
    const weekNum = i;
    const roundup = roundups.find(r => r.weekNumber === weekNum);
    return {
      week: weekNum,
      submitted: !!roundup,
      isCurrent: weekNum === currentWeek,
    };
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--neon-cyan)]/20 sticky top-0 bg-[var(--void-black)]/95 backdrop-blur z-50">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent opacity-50" />
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold neon-text-white">History & Trends</h1>
              <p className="text-sm text-muted-foreground">
                {roundups.length} roundups submitted
              </p>
            </div>
          </div>
          <Button 
            onClick={handleExport} 
            disabled={roundups.length === 0}
            className="cyber-button-secondary"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* 52-Week Timeline */}
        <div className="cyber-card rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 neon-text-cyan" />
              <h2 className="text-lg font-semibold neon-text-white">52-Week Timeline</h2>
            </div>
            <div className="flex flex-wrap gap-1">
              {timelineData.map((week) => (
                <div
                  key={week.week}
                  className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-medium transition-all cursor-default
                    ${week.isCurrent 
                      ? 'ring-2 ring-[var(--neon-cyan)] ring-offset-2 ring-offset-[var(--void-black)] shadow-[0_0_10px_var(--neon-cyan)]' 
                      : ''}
                    ${week.submitted 
                      ? 'bg-[var(--neon-cyan)] text-[var(--void-black)] shadow-[0_0_8px_var(--neon-cyan)]' 
                      : 'bg-[var(--deep-space)] text-muted-foreground border border-[var(--neon-cyan)]/20'}
                  `}
                  title={`Week ${week.week}${week.isCurrent ? ' (current)' : ''}${week.submitted ? ' - submitted' : ''}`}
                >
                  {week.week}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 mt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
                <span>Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-[var(--deep-space)] border border-[var(--neon-cyan)]/20" />
                <span>Not submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm ring-2 ring-[var(--neon-cyan)] ring-offset-1 ring-offset-[var(--void-black)]" />
                <span>Current week</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <Tabs defaultValue="jester" className="space-y-4">
          <TabsList className="bg-[var(--deep-space)] border border-[var(--neon-cyan)]/20">
            <TabsTrigger value="jester" className="data-[state=active]:bg-[var(--neon-magenta)]/20 data-[state=active]:text-[var(--neon-magenta)]">
              <Activity className="h-4 w-4 mr-2" />
              Jester Activity
            </TabsTrigger>
            <TabsTrigger value="studio" className="data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]">
              <BarChart3 className="h-4 w-4 mr-2" />
              Studio Hours
            </TabsTrigger>
            <TabsTrigger value="energy" className="data-[state=active]:bg-[var(--neon-amber)]/20 data-[state=active]:text-[var(--neon-amber)]">
              <TrendingUp className="h-4 w-4 mr-2" />
              Energy Levels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jester">
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold neon-text-magenta mb-1">Jester Activity Trend</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  0 = fully present, 10 = fully performing
                </p>
                {jesterData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Submit your first roundup to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={jesterData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
                      <XAxis 
                        dataKey="weekNumber" 
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                      />
                      <Tooltip {...chartTooltipStyle} />
                      <ReferenceLine y={5} stroke="rgba(255, 255, 255, 0.2)" strokeDasharray="5 5" />
                      <Line
                        type="monotone"
                        dataKey="jesterActivity"
                        stroke="var(--neon-magenta)"
                        strokeWidth={3}
                        dot={{ fill: 'var(--neon-magenta)', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 8, fill: 'var(--neon-magenta)', filter: 'drop-shadow(0 0 8px var(--neon-magenta))' }}
                        style={{ filter: 'drop-shadow(0 0 4px var(--neon-magenta))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="studio">
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold neon-text-cyan mb-1">Studio Hours per Week</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Total: {stats?.totalStudioHours || 0} hours
                </p>
                {studioData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Submit your first roundup to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={studioData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
                      <XAxis 
                        dataKey="weekNumber" 
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                      />
                      <Tooltip {...chartTooltipStyle} />
                      <Bar 
                        dataKey="studioHours" 
                        fill="var(--neon-cyan)" 
                        radius={[4, 4, 0, 0]}
                        style={{ filter: 'drop-shadow(0 0 4px var(--neon-cyan))' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="energy">
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold neon-text-amber mb-6">Energy Level Distribution</h3>
                {energyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Submit your first roundup to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={energyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
                      <XAxis 
                        dataKey="weekNumber" 
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                      />
                      <YAxis 
                        stroke="rgba(255, 255, 255, 0.3)"
                        tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                        domain={[0, 3]}
                        ticks={[1, 2, 3]}
                        tickFormatter={(value) => {
                          const labels = { 1: 'Depleted', 2: 'Sustainable', 3: 'Hot' };
                          return labels[value as keyof typeof labels] || '';
                        }}
                      />
                      <Tooltip 
                        {...chartTooltipStyle}
                        formatter={(value: string) => {
                          const labels = { hot: '🔥 Hot', sustainable: '⚡ Sustainable', depleted: '🌙 Depleted' };
                          return [labels[value as keyof typeof labels] || value, 'Energy'];
                        }}
                      />
                      <Bar dataKey="energyLevel" radius={[4, 4, 0, 0]}>
                        {energyData.map((entry, index) => {
                          const colors = {
                            hot: 'var(--neon-amber)',
                            sustainable: 'var(--neon-cyan)',
                            depleted: 'var(--neon-purple)',
                          };
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colors[entry.energyLevel as keyof typeof colors] || colors.sustainable}
                              style={{ filter: `drop-shadow(0 0 4px ${colors[entry.energyLevel as keyof typeof colors] || colors.sustainable})` }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Week-by-Week Table */}
        <div className="cyber-card rounded-xl overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold neon-text-white mb-6">All Roundups</h3>
            {roundups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No roundups submitted yet.</p>
                <Link href="/roundup">
                  <Button className="cyber-button-primary mt-4">
                    Submit Your First Roundup
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--neon-cyan)]/20">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Week</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Weather Summary</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Hours</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Jester</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Energy</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Phase-DNA</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundups.map((roundup) => (
                      <tr 
                        key={roundup.id} 
                        className="border-b border-[var(--neon-cyan)]/10 hover:bg-[var(--neon-cyan)]/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium neon-text-cyan">W{roundup.weekNumber}</span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <span className="text-foreground/80 truncate block">
                            {roundup.weatherReport.substring(0, 60)}
                            {roundup.weatherReport.length > 60 ? '...' : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="neon-text-cyan">{roundup.studioHours}h</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="neon-text-magenta">{roundup.jesterActivity}/10</span>
                        </td>
                        <td className="py-3 px-4">
                          <EnergyBadge level={roundup.energyLevel} />
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs neon-text-purple">{roundup.phaseDnaAssigned || '-'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/results/${roundup.id}`}>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                                View
                              </Button>
                            </Link>
                            <Link href={`/edit/${roundup.id}`}>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10">
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-8">
        <div className="container">
          <div className="tattoo-line" />
        </div>
      </footer>
    </div>
  );
}
