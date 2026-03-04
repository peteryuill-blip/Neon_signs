import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, Flame, Layers, Droplets, Trash2, Lightbulb,
  TrendingUp, BarChart3, Star, Clock, Ruler, Activity, Zap,
  Footprints, Calendar, FileText, ChevronRight, Loader2
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import { getLoginUrl } from '@/const';

const chartTooltipStyle = {
  contentStyle: {
    background: '#050508',
    border: '1px solid var(--neon-cyan)',
    borderRadius: '8px',
    color: '#fff',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)',
    fontSize: '12px',
  },
};

function StatCard({ icon: Icon, label, value, subValue, color = 'cyan' }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'cyan' | 'magenta' | 'amber' | 'purple' | 'green' | 'blue';
}) {
  const colorMap = {
    cyan: { text: 'neon-text-cyan', border: 'border-[var(--neon-cyan)]/30', icon: 'text-[var(--neon-cyan)]' },
    magenta: { text: 'neon-text-magenta', border: 'border-[var(--neon-magenta)]/30', icon: 'text-[var(--neon-magenta)]' },
    amber: { text: 'neon-text-amber', border: 'border-[var(--neon-amber)]/30', icon: 'text-[var(--neon-amber)]' },
    purple: { text: 'neon-text-purple', border: 'border-[var(--neon-purple)]/30', icon: 'text-[var(--neon-purple)]' },
    green: { text: 'text-green-400', border: 'border-green-500/30', icon: 'text-green-400' },
    blue: { text: 'text-blue-400', border: 'border-blue-500/30', icon: 'text-blue-400' },
  };
  const c = colorMap[color];

  return (
    <Card className={`bg-black/40 ${c.border}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${c.icon}`} />
          <span className="text-xs text-muted-foreground truncate">{label}</span>
        </div>
        <div className={`text-xl sm:text-2xl font-bold ${c.text}`}>{value}</div>
        {subValue && <div className="text-[10px] text-muted-foreground mt-1">{subValue}</div>}
      </CardContent>
    </Card>
  );
}

