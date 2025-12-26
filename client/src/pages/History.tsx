import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Loader2, ArrowLeft, Download, Calendar, TrendingUp, BarChart3, Activity, 
  Pencil, ChevronLeft, ChevronRight, Eye, Clock, Sparkles, Zap, Filter, X,
  FileText, Footprints
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
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

// Generate professional PDF HTML report
function generatePdfHtml(data: {
  userName: string;
  crucibleYear: number;
  startDate: Date;
  totalWeeks: number;
  totalStudioHours: number;
  avgJesterActivity: number;
  energyDistribution: { hot: number; sustainable: number; depleted: number };
  totalSteps: number;
  avgWeeklySteps: number;
  roundups: Array<{
    weekNumber: number;
    year: number;
    date: string;
    weatherReport: string | null;
    studioHours: number;
    worksMade: string | null;
    jesterActivity: number;
    energyLevel: string;
    walkingEngineUsed: boolean;
    walkingInsights: string | null;
    partnershipTemperature: string | null;
    thingWorked: string | null;
    thingResisted: string | null;
    somaticState: string | null;
    doorIntention: string | null;
    phaseDna: string | null;
    weeklySteps: number | null;
    avgDailySteps: number | null;
  }>;
  generatedAt: string;
}): string {
  const energyEmoji = { hot: '🔥', sustainable: '⚡', depleted: '🌙' };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>NEON SIGNS - Crucible Year ${data.crucibleYear} Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      background: #000;
      color: #e0e0e0;
      line-height: 1.6;
      padding: 40px;
    }
    
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
      background: linear-gradient(135deg, #000 0%, #0a0a1a 100%);
      border: 2px solid #00f0ff;
      box-shadow: 0 0 60px rgba(0, 240, 255, 0.3);
      padding: 60px;
      margin-bottom: 40px;
    }
    
    .cover h1 {
      font-size: 48px;
      font-weight: 700;
      color: #00f0ff;
      text-shadow: 0 0 30px rgba(0, 240, 255, 0.8);
      margin-bottom: 20px;
      letter-spacing: 4px;
    }
    
    .cover .subtitle {
      font-family: 'Crimson Pro', serif;
      font-style: italic;
      font-size: 24px;
      color: #ff1493;
      margin-bottom: 40px;
    }
    
    .cover .author {
      font-size: 20px;
      color: #888;
      margin-bottom: 10px;
    }
    
    .cover .year-badge {
      display: inline-block;
      padding: 12px 30px;
      border: 2px solid #ff6b35;
      color: #ff6b35;
      font-size: 18px;
      font-weight: 600;
      margin-top: 30px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 40px 0;
    }
    
    .stat-card {
      background: #0a0a1a;
      border: 1px solid #00f0ff33;
      padding: 24px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #00f0ff;
    }
    
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-top: 8px;
    }
    
    .section {
      margin: 40px 0;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 24px;
      color: #ff1493;
      border-bottom: 1px solid #ff149333;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .roundup-entry {
      background: #0a0a1a;
      border-left: 3px solid #00f0ff;
      padding: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .roundup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .week-badge {
      font-size: 20px;
      font-weight: 700;
      color: #00f0ff;
    }
    
    .phase-badge {
      padding: 4px 12px;
      background: #ff6b3520;
      color: #ff6b35;
      font-size: 12px;
      font-weight: 600;
    }
    
    .weather-report {
      font-family: 'Crimson Pro', serif;
      font-style: italic;
      font-size: 16px;
      color: #ccc;
      border-left: 2px solid #ff1493;
      padding-left: 15px;
      margin: 15px 0;
    }
    
    .metrics-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin: 15px 0;
    }
    
    .metric {
      font-size: 14px;
    }
    
    .metric-label {
      color: #888;
    }
    
    .metric-value {
      color: #00f0ff;
      font-weight: 600;
    }
    
    .footer {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #333;
      margin-top: 60px;
    }
    
    @media print {
      body { background: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cover { page-break-after: always; }
      .roundup-entry { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>NEON SIGNS</h1>
    <p class="subtitle">The Mirror That Glows</p>
    <p class="author">${data.userName}</p>
    <div class="year-badge">CRUCIBLE YEAR ${data.crucibleYear}</div>
  </div>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${data.totalWeeks}</div>
      <div class="stat-label">Weeks Logged</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.totalStudioHours}</div>
      <div class="stat-label">Studio Hours</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.avgJesterActivity.toFixed(1)}</div>
      <div class="stat-label">Avg Jester</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.avgWeeklySteps.toLocaleString()}</div>
      <div class="stat-label">Avg Weekly Steps</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.energyDistribution.hot}</div>
      <div class="stat-label">🔥 Hot Weeks</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${data.energyDistribution.sustainable}</div>
      <div class="stat-label">⚡ Sustainable Weeks</div>
    </div>
  </div>
  
  <div class="section">
    <h2 class="section-title">Weekly Roundups</h2>
    ${data.roundups.map(r => `
      <div class="roundup-entry">
        <div class="roundup-header">
          <span class="week-badge">Week ${r.weekNumber}</span>
          <span class="phase-badge">${r.phaseDna || 'Unassigned'}</span>
        </div>
        <div class="weather-report">${r.weatherReport || 'No weather report'}</div>
        <div class="metrics-row">
          <div class="metric"><span class="metric-label">Studio:</span> <span class="metric-value">${r.studioHours}h</span></div>
          <div class="metric"><span class="metric-label">Jester:</span> <span class="metric-value">${r.jesterActivity}/10</span></div>
          <div class="metric"><span class="metric-label">Energy:</span> <span class="metric-value">${energyEmoji[r.energyLevel as keyof typeof energyEmoji] || ''} ${r.energyLevel}</span></div>
          ${r.weeklySteps ? `<div class="metric"><span class="metric-label">Steps:</span> <span class="metric-value">${r.weeklySteps.toLocaleString()}</span></div>` : ''}
        </div>
        ${r.thingWorked ? `<p style="margin-top: 10px;"><strong style="color: #00f0ff;">Worked:</strong> ${r.thingWorked}</p>` : ''}
        ${r.thingResisted ? `<p><strong style="color: #ff1493;">Resisted:</strong> ${r.thingResisted}</p>` : ''}
        ${r.somaticState ? `<p><strong style="color: #ff6b35;">Somatic:</strong> ${r.somaticState}</p>` : ''}
      </div>
    `).join('')}
  </div>
  
  <div class="footer">
    <p>Generated by NEON SIGNS on ${new Date(data.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p style="margin-top: 10px; color: #00f0ff;">"The mirror that glows shows what you already know."</p>
  </div>
</body>
</html>
  `;
}

function EnergyBadge({ level, size = "sm" }: { level: string; size?: "sm" | "lg" }) {
  const config = {
    hot: { emoji: '🔥', label: 'Hot', className: 'neon-text-amber bg-[var(--neon-amber)]/10 border-[var(--neon-amber)]/30' },
    sustainable: { emoji: '⚡', label: 'Sustainable', className: 'neon-text-cyan bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/30' },
    depleted: { emoji: '🌙', label: 'Depleted', className: 'neon-text-purple bg-[var(--neon-purple)]/10 border-[var(--neon-purple)]/30' },
  };
  const { emoji, label, className } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${className} ${size === "lg" ? "text-sm" : "text-xs"}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

function JesterIndicator({ value, size = "sm" }: { value: number; size?: "sm" | "lg" }) {
  const percentage = (value / 10) * 100;
  const barHeight = size === "lg" ? "h-3" : "h-2";
  
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${barHeight} bg-[var(--deep-space)] rounded-full overflow-hidden`}>
        <div 
          className={`${barHeight} bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-magenta)] rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`neon-text-magenta font-bold ${size === "lg" ? "text-lg" : "text-sm"}`}>{value}</span>
    </div>
  );
}

interface RoundupCardProps {
  roundup: {
    id: number;
    weekNumber: number;
    createdAt: Date;
    weatherReport: string;
    studioHours: number;
    jesterActivity: number;
    energyLevel: string;
    somaticState: string;
    phaseDnaAssigned: string | null;
    entryNumber?: number;
    entriesInWeek?: number;
    dailySteps?: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number } | null;
  };
  isCurrent: boolean;
  onViewFull: () => void;
  onEdit: () => void;
}

function RoundupCard({ roundup, isCurrent, onViewFull, onEdit }: RoundupCardProps) {
  const hasMultipleEntries = roundup.entriesInWeek && roundup.entriesInWeek > 1;
  
  return (
    <div 
      className={`cyber-card rounded-xl p-5 min-w-[280px] max-w-[320px] flex-shrink-0 snap-center transition-all duration-300
        ${isCurrent ? 'ring-2 ring-[var(--neon-cyan)] shadow-[0_0_20px_var(--neon-cyan)]' : 'hover:border-[var(--neon-cyan)]/50'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold neon-text-cyan">W{roundup.weekNumber}</span>
            {hasMultipleEntries && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--neon-magenta)]/20 neon-text-magenta border border-[var(--neon-magenta)]/30">
                {roundup.entryNumber}/{roundup.entriesInWeek}
              </span>
            )}
            {isCurrent && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--neon-cyan)]/20 neon-text-cyan border border-[var(--neon-cyan)]/30">
                CURRENT
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(roundup.createdAt).toLocaleDateString('en-US', { 
              weekday: 'short',
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>
        <EnergyBadge level={roundup.energyLevel} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--deep-space)] rounded-lg p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span>Studio</span>
          </div>
          <p className="text-lg font-bold neon-text-cyan">{roundup.studioHours}h</p>
        </div>
        <div className="bg-[var(--deep-space)] rounded-lg p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Jester</span>
          </div>
          <JesterIndicator value={roundup.jesterActivity} />
        </div>
      </div>

      {/* Step Counter Mini Display */}
      {roundup.dailySteps && (
        <div className="mb-4">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Footprints className="h-3 w-3" />
            <span>Steps</span>
          </div>
          <div className="flex gap-1">
            {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
              const steps = roundup.dailySteps?.[day] || 0;
              const barHeight = Math.min((steps / 15000) * 100, 100);
              return (
                <div key={day} className="flex-1">
                  <div className="h-8 bg-[var(--void-black)] rounded-sm relative overflow-hidden">
                    <div 
                      className={`absolute bottom-0 left-0 right-0 transition-all ${
                        steps >= 8000 ? 'bg-[var(--neon-cyan)]' : 
                        steps >= 5000 ? 'bg-[var(--neon-amber)]' : 
                        steps > 0 ? 'bg-[var(--neon-magenta)]' : 'bg-muted/20'
                      }`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {Object.values(roundup.dailySteps).reduce((a, b) => a + b, 0).toLocaleString()} total
            </span>
            {(() => {
              const values = Object.values(roundup.dailySteps);
              const daysWithSteps = values.filter(v => v > 0).length;
              const total = values.reduce((a, b) => a + b, 0);
              const avg = daysWithSteps > 0 ? Math.round(total / daysWithSteps) : 0;
              return (
                <span className={`text-[10px] font-medium ${
                  avg >= 8000 ? 'neon-text-cyan' : 
                  avg >= 5000 ? 'neon-text-amber' : 
                  'neon-text-magenta'
                }`}>
                  {avg > 0 ? `${(avg / 1000).toFixed(1)}k/day` : '-'}
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Somatic Preview */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-1">Somatic State</p>
        <p className="text-sm text-foreground/80 line-clamp-2">
          {roundup.somaticState || "No somatic state recorded"}
        </p>
      </div>

      {/* Phase DNA */}
      {roundup.phaseDnaAssigned && (
        <div className="mb-4">
          <span className="text-xs px-2 py-1 rounded bg-[var(--neon-purple)]/10 neon-text-purple border border-[var(--neon-purple)]/30">
            {roundup.phaseDnaAssigned}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          onClick={onViewFull}
          className="flex-1 cyber-button-primary text-sm py-2"
        >
          <Eye className="h-4 w-4 mr-1" />
          View Full
        </Button>
        <Button 
          onClick={onEdit}
          variant="outline"
          className="border-[var(--neon-magenta)]/30 text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/10 hover:border-[var(--neon-magenta)]"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
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
  const [, setLocation] = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Filter state
  const [energyFilter, setEnergyFilter] = useState<string>("all");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [workTempFilter, setWorkTempFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Quick edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRoundupId, setSelectedRoundupId] = useState<number | null>(null);

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

  const exportPdfData = trpc.export.pdfData.useQuery(undefined, {
    enabled: false,
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleExportCsv = async () => {
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
        toast.success('CSV exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const result = await exportPdfData.refetch();
      if (result.data) {
        // Generate HTML-based PDF report
        const data = result.data;
        const htmlContent = generatePdfHtml(data);
        
        // Open in new window for printing/saving as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          toast.success('PDF report generated - use Print to save as PDF');
        } else {
          toast.error('Please allow popups to generate PDF');
        }
      }
    } catch (error) {
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Scroll to current week on mount
  useEffect(() => {
    if (scrollContainerRef.current && stats?.currentWeek !== undefined) {
      const container = scrollContainerRef.current;
      const cards = container.querySelectorAll('[data-week-card]');
      const currentCard = Array.from(cards).find(
        (card) => card.getAttribute('data-week') === String(stats.currentWeek)
      );
      if (currentCard) {
        currentCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [stats?.currentWeek, roundupsData]);

  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
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
  const currentWeek = stats?.currentWeek || 0;

  // Get unique phases for filter
  const uniquePhases = Array.from(new Set(roundups.map(r => r.phaseDnaAssigned).filter(Boolean)));

  // Apply filters
  const filteredRoundups = roundups.filter(r => {
    if (energyFilter !== "all" && r.energyLevel !== energyFilter) return false;
    if (phaseFilter !== "all" && r.phaseDnaAssigned !== phaseFilter) return false;
    // Filter by work emotional temperature if worksData exists
    if (workTempFilter !== "all") {
      const worksData = (r as { worksData?: Array<{ emotionalTemp?: string }> }).worksData;
      if (!worksData || !Array.isArray(worksData)) return false;
      const hasMatchingTemp = worksData.some(w => w.emotionalTemp === workTempFilter);
      if (!hasMatchingTemp) return false;
    }
    return true;
  });

  // Create 52-week timeline data with entry counts
  const timelineData = Array.from({ length: 52 }, (_, i) => {
    const weekNum = i;
    const weekRoundups = roundups.filter(r => r.weekNumber === weekNum);
    return {
      week: weekNum,
      submitted: weekRoundups.length > 0,
      entryCount: weekRoundups.length,
      isCurrent: weekNum === currentWeek,
    };
  });

  const handleViewFull = (roundupId: number) => {
    setLocation(`/results/${roundupId}`);
  };

  const handleEdit = (roundupId: number) => {
    setLocation(`/edit/${roundupId}`);
  };

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
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleExportCsv} 
              disabled={roundups.length === 0}
              className="cyber-button-secondary"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button 
              onClick={handleExportPdf} 
              disabled={roundups.length === 0 || isGeneratingPdf}
              className="cyber-button-primary"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">PDF Report</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-8">
        {/* Card Browser Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 neon-text-cyan" />
              <h2 className="text-lg font-semibold neon-text-white">Week Browser</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-[var(--neon-cyan)]/30 ${showFilters ? 'bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)]' : 'text-muted-foreground'}`}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {(energyFilter !== "all" || phaseFilter !== "all" || workTempFilter !== "all") && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-[var(--neon-magenta)]" />
                )}
              </Button>
              {/* Navigation Arrows */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollCards('left')}
                  className="h-8 w-8 border-[var(--neon-cyan)]/30 text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollCards('right')}
                  className="h-8 w-8 border-[var(--neon-cyan)]/30 text-muted-foreground hover:text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="cyber-card rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Energy:</span>
                <Select value={energyFilter} onValueChange={setEnergyFilter}>
                  <SelectTrigger className="w-[140px] cyber-input h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--void-black)] border-[var(--neon-cyan)]/30">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="hot">🔥 Hot</SelectItem>
                    <SelectItem value="sustainable">⚡ Sustainable</SelectItem>
                    <SelectItem value="depleted">🌙 Depleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Phase:</span>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-[140px] cyber-input h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--void-black)] border-[var(--neon-cyan)]/30">
                    <SelectItem value="all">All Phases</SelectItem>
                    {uniquePhases.map(phase => (
                      <SelectItem key={phase} value={phase!}>{phase}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Work Temp:</span>
                <Select value={workTempFilter} onValueChange={setWorkTempFilter}>
                  <SelectTrigger className="w-[140px] cyber-input h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--void-black)] border-[var(--neon-cyan)]/30">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="struggling">😤 Struggling</SelectItem>
                    <SelectItem value="processing">🔄 Processing</SelectItem>
                    <SelectItem value="flowing">🌊 Flowing</SelectItem>
                    <SelectItem value="uncertain">❓ Uncertain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(energyFilter !== "all" || phaseFilter !== "all" || workTempFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEnergyFilter("all"); setPhaseFilter("all"); setWorkTempFilter("all"); }}
                  className="text-muted-foreground hover:text-[var(--neon-magenta)]"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <span className="text-sm text-muted-foreground ml-auto">
                Showing {filteredRoundups.length} of {roundups.length}
              </span>
            </div>
          )}

          {/* Scrollable Card Container */}
          {filteredRoundups.length === 0 ? (
            <div className="cyber-card rounded-xl p-12 text-center">
              <p className="text-muted-foreground mb-4">
                {roundups.length === 0 
                  ? "No roundups submitted yet." 
                  : "No roundups match your filters."}
              </p>
              {roundups.length === 0 && (
                <Link href="/roundup">
                  <Button className="cyber-button-primary">
                    Submit Your First Roundup
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div 
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[var(--neon-cyan)]/30 scrollbar-track-transparent"
              style={{ scrollbarWidth: 'thin' }}
            >
              {filteredRoundups.map((roundup) => (
                <div key={roundup.id} data-week-card data-week={roundup.weekNumber}>
                  <RoundupCard
                    roundup={roundup}
                    isCurrent={roundup.weekNumber === currentWeek}
                    onViewFull={() => handleViewFull(roundup.id)}
                    onEdit={() => handleEdit(roundup.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

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
                  className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-medium transition-all cursor-default relative
                    ${week.isCurrent 
                      ? 'ring-2 ring-[var(--neon-cyan)] ring-offset-2 ring-offset-[var(--void-black)] shadow-[0_0_10px_var(--neon-cyan)]' 
                      : ''}
                    ${week.entryCount > 1
                      ? 'bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] text-[var(--void-black)] shadow-[0_0_8px_var(--neon-magenta)]'
                      : week.submitted 
                      ? 'bg-[var(--neon-cyan)] text-[var(--void-black)] shadow-[0_0_8px_var(--neon-cyan)]' 
                      : 'bg-[var(--deep-space)] text-muted-foreground border border-[var(--neon-cyan)]/20'}
                  `}
                  title={`Week ${week.week}${week.isCurrent ? ' (current)' : ''}${week.entryCount > 0 ? ` - ${week.entryCount} ${week.entryCount === 1 ? 'entry' : 'entries'}` : ''}`}
                >
                  {week.week}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
                <span>1 entry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] shadow-[0_0_8px_var(--neon-magenta)]" />
                <span>Multiple entries</span>
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
              Jester
            </TabsTrigger>
            <TabsTrigger value="studio" className="data-[state=active]:bg-[var(--neon-cyan)]/20 data-[state=active]:text-[var(--neon-cyan)]">
              <BarChart3 className="h-4 w-4 mr-2" />
              Studio
            </TabsTrigger>
            <TabsTrigger value="energy" className="data-[state=active]:bg-[var(--neon-amber)]/20 data-[state=active]:text-[var(--neon-amber)]">
              <TrendingUp className="h-4 w-4 mr-2" />
              Energy
            </TabsTrigger>
            <TabsTrigger value="steps" className="data-[state=active]:bg-[var(--neon-purple)]/20 data-[state=active]:text-[var(--neon-purple)]">
              <Footprints className="h-4 w-4 mr-2" />
              Steps
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

          <TabsContent value="steps">
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold neon-text-purple mb-1">Weekly Step Totals</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Daily average targets: 8k+ (cyan), 5k+ (amber)
                </p>
                {(() => {
                  const stepsData = roundups
                    .filter(r => r.dailySteps)
                    .map(r => {
                      const steps = r.dailySteps as { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
                      const total = Object.values(steps).reduce((a, b) => a + b, 0);
                      const daysWithSteps = Object.values(steps).filter(v => v > 0).length;
                      const avg = daysWithSteps > 0 ? Math.round(total / daysWithSteps) : 0;
                      return {
                        weekNumber: r.weekNumber,
                        total,
                        average: avg,
                        avgK: avg / 1000
                      };
                    })
                    .reverse();
                  
                  if (stepsData.length === 0) {
                    return (
                      <div className="h-64 flex items-center justify-center text-muted-foreground">
                        No step data yet. Add steps to your roundups to see trends.
                      </div>
                    );
                  }
                  
                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stepsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.1)" />
                        <XAxis 
                          dataKey="weekNumber" 
                          stroke="rgba(255, 255, 255, 0.3)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                        />
                        <YAxis 
                          stroke="rgba(255, 255, 255, 0.3)"
                          tick={{ fill: 'rgba(255, 255, 255, 0.5)' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          {...chartTooltipStyle}
                          formatter={(value: number, name: string) => {
                            if (name === 'average') return [`${value.toLocaleString()} steps/day`, 'Daily Avg'];
                            return [`${value.toLocaleString()} steps`, 'Weekly Total'];
                          }}
                        />
                        <ReferenceLine y={56000} stroke="var(--neon-cyan)" strokeDasharray="5 5" label={{ value: '8k/day', fill: 'var(--neon-cyan)', fontSize: 10 }} />
                        <ReferenceLine y={35000} stroke="var(--neon-amber)" strokeDasharray="5 5" label={{ value: '5k/day', fill: 'var(--neon-amber)', fontSize: 10 }} />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                          {stepsData.map((entry, index) => {
                            const color = entry.average >= 8000 ? 'var(--neon-cyan)' : 
                                         entry.average >= 5000 ? 'var(--neon-amber)' : 
                                         'var(--neon-magenta)';
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={color}
                                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
