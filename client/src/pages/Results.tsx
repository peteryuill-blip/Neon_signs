import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Calendar, Clock, Zap, Activity, Footprints, Heart, Sparkles, Archive, MessageSquare } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";
import { Streamdown } from "streamdown";

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

function MatchTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'phrase':
      return <span className="text-red-400">🔴</span>;
    case 'emotional':
      return <span className="text-orange-400">🟠</span>;
    case 'phase-dna':
      return <span className="text-blue-400">🔵</span>;
    default:
      return null;
  }
}

function MatchTypeLabel({ type }: { type: string }) {
  switch (type) {
    case 'phrase':
      return <span className="text-red-400 font-medium">PHRASE MATCH</span>;
    case 'emotional':
      return <span className="text-orange-400 font-medium">ENERGY PARALLEL</span>;
    case 'phase-dna':
      return <span className="text-blue-400 font-medium">PHASE-DNA DETECTED</span>;
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
      // Section 1: Immediate
      setShowSection1(true);
      
      // Section 2: After 3 seconds
      const timer2 = setTimeout(() => {
        setShowSection2(true);
        // Trigger pattern analysis if not already done
        if (!patterns || (patterns.phrase.length === 0 && patterns.emotional.length === 0 && patterns.phaseDna.length === 0)) {
          analyzePatterns.mutate({ roundupId }, {
            onSuccess: () => {
              refetchPatterns();
            }
          });
        }
      }, 3000);
      
      // Section 3: After 6 seconds
      const timer3 = setTimeout(() => {
        setShowSection3(true);
        // Generate Neon's reading
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin neon-text-cyan" />
          <p className="text-muted-foreground">Loading results...</p>
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
            <p className="text-muted-foreground mb-4">Please sign in to view results.</p>
            <Button onClick={() => window.location.href = getLoginUrl()}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roundup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full border-border/50 bg-card/50">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Roundup Not Found</h2>
            <p className="text-muted-foreground mb-4">This roundup doesn't exist or you don't have access.</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMatches = patterns 
    ? patterns.phrase.length + patterns.emotional.length + patterns.phaseDna.length 
    : 0;

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
              <h1 className="text-lg font-semibold">Week {roundup.weekNumber} Results</h1>
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
            <Card className="border-border/50 bg-card/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 neon-text-cyan" />
                  Intake Confirmed
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-6">
                {/* Weather Report - Large */}
                <div className="p-6 rounded-lg bg-background/50 border border-border/30">
                  <p className="text-sm text-muted-foreground mb-2">Weather Report</p>
                  <p className="text-xl font-neon-mirror italic leading-relaxed">
                    "{roundup.weatherReport}"
                  </p>
                </div>

                {/* Data Points Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Clock className="h-4 w-4" />
                      Studio Hours
                    </div>
                    <p className="text-lg font-semibold">{roundup.studioHours}h</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Activity className="h-4 w-4" />
                      Jester Activity
                    </div>
                    <p className="text-lg font-semibold">{roundup.jesterActivity}/10</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Zap className="h-4 w-4" />
                      Energy
                    </div>
                    <EnergyBadge level={roundup.energyLevel} />
                  </div>

                  <div className="p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Footprints className="h-4 w-4" />
                      Walking Engine
                    </div>
                    <p className="text-lg font-semibold">{roundup.walkingEngineUsed ? 'Yes' : 'No'}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Heart className="h-4 w-4" />
                      Phase-DNA
                    </div>
                    <p className="text-lg font-semibold neon-text-blue">{roundup.phaseDnaAssigned || 'Detecting...'}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-background/30">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                      <Calendar className="h-4 w-4" />
                      Week
                    </div>
                    <p className="text-lg font-semibold">{roundup.weekNumber} of 52</p>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Works Made</p>
                    <p>{roundup.worksMade}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">What Worked</p>
                      <p className="text-green-400">{roundup.thingWorked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">What Resisted</p>
                      <p className="text-red-400">{roundup.thingResisted}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Somatic State</p>
                    <p>{roundup.somaticState}</p>
                  </div>

                  {roundup.doorIntention && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Door Intention</p>
                      <p className="italic">"{roundup.doorIntention}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 2: Pattern Archaeology */}
        {showSection2 && (
          <div className="cascade-reveal" style={{ animationDelay: '0.2s' }}>
            <Card className="border-border/50 bg-card/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-magenta)]/5 to-transparent" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 neon-text-magenta" />
                  Pattern Archaeology
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {patternsLoading || analyzePatterns.isPending ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin neon-text-magenta mr-2" />
                    <span className="text-muted-foreground">Searching archive...</span>
                  </div>
                ) : totalMatches === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No direct matches found in archive.</p>
                    <p className="text-sm mt-1">This may be new territory — the archive will learn from this entry.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Phrase Matches */}
                    {patterns?.phrase && patterns.phrase.length > 0 && (
                      <div className="space-y-3">
                        {patterns.phrase.map((match, idx) => (
                          <div key={`phrase-${idx}`} className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                            <div className="flex items-start gap-2 mb-2">
                              <MatchTypeIcon type="phrase" />
                              <MatchTypeLabel type="phrase" />
                              <span className="text-muted-foreground">"{match.matchedPhrase}"</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                              Found in: {match.archive.sourcePhase} ({new Date(match.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                            </p>
                            <p className="text-sm ml-6 mt-1 italic">"{match.archive.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Emotional Matches */}
                    {patterns?.emotional && patterns.emotional.length > 0 && (
                      <div className="space-y-3">
                        {patterns.emotional.map((match, idx) => (
                          <div key={`emotional-${idx}`} className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                            <div className="flex items-start gap-2 mb-2">
                              <MatchTypeIcon type="emotional" />
                              <MatchTypeLabel type="emotional" />
                              <span className="text-muted-foreground">{match.archive.emotionalStateTag}</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                              Last similar: {match.archive.sourcePhase} ({new Date(match.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                            </p>
                            <p className="text-sm ml-6 mt-1 italic">"{match.archive.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Phase-DNA Matches */}
                    {patterns?.phaseDna && patterns.phaseDna.length > 0 && (
                      <div className="space-y-3">
                        {patterns.phaseDna.map((match, idx) => (
                          <div key={`phase-${idx}`} className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <div className="flex items-start gap-2 mb-2">
                              <MatchTypeIcon type="phase-dna" />
                              <MatchTypeLabel type="phase-dna" />
                              <span className="text-muted-foreground">{match.archive.phaseDnaTag}</span>
                            </div>
                            <p className="text-sm text-muted-foreground ml-6">
                              Resonance from: {match.archive.sourcePhase} ({new Date(match.archive.sourceDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})
                            </p>
                            <p className="text-sm ml-6 mt-1 italic">"{match.archive.content}"</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground text-center pt-2">
                      {totalMatches} pattern{totalMatches !== 1 ? 's' : ''} found across the archive
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 3: Neon's Mirror */}
        {showSection3 && (
          <div className="cascade-reveal" style={{ animationDelay: '0.4s' }}>
            <Card className="border-border/50 bg-card/50 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-blue)]/5 to-[var(--neon-cyan)]/5" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 neon-text-blue" />
                  Neon's Mirror
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {generateReading.isPending || !neonReading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-magenta)] opacity-20 animate-pulse" />
                        <Loader2 className="h-8 w-8 animate-spin neon-text-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-muted-foreground">The mirror is focusing...</p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <div className="p-6 rounded-lg bg-background/30 border border-border/30">
                      <div className="font-neon-mirror text-lg leading-relaxed space-y-4">
                        <Streamdown>{neonReading}</Streamdown>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="outline">
              View All History
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
