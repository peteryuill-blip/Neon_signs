import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Download, Calendar, TrendingUp, BarChart3, Activity } from "lucide-react";
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
    hot: { emoji: '🔥', label: 'Hot', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    sustainable: { emoji: '⚙️', label: 'Sustainable', color: 'text-green-400', bg: 'bg-green-400/10' },
    depleted: { emoji: '🪫', label: 'Depleted', color: 'text-red-400', bg: 'bg-red-400/10' },
  };
  const { emoji, label, color, bg } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${color} ${bg}`}>
      <span className="text-xs">{emoji}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'oklch(0.15 0.02 280)',
    border: '1px solid oklch(0.28 0.03 280)',
    borderRadius: '8px',
    color: 'oklch(0.95 0.01 280)',
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
    enabled: false, // Don't auto-fetch
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin neon-text-cyan" />
          <p className="text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to view history.</p>
            <Button onClick={() => window.location.href = getLoginUrl()}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roundups = roundupsData?.roundups || [];
  const jesterData = trends?.jesterTrend || [];
  const studioData = trends?.studioHoursTrend || [];
  const energyData = trends?.energyTrend || [];

  // Create 52-week timeline data
  const currentWeek = stats?.currentWeek || 1;
  const timelineData = Array.from({ length: 52 }, (_, i) => {
    const weekNum = i + 1;
    const roundup = roundups.find(r => r.weekNumber === weekNum);
    return {
      week: weekNum,
      submitted: !!roundup,
      isCurrent: weekNum === currentWeek,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">History & Trends</h1>
              <p className="text-sm text-muted-foreground">
                {roundups.length} roundups submitted
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={roundups.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* 52-Week Timeline */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 neon-text-cyan" />
              52-Week Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {timelineData.map((week) => (
                <div
                  key={week.week}
                  className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-medium transition-all
                    ${week.isCurrent 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : ''}
                    ${week.submitted 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'}
                  `}
                  title={`Week ${week.week}${week.isCurrent ? ' (current)' : ''}${week.submitted ? ' - submitted' : ''}`}
                >
                  {week.week}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-primary" />
                <span>Submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-muted" />
                <span>Not submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm ring-2 ring-primary ring-offset-1 ring-offset-background" />
                <span>Current week</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <Tabs defaultValue="jester" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="jester" className="data-[state=active]:bg-background">
              <Activity className="h-4 w-4 mr-2" />
              Jester Activity
            </TabsTrigger>
            <TabsTrigger value="studio" className="data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4 mr-2" />
              Studio Hours
            </TabsTrigger>
            <TabsTrigger value="energy" className="data-[state=active]:bg-background">
              <TrendingUp className="h-4 w-4 mr-2" />
              Energy Levels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jester">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Jester Activity Trend</CardTitle>
                <p className="text-sm text-muted-foreground">
                  0 = fully present, 10 = fully performing
                </p>
              </CardHeader>
              <CardContent>
                {jesterData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Submit your first roundup to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={jesterData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 280)" />
                      <XAxis 
                        dataKey="weekNumber" 
                        stroke="oklch(0.65 0.02 280)"
                        tick={{ fill: 'oklch(0.65 0.02 280)' }}
                      />
                      <YAxis 
                        domain={[0, 10]} 
                        stroke="oklch(0.65 0.02 280)"
                        tick={{ fill: 'oklch(0.65 0.02 280)' }}
                      />
                      <Tooltip {...chartTooltipStyle} />
                      <ReferenceLine y={5} stroke="oklch(0.5 0.02 280)" strokeDasharray="5 5" />
                      <Line
                        type="monotone"
                        dataKey="jesterActivity"
                        stroke="var(--neon-magenta)"
                        strokeWidth={2}
                        dot={{ fill: 'var(--neon-magenta)', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: 'var(--neon-magenta)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="studio">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Studio Hours per Week</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {stats?.totalStudioHours || 0} hours
                </p>
              </CardHeader>
              <CardContent>
                {studioData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Submit your first roundup to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={studioData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 280)" />
                      <XAxis 
                        dataKey="weekNumber" 
                        stroke="oklch(0.65 0.02 280)"
                        tick={{ fill: 'oklch(0.65 0.02 280)' }}
                      />
                      <YAxis 
                        stroke="oklch(0.65 0.02 280)"
                        tick={{ fill: 'oklch(0.65 0.02 280)' }}
                      />
                      <Tooltip {...chartTooltipStyle} />
                      <Bar dataKey="studioHours" fill="var(--neon-cyan)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="energy">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Energy Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {energyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data yet. Submit your first roundup to see trends.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={energyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 280)" />
                      <XAxis 
                        dataKey="weekNumber" 
                        stroke="oklch(0.65 0.02 280)"
                        tick={{ fill: 'oklch(0.65 0.02 280)' }}
                      />
                      <YAxis 
                        stroke="oklch(0.65 0.02 280)"
                        tick={{ fill: 'oklch(0.65 0.02 280)' }}
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
                          const labels = { hot: '🔥 Hot', sustainable: '⚙️ Sustainable', depleted: '🪫 Depleted' };
                          return [labels[value as keyof typeof labels] || value, 'Energy'];
                        }}
                      />
                      <Bar dataKey="energyLevel" radius={[4, 4, 0, 0]}>
                        {energyData.map((entry, index) => {
                          const colors = {
                            hot: 'oklch(0.7 0.15 50)',
                            sustainable: 'oklch(0.7 0.15 145)',
                            depleted: 'oklch(0.6 0.2 25)',
                          };
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={colors[entry.energyLevel as keyof typeof colors] || colors.sustainable}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Week-by-Week Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>All Roundups</CardTitle>
          </CardHeader>
          <CardContent>
            {roundups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No roundups submitted yet.</p>
                <Link href="/roundup">
                  <Button variant="outline" className="mt-4">
                    Submit Your First Roundup
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Week</TableHead>
                      <TableHead>Weather Summary</TableHead>
                      <TableHead className="w-24 text-right">Hours</TableHead>
                      <TableHead className="w-24 text-right">Jester</TableHead>
                      <TableHead className="w-32">Energy</TableHead>
                      <TableHead className="w-24">Phase-DNA</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roundups.map((roundup) => (
                      <TableRow key={roundup.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          W{roundup.weekNumber}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {roundup.weatherReport.substring(0, 60)}
                          {roundup.weatherReport.length > 60 ? '...' : ''}
                        </TableCell>
                        <TableCell className="text-right">{roundup.studioHours}h</TableCell>
                        <TableCell className="text-right">{roundup.jesterActivity}/10</TableCell>
                        <TableCell>
                          <EnergyBadge level={roundup.energyLevel} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs neon-text-blue">{roundup.phaseDnaAssigned || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <Link href={`/results/${roundup.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