function EnergyBar({ distribution }: { distribution: { hot: number; sustainable: number; depleted: number } }) {
  const total = distribution.hot + distribution.sustainable + distribution.depleted;
  if (total === 0) return <div className="text-xs text-muted-foreground">No data</div>;

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden bg-[var(--deep-space)]">
        {distribution.hot > 0 && (
          <div
            className="bg-[var(--neon-amber)] transition-all"
            style={{ width: `${(distribution.hot / total) * 100}%` }}
            title={`Hot: ${distribution.hot}`}
          />
        )}
        {distribution.sustainable > 0 && (
          <div
            className="bg-[var(--neon-cyan)] transition-all"
            style={{ width: `${(distribution.sustainable / total) * 100}%` }}
            title={`Sustainable: ${distribution.sustainable}`}
          />
        )}
        {distribution.depleted > 0 && (
          <div
            className="bg-[var(--neon-purple)] transition-all"
            style={{ width: `${(distribution.depleted / total) * 100}%` }}
            title={`Depleted: ${distribution.depleted}`}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="neon-text-amber">🔥 {distribution.hot}</span>
        <span className="neon-text-cyan">⚡ {distribution.sustainable}</span>
        <span className="neon-text-purple">🌙 {distribution.depleted}</span>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = trpc.crucibleAnalytics.unifiedSummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const unifiedExport = trpc.export.unifiedCsv.useQuery(undefined, { enabled: false });

  const handleExportUnified = async () => {
    try {
      const result = await unifiedExport.refetch();
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
        toast.success('Unified export downloaded');
      }
    } catch {
      toast.error('Failed to export data');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--neon-cyan)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <Card className="bg-black/60 border-[var(--neon-magenta)]/30 p-8 text-center max-w-md">
          <h2 className="text-xl font-bold neon-text-cyan mb-4">Sign In Required</h2>
          <p className="text-muted-foreground mb-6">Access your Command Center analytics</p>
          <a href={getLoginUrl()}>
            <Button className="cyber-button-primary">Sign In</Button>
          </a>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-[var(--neon-purple)]/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-[var(--neon-cyan)] px-2">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold neon-text-purple">Command Center</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Unified Practice Analytics</p>
              </div>
            </div>
            <Button
              onClick={handleExportUnified}
              variant="outline"
              size="sm"
              className="border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Export All</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-black/60 border border-[var(--neon-purple)]/20 mb-6 flex overflow-x-auto">
            <TabsTrigger value="overview" className="flex-1 min-w-0 text-xs sm:text-sm data-[state=active]:bg-[var(--neon-purple)]/20 data-[state=active]:text-[var(--neon-purple)]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="studio" className="flex-1 min-w-0 text-xs sm:text-sm data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]">
              Studio
            </TabsTrigger>
            <TabsTrigger value="trials" className="flex-1 min-w-0 text-xs sm:text-sm data-[state=active]:bg-[var(--neon-magenta)]/20 data-[state=active]:text-[var(--neon-magenta)]">
              Trials
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex-1 min-w-0 text-xs sm:text-sm data-[state=active]:bg-[var(--neon-amber)]/20 data-[state=active]:text-[var(--neon-amber)]">
              Materials
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
          <TabsContent value="overview" className="space-y-6">
            {/* Crucible Progress */}
            <Card className="bg-black/40 border-[var(--neon-purple)]/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold neon-text-purple">Crucible Year {data.crucibleYear}</h2>
                    <p className="text-[10px] text-muted-foreground">Week {data.currentWeek} of 52</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold neon-text-cyan">{data.totalRoundups}</div>
                    <div className="text-[10px] text-muted-foreground">Roundups</div>
                  </div>
                </div>
                <div className="w-full bg-[var(--deep-space)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full neon-progress-gradient rounded-full transition-all"
                    style={{ width: `${Math.min((data.currentWeek / 52) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>{data.currentWeek} weeks elapsed</span>
                  <span>{Math.max(52 - data.currentWeek, 0)} weeks remaining</span>
                </div>
              </CardContent>
            </Card>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Clock} label="Studio Hours" value={data.totalStudioHours} subValue={`${data.avgStudioHoursPerWeek}h/week avg`} color="cyan" />
              <StatCard icon={Flame} label="Total Trials" value={data.totalWorks} subValue={`${data.weeklyTrialAvg.toFixed(1)}/week avg`} color="magenta" />
              <StatCard icon={Trash2} label="Trash Rate" value={`${data.trashRate.toFixed(0)}%`} subValue={`${data.trashCount} of ${data.totalWorks} trashed`} color="purple" />
              <StatCard icon={Footprints} label="Total Steps" value={data.totalSteps > 0 ? `${(data.totalSteps / 1000).toFixed(0)}k` : '—'} subValue={data.avgWeeklySteps > 0 ? `${(data.avgWeeklySteps / 1000).toFixed(1)}k/week` : 'No step data'} color="green" />
            </div>

            {/* Energy Distribution */}
            <Card className="bg-black/40 border-[var(--neon-amber)]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm neon-text-amber flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Energy Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <EnergyBar distribution={data.energyDistribution} />
              </CardContent>
            </Card>

            {/* Jester Trend */}
            {data.jesterTrend.length > 0 && (
              <Card className="bg-black/40 border-[var(--neon-magenta)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-magenta flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Jester Activity Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.jesterTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="weekNumber" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => v === -1 ? 'B' : `W${v}`} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}/10`, 'Jester']} labelFormatter={(l) => l === -1 ? 'Baseline' : `Week ${l}`} />
                        <Line type="monotone" dataKey="jesterActivity" stroke="var(--neon-magenta)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/crucible/intake">
                <Card className="bg-black/40 border-[var(--neon-magenta)]/20 hover:border-[var(--neon-magenta)]/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Flame className="w-5 h-5 text-[var(--neon-magenta)]" />
                    <div>
                      <div className="text-sm font-medium">New Trial</div>
                      <div className="text-[10px] text-muted-foreground">Log a crucible work</div>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
              <Link href="/crucible/works">
                <Card className="bg-black/40 border-[var(--neon-cyan)]/20 hover:border-[var(--neon-cyan)]/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-[var(--neon-cyan)]" />
                    <div>
                      <div className="text-sm font-medium">Browse Works</div>
                      <div className="text-[10px] text-muted-foreground">View all trials</div>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </TabsContent>

          {/* ═══════════════════ STUDIO TAB ═══════════════════ */}
          <TabsContent value="studio" className="space-y-6">
            {/* Studio Hours Trend */}
            <Card className="bg-black/40 border-[var(--neon-cyan)]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm neon-text-cyan flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Studio Hours Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold neon-text-cyan">{data.totalStudioHours}</div>
                    <div className="text-[10px] text-muted-foreground">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold neon-text-cyan">{data.avgStudioHoursPerWeek}</div>
                    <div className="text-[10px] text-muted-foreground">Avg Hours/Week</div>
                  </div>
                </div>
                {data.studioHoursTrend.length > 0 && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.studioHoursTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="weekNumber" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => v === -1 ? 'B' : `W${v}`} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}h`, 'Studio']} labelFormatter={(l) => l === -1 ? 'Baseline' : `Week ${l}`} />
                        <Area type="monotone" dataKey="studioHours" stroke="var(--neon-cyan)" fill="rgba(0,240,255,0.1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step Tracking */}
            <Card className="bg-black/40 border-green-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <Footprints className="w-4 h-4" />
                  Step Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {data.totalSteps > 0 ? `${(data.totalSteps / 1000).toFixed(0)}k` : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Total Steps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {data.avgWeeklySteps > 0 ? `${(data.avgWeeklySteps / 1000).toFixed(1)}k` : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Avg Weekly</div>
                  </div>
                </div>
                {data.stepTrend.length > 0 && data.stepTrend.some(s => s.weeklySteps > 0) && (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.stepTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="weekNumber" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => v === -1 ? 'B' : `W${v}`} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v.toLocaleString()}`, 'Steps']} labelFormatter={(l) => l === -1 ? 'Baseline' : `Week ${l}`} />
                        <Bar dataKey="weeklySteps" radius={[4, 4, 0, 0]}>
                          {data.stepTrend.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.avgDailySteps >= 8000 ? 'var(--neon-cyan)' : entry.avgDailySteps >= 5000 ? 'var(--neon-amber)' : 'var(--neon-magenta)'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Energy Trend */}
            <Card className="bg-black/40 border-[var(--neon-amber)]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm neon-text-amber flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Energy Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnergyBar distribution={data.energyDistribution} />
                {data.energyTrend.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {data.energyTrend.map((e, i) => {
                      const colors = {
                        hot: 'bg-[var(--neon-amber)]',
                        sustainable: 'bg-[var(--neon-cyan)]',
                        depleted: 'bg-[var(--neon-purple)]',
                      };
                      return (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-sm ${colors[e.energyLevel as keyof typeof colors] || 'bg-gray-700'}`}
                          title={`W${e.weekNumber}: ${e.energyLevel}`}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Jester Trend */}
            {data.jesterTrend.length > 0 && (
              <Card className="bg-black/40 border-[var(--neon-magenta)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-magenta flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Jester Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold neon-text-magenta">{data.avgJester}</div>
                      <div className="text-[10px] text-muted-foreground">Average</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold neon-text-magenta">
                        {data.jesterTrend.length > 0 ? data.jesterTrend[data.jesterTrend.length - 1].jesterActivity : '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Latest</div>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.jesterTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="weekNumber" tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => v === -1 ? 'B' : `W${v}`} />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}/10`, 'Jester']} labelFormatter={(l) => l === -1 ? 'Baseline' : `Week ${l}`} />
                        <Area type="monotone" dataKey="jesterActivity" stroke="var(--neon-magenta)" fill="rgba(255,20,147,0.1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══════════════════ TRIALS TAB ═══════════════════ */}
          <TabsContent value="trials" className="space-y-6">
            {/* Trial Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Flame} label="Total Trials" value={data.totalWorks} color="magenta" />
              <StatCard icon={Trash2} label="Trash Rate" value={`${data.trashRate.toFixed(0)}%`} subValue={`incl. Probably Trash`} color="purple" />
              <StatCard icon={Lightbulb} label="Discovery Rate" value={`${data.discoveryDensity.toFixed(0)}%`} subValue="with discovery notes" color="cyan" />
              <StatCard icon={TrendingUp} label="Weekly Avg" value={data.weeklyTrialAvg.toFixed(1)} subValue="trials per week" color="amber" />
            </div>

            {/* Rating Distribution */}
            <Card className="bg-black/40 border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Rating Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 sm:gap-4">
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const ratingData = data.ratingDistribution?.find((r) => r.rating === rating);
                    const count = ratingData?.count || 0;
                    const total = data.ratingDistribution?.reduce((sum, r) => sum + (r.count || 0), 0) || 1;
                    const percentage = ((count / total) * 100).toFixed(0);

                    return (
                      <div key={rating} className="text-center">
                        <div className="flex justify-center mb-1">
                          {Array.from({ length: rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <div className="text-xl font-bold text-yellow-400">{count}</div>
                        <div className="text-[10px] text-muted-foreground">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Disposition Breakdown */}
            <Card className="bg-black/40 border-[var(--neon-purple)]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm neon-text-purple flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Disposition Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.dispositionBreakdown?.map((item) => {
                    const total = data.dispositionBreakdown!.reduce((sum, d) => sum + (d.count || 0), 0);
                    const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                    const label = item.disposition.replace(/_/g, ' ');
                    const colorMap: Record<string, string> = {
                      'Trash': 'from-red-500 to-red-600',
                      'Probably_Trash': 'from-amber-500 to-amber-600',
                      'Save_Archive': 'from-emerald-500 to-emerald-600',
                      'Save_Has_Potential': 'from-yellow-400 to-yellow-500',
                    };

                    return (
                      <div key={item.disposition} className="flex items-center gap-2 sm:gap-3">
                        <div className="w-24 sm:w-32 text-xs text-muted-foreground truncate">{label}</div>
                        <div className="flex-1 bg-[var(--deep-space)] rounded-full h-5 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colorMap[item.disposition] || 'from-purple-500 to-pink-500'} flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(Number(percentage), 3)}%` }}
                          >
                            <span className="text-[10px] font-bold text-white">{item.count}</span>
                          </div>
                        </div>
                        <div className="w-10 text-[10px] text-muted-foreground text-right">{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Temporal Trends */}
            {data.temporalTrends.worksPerWeek.length > 0 && (
              <Card className="bg-black/40 border-[var(--neon-cyan)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-cyan flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Trials Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.temporalTrends.worksPerWeek}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${v}`, 'Trials']} />
                        <Bar dataKey="count" fill="var(--neon-cyan)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dimensional & Time Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dimensional Stats */}
              <Card className="bg-black/40 border-blue-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-400 flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Dimensions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Avg Height</div>
                      <div className="text-lg font-bold text-blue-400">
                        {data.dimensionalStats?.avgHeight ? data.dimensionalStats.avgHeight.toFixed(1) : '—'} cm
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Avg Width</div>
                      <div className="text-lg font-bold text-blue-400">
                        {data.dimensionalStats?.avgWidth ? data.dimensionalStats.avgWidth.toFixed(1) : '—'} cm
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Range</div>
                      <div className="text-sm font-bold text-gray-300">
                        {data.dimensionalStats?.minHeight
                          ? `${data.dimensionalStats.minHeight.toFixed(0)}×${data.dimensionalStats.minWidth?.toFixed(0)}`
                          : '—'}
                        {' → '}
                        {data.dimensionalStats?.maxHeight
                          ? `${data.dimensionalStats.maxHeight.toFixed(0)}×${data.dimensionalStats.maxWidth?.toFixed(0)}`
                          : '—'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Total Area</div>
                      <div className="text-sm font-bold text-blue-400">
                        {data.dimensionalStats?.totalArea ? (data.dimensionalStats.totalArea / 10000).toFixed(2) : '—'} m²
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time Investment */}
              <Card className="bg-black/40 border-green-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time per Trial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Total Hours</div>
                      <div className="text-lg font-bold text-green-400">
                        {data.timeInvestment?.totalHours ? data.timeInvestment.totalHours.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Avg Hours</div>
                      <div className="text-lg font-bold text-green-400">
                        {data.timeInvestment?.avgHours ? data.timeInvestment.avgHours.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Min</div>
                      <div className="text-sm font-bold text-gray-300">
                        {data.timeInvestment?.minHours ? data.timeInvestment.minHours.toFixed(1) : '—'}h
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Max</div>
                      <div className="text-sm font-bold text-gray-300">
                        {data.timeInvestment?.maxHours ? data.timeInvestment.maxHours.toFixed(1) : '—'}h
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <span className="text-[10px] text-muted-foreground">
                      {data.timeInvestment?.worksWithHours || 0} trials have time data
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════════ MATERIALS TAB ═══════════════════ */}
          <TabsContent value="materials" className="space-y-6">
            {/* Material Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard icon={Layers} label="Surfaces" value={data.totalSurfaces} color="amber" />
              <StatCard icon={Droplets} label="Mediums" value={data.totalMediums} color="magenta" />
              <StatCard icon={Lightbulb} label="Discovery Rate" value={`${data.discoveryDensity.toFixed(0)}%`} color="cyan" />
            </div>

            {/* Material Usage - 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Surfaces */}
              <Card className="bg-black/40 border-[var(--neon-amber)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-amber flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Surface Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.materialUsage?.surfaceUsage
                      .filter(s => s.usageCount > 0)
                      .slice(0, 15)
                      .map((surface) => (
                        <div key={surface.materialId} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300 truncate mr-2">{surface.name || surface.code} <span className="text-[10px] text-muted-foreground">({surface.code})</span></span>
                          <span className="neon-text-amber font-bold flex-shrink-0">{surface.usageCount}</span>
                        </div>
                      ))}
                    {(!data.materialUsage?.surfaceUsage || data.materialUsage.surfaceUsage.filter(s => s.usageCount > 0).length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-4">No surface data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Mediums */}
              <Card className="bg-black/40 border-[var(--neon-magenta)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-magenta flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    Medium Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.materialUsage?.mediumUsage
                      .filter(m => m.usageCount > 0)
                      .slice(0, 15)
                      .map((medium) => (
                        <div key={medium.materialId} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300 truncate mr-2">{medium.name || medium.code} <span className="text-[10px] text-muted-foreground">({medium.code})</span></span>
                          <span className="neon-text-magenta font-bold flex-shrink-0">{medium.usageCount}</span>
                        </div>
                      ))}
                    {(!data.materialUsage?.mediumUsage || data.materialUsage.mediumUsage.filter(m => m.usageCount > 0).length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-4">No medium data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tools */}
              <Card className="bg-black/40 border-[var(--neon-cyan)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-cyan flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    Tool Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.materialUsage?.toolUsage
                      .filter(t => t.usageCount > 0)
                      .slice(0, 15)
                      .map((tool) => (
                        <div key={tool.materialId} className="flex justify-between items-center text-sm">
                          <span className="text-gray-300 truncate mr-2">{tool.name || tool.code} <span className="text-[10px] text-muted-foreground">({tool.code})</span></span>
                          <span className="neon-text-cyan font-bold flex-shrink-0">{tool.usageCount}</span>
                        </div>
                      ))}
                    {(!data.materialUsage?.toolUsage || data.materialUsage.toolUsage.filter(t => t.usageCount > 0).length === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-4">No tool data yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rating Trend Over Time */}
            {data.temporalTrends.ratingOverTime.length > 0 && (
              <Card className="bg-black/40 border-yellow-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Average Rating Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.temporalTrends.ratingOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#888' }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${Number(v).toFixed(1)}`, 'Avg Rating']} />
                        <Line type="monotone" dataKey="avgRating" stroke="#eab308" strokeWidth={2} dot={{ r: 3, fill: '#eab308' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trash Rate Over Time */}
            {data.temporalTrends.trashRateOverTime.length > 0 && (
              <Card className="bg-black/40 border-[var(--neon-purple)]/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm neon-text-purple flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Trash Rate Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.temporalTrends.trashRateOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#888' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#888' }} tickFormatter={(v) => `${v}%`} />
                        <Tooltip {...chartTooltipStyle} formatter={(v: number) => [`${Number(v).toFixed(1)}%`, 'Trash Rate']} />
                        <Area type="monotone" dataKey="trashRate" stroke="var(--neon-purple)" fill="rgba(157,78,221,0.1)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
