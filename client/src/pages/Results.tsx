import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, Clock, Zap, Activity, Footprints, Heart, Sparkles, Archive, MessageSquare, MapPin, Thermometer, Droplets } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";
import { Streamdown } from "streamdown";

function EnergyBadge({ level }: { level: string }) {
  const config = {
    hot: { emoji: '🔥', label: 'Hot', className: 'neon-text-amber' },
    sustainable: { emoji: '⚡', label: 'Sustainable', className: 'neon-text-cyan' },
    depleted: { emoji: '🌙', label: 'Depleted', className: 'neon-text-purple' },
  };
  const { emoji, label, className } = config[level as keyof typeof config] || config.sustainable;
  
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

function MatchTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'phrase':
      return <span className="w-3 h-3 rounded-full bg-[var(--neon-magenta)] shadow-[0_0_8px_var(--neon-magenta)]" />;
    case 'emotional':
      return <span className="w-3 h-3 rounded-full bg-[var(--neon-amber)] shadow-[0_0_8px_var(--neon-amber)]" />;
    case 'phase-dna':
      return <span className="w-3 h-3 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />;
    default:
      return null;
  }
}

function MatchTypeLabel({ type }: { type: string }) {
  switch (type) {
    case 'phrase':
      return <span className="neon-text-magenta font-medium text-sm tracking-wide">PHRASE MATCH</span>;
    case 'emotional':
      return <span className="neon-text-amber font-medium text-sm tracking-wide">ENERGY PARALLEL</span>;
    case 'phase-dna':
      return <span className="neon-text-cyan font-medium text-sm tracking-wide">PHASE-DNA DETECTED</span>;
    default:
      return null;
  }
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const roundupId = parseInt(id || '0', 10);
  const { loading: authLoading, isAuthenticated } = useAuth();
  
  // Cascade reveal state
  const [showSection1, setShowSection1] = useState(false);
  const [showSection2, setShowSection2] = useState(false);
  const [showSection3, setShowSection3] = useState(false);

  // Fetch roundup data
  const { data: roundup, isLoading: roundupLoading } = trpc.roundup.getById.useQuery(
    { id: roundupId },
    { enabled: isAuthenticated && roundupId > 0 }
  );

  // Run pattern analysis
  const analyzePatterns = trpc.patterns.analyze.useMutation();
  const { data: patterns, isLoading: patternsLoading, refetch: refetchPatterns } = trpc.patterns.getForRoundup.useQuery(
    { roundupId },
    { enabled: isAuthenticated && roundupId > 0 }
  );

  // Generate Neon's reading
  const generateReading = trpc.neon.generateReading.useMutation();
  const [neonReading, setNeonReading] = useState<string | null>(null);

  // Cascade reveal timing
  useEffect(() => {
    if (roundup) {
      setShowSection1(true);
      
      const timer2 = setTimeout(() => {
        setShowSection2(true);
        // Pattern analysis is currently disabled — do not auto-trigger
      }, 3000);
      
      const timer3 = setTimeout(() => {
        setShowSection3(true);
        generateReading.mutate({ roundupId }, {
          onSuccess: (data) => {
            setNeonReading(data.reading);
          }
        });
      }, 6000);
      
      return () => {
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [roundup, roundupId]);

  if (authLoading || roundupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin neon-text-cyan" />
            <div className="absolute inset-0 blur-xl bg-[var(--neon-cyan)] opacity-30" />
          </div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 neon-text-white">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">Please sign in to view results.</p>
          <Button onClick={() => window.location.href = getLoginUrl()} className="cyber-button-primary">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (!roundup) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="cyber-card max-w-md w-full rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold mb-2 neon-text-magenta">Roundup Not Found</h2>
          <p className="text-muted-foreground mb-6">This roundup doesn't exist or you don't have access.</p>
          <Link href="/">
            <Button className="cyber-button-secondary">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalMatches = patterns 
    ? patterns.phrase.length + patterns.emotional.length + patterns.phaseDna.length 
    : 0;

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
              <h1 className="text-lg font-semibold neon-text-white">
                Week {roundup.weekNumber} Results
                {roundup.entryNumber && roundup.entryNumber > 0 && (
                  <span className="ml-2 text-sm font-normal neon-text-magenta">
                    Entry {roundup.entryNumber}
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date(roundup.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-3xl space-y-8">
        {/* Section 1: Intake Confirmation */}
        {showSection1 && (
          <div className="cascade-reveal">
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/5 to-transparent pointer-events-none" />
              <div className="p-6 relative">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 neon-text-cyan" />
                  <h2 className="text-lg font-semibold neon-text-cyan">Intake Confirmed</h2>
                </div>

                {/* Weather Report - Large */}
                <div className="p-6 rounded-lg bg-[var(--void-black)]/50 border border-[var(--neon-cyan)]/20 mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-muted-foreground">Weather Report</p>
                    {roundup.city && roundup.weatherData && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{roundup.city}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xl font-neon-mirror italic leading-relaxed neon-text-white" style={{ textShadow: '0 0 20px rgba(0, 240, 255, 0.2)' }}>
                    "{roundup.weatherReport}"
                  </p>
                  
                  {/* Real Weather Data */}
                  {roundup.weatherData && (
                    <div className="mt-4 pt-4 border-t border-[var(--neon-cyan)]/10">
                      <p className="text-xs text-muted-foreground mb-2">Actual Weather Conditions</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{(roundup.weatherData as { icon: string }).icon}</span>
                          <span className="text-sm neon-text-cyan">{(roundup.weatherData as { conditions: string }).conditions}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-4 w-4 text-[var(--neon-amber)]" />
                          <span className="text-sm">{(roundup.weatherData as { temp: number }).temp}°C</span>
                          <span className="text-xs text-muted-foreground">(feels {(roundup.weatherData as { feelsLike: number }).feelsLike}°C)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Droplets className="h-4 w-4 text-[var(--neon-cyan)]" />
                          <span className="text-sm">{(roundup.weatherData as { humidity: number }).humidity}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Points Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  <div className="cyber-stat-card rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Clock className="h-3 w-3" />
                      Studio Hours
                    </div>
                    <p className="text-lg font-bold neon-text-cyan">{roundup.studioHours}h</p>
                  </div>

                  <div className="cyber-stat-card rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Activity className="h-3 w-3" />
                      Jester Activity
                    </div>
                    <p className="text-lg font-bold neon-text-magenta">{roundup.jesterActivity}/10</p>
                  </div>

                  <div className="cyber-stat-card rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Zap className="h-3 w-3" />
                      Energy
                    </div>
                    <EnergyBadge level={roundup.energyLevel} />
                  </div>

                  <div className="cyber-stat-card rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Footprints className="h-3 w-3" />
                      Walking Engine
                    </div>
                    <p className="text-lg font-bold">{roundup.walkingEngineUsed ? 'Yes' : 'No'}</p>
                  </div>

                  <div className="cyber-stat-card rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Heart className="h-3 w-3" />
                      Phase-DNA
                    </div>
                    <p className="text-lg font-bold neon-text-purple">{roundup.phaseDnaAssigned || 'Detecting...'}</p>
                  </div>

                  <div className="cyber-stat-card rounded-lg p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <Calendar className="h-3 w-3" />
                      Week
                    </div>
                    <p className="text-lg font-bold">{roundup.weekNumber} of 52</p>
                  </div>
                </div>

                {/* Step Tracking Data */}
                {roundup.dailySteps && (
                  <div className="cyber-stat-card rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                      <Footprints className="h-4 w-4 neon-text-cyan" />
                      <span className="font-medium">Weekly Step Tracking</span>
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day) => {
                        const steps = (roundup.dailySteps as Record<string, number>)?.[day] || 0;
                        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
                        return (
                          <div key={day} className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">{dayLabel}</p>
                            <p className={`text-sm font-bold ${
                              steps >= 8000 ? 'neon-text-cyan' : 
                              steps >= 5000 ? 'neon-text-amber' : 
                              steps > 0 ? 'neon-text-magenta' : 'text-muted-foreground'
                            }`}>
                              {steps > 0 ? steps.toLocaleString() : '-'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--neon-cyan)]/20">
                      <div>
                        <p className="text-xs text-muted-foreground">Weekly Total</p>
                        <p className="text-lg font-bold neon-text-cyan">
                          {Object.values(roundup.dailySteps as Record<string, number>).reduce((a, b) => a + b, 0).toLocaleString()} steps
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Daily Average</p>
                        <p className="text-lg font-bold neon-text-cyan">
                          {(() => {
                            const values = Object.values(roundup.dailySteps as Record<string, number>);
                            const daysWithSteps = values.filter(v => v > 0).length;
                            const total = values.reduce((a, b) => a + b, 0);
                            return daysWithSteps > 0 ? Math.round(total / daysWithSteps).toLocaleString() : 0;
                          })()} steps/day
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="tattoo-line mb-4" />
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Works Made</p>
                    <p className="text-foreground/90">{roundup.worksMade}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">What Worked</p>
                      <p className="neon-text-cyan">{roundup.thingWorked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">What Resisted</p>
                      <p className="neon-text-magenta">{roundup.thingResisted}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Somatic State</p>
                    <p className="text-foreground/90">{roundup.somaticState}</p>
                  </div>

                  {roundup.doorIntention && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Door Intention</p>
                      <p className="italic neon-text-purple">\"{ roundup.doorIntention }\"</p>
                    </div>
                  )}

                  {/* Quick Notes from This Week */}
                  {roundup.quickNotes && roundup.quickNotes.length > 0 && (
                    <div>
                      <p className="text-sm text-cyan-400 font-semibold mb-2">📝 Quick Notes ({roundup.quickNotes.length})</p>
                      <div className="space-y-2">
                        {roundup.quickNotes.map((note: any, index: number) => (
                          <div key={index} className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2.5 space-y-1">
                            <p className="text-sm text-foreground/80">{note.content}</p>
                            {note.createdAt && (
                              <p className="text-xs text-muted-foreground/50">
                                {new Date(note.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                                {' · '}
                                {new Date(note.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Pattern Archaeology */}
        {showSection2 && (
          <div className="cascade-reveal" style={{ animationDelay: '0.2s' }}>
            <div className="cyber-card rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-magenta)]/5 to-transparent pointer-events-none" />
              <div className="p-6 relative">
                <div className="flex items-center gap-2 mb-6">
                  <Archive className="h-5 w-5 neon-text-magenta" />
                  <h2 className="text-lg font-semibold neon-text-magenta">Pattern Archaeology</h2>
                </div>

                {totalMatches > 0 ? (
                  <div className="space-y-4">
                    {/* Phrase Matches */}
                    {patterns?.phrase && patterns.phrase.length > 0 && (
                      <div className="space-y-3">
                        {patterns.phrase.map((match, idx) => (
                          <div key={`phrase-${idx}`} className="p-4 rounded-lg bg-[var(--neon-magenta)]/5 border border-[var(--neon-magenta)]/30">
                            <div className="flex items-center gap-2 mb-2">
                              <MatchTypeIcon type="phrase" />
                              <MatchTypeLabel type="phrase" />
                              <span className="text-muted-foreground text-sm">"{match.matchedPhrase}"</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-5">
                              Found in: {match.archive.sourcePhase} ({new Date(match.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                            </p>
                            <p className="text-sm ml-5 mt-1 italic text-foreground/80">"{match.archive.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Emotional Matches */}
                    {patterns?.emotional && patterns.emotional.length > 0 && (
                      <div className="space-y-3">
                        {patterns.emotional.map((match, idx) => (
                          <div key={`emotional-${idx}`} className="p-4 rounded-lg bg-[var(--neon-amber)]/5 border border-[var(--neon-amber)]/30">
                            <div className="flex items-center gap-2 mb-2">
                              <MatchTypeIcon type="emotional" />
                              <MatchTypeLabel type="emotional" />
                              <span className="text-muted-foreground text-sm">{match.archive.emotionalStateTag}</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-5">
                              Last similar: {match.archive.sourcePhase} ({new Date(match.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                            </p>
                            <p className="text-sm ml-5 mt-1 italic text-foreground/80">"{match.archive.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Phase-DNA Matches */}
                    {patterns?.phaseDna && patterns.phaseDna.length > 0 && (
                      <div className="space-y-3">
                        {patterns.phaseDna.map((match, idx) => (
                          <div key={`phase-${idx}`} className="p-4 rounded-lg bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/30">
                            <div className="flex items-center gap-2 mb-2">
                              <MatchTypeIcon type="phase-dna" />
                              <MatchTypeLabel type="phase-dna" />
                              <span className="text-muted-foreground text-sm">{match.archive.phaseDnaTag}</span>
                            </div>
                            <p className="text-xs text-muted-foreground ml-5">
                              Resonance from: {match.archive.sourcePhase} ({new Date(match.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                            </p>
                            <p className="text-sm ml-5 mt-1 italic text-foreground/80">"{match.archive.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="tattoo-line mt-4" />
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      {totalMatches} pattern{totalMatches !== 1 ? 's' : ''} found across the archive
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="neon-text-purple text-sm">Pattern analysis paused</p>
                    <p className="text-xs mt-2 opacity-60">Archive matching will resume in a future update.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Neon's Mirror */}
        {showSection3 && (
          <div className="cascade-reveal" style={{ animationDelay: '0.4s' }}>
            <div className="neon-mirror-container rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/10 via-[var(--neon-purple)]/5 to-[var(--neon-magenta)]/10 pointer-events-none" />
              <div className="p-6 relative">
                <div className="flex items-center gap-2 mb-6">
                  <MessageSquare className="h-5 w-5" style={{ color: 'var(--neon-cyan)', filter: 'drop-shadow(0 0 8px var(--neon-cyan))' }} />
                  <h2 className="text-lg font-semibold" style={{ background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none' }}>
                    Neon's Mirror
                  </h2>
                </div>

                {generateReading.isPending || !neonReading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="relative inline-block mb-6">
                        <div className="w-20 h-20 rounded-full neon-breathe" style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))', opacity: 0.3 }} />
                        <Loader2 className="h-10 w-10 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: 'var(--neon-cyan)', filter: 'drop-shadow(0 0 10px var(--neon-cyan))' }} />
                      </div>
                      <p className="text-muted-foreground font-neon-mirror italic">The mirror is focusing...</p>
                    </div>
                  </div>
                ) : (
                  <div className="neon-mirror-reading p-6 rounded-lg">
                    <div className="font-neon-mirror text-lg leading-relaxed space-y-4 neon-mirror-text">
                      <Streamdown>{neonReading}</Streamdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Link href="/">
            <Button className="cyber-button-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/history">
            <Button className="cyber-button-secondary">
              View All History
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 mt-8">
        <div className="container max-w-3xl">
          <div className="tattoo-line" />
        </div>
      </footer>
    </div>
  );
}
