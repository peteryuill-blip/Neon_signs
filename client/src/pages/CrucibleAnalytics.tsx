import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Flame, Layers, Droplets, Trash2, Lightbulb, TrendingUp, BarChart3 } from 'lucide-react';

export default function CrucibleAnalytics() {
  const { data: summary, isLoading: summaryLoading } = trpc.crucibleAnalytics.summary.useQuery();
  const { data: velocity } = trpc.crucibleAnalytics.velocitySignal.useQuery();
  const { data: discovery } = trpc.crucibleAnalytics.discoveryDensity.useQuery();
  const { data: pairOutcomes } = trpc.crucibleAnalytics.pairOutcomes.useQuery();
  const { data: lowRatingHighDiscovery } = trpc.crucibleAnalytics.lowRatingHighDiscovery.useQuery();
  
  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-purple-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-purple-400">Crucible Analytics</h1>
                <p className="text-sm text-gray-500">Material trial patterns and insights</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="container py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-black/40 border-cyan-500/30">
            <CardContent className="p-4 text-center">
              <Flame className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-cyan-400">{summary?.totalWorks || 0}</div>
              <div className="text-sm text-gray-400">Total Trials</div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <Layers className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-amber-400">{summary?.totalSurfaces || 0}</div>
              <div className="text-sm text-gray-400">Surfaces</div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border-magenta-500/30">
            <CardContent className="p-4 text-center">
              <Droplets className="w-6 h-6 text-magenta-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-magenta-400">{summary?.totalMediums || 0}</div>
              <div className="text-sm text-gray-400">Mediums</div>
            </CardContent>
          </Card>
          
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-400">{summary?.weeklyAvg?.toFixed(1) || 0}</div>
              <div className="text-sm text-gray-400">Weekly Avg</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Velocity & Discovery Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Trash Rate as Velocity Signal */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Trash Rate (Velocity Signal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-cyan-400">
                  {velocity?.trashRate?.toFixed(0) || 0}%
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {velocity?.trashCount || 0} of {velocity?.totalWorks || 0} trials trashed
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  High trash rate = high velocity experimentation
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-magenta-500 transition-all"
                  style={{ width: `${velocity?.trashRate || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Discovery Density */}
          <Card className="bg-black/40 border-magenta-500/30">
            <CardHeader>
              <CardTitle className="text-magenta-400 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Discovery Density
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-5xl font-bold text-magenta-400">
                  {discovery?.density?.toFixed(0) || 0}%
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {discovery?.withDiscovery || 0} of {discovery?.total || 0} trials have discoveries
                </div>
                <div className="mt-4 text-xs text-gray-500">
                  Percentage of trials with documented insights
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-gradient-to-r from-magenta-500 to-purple-500 transition-all"
                  style={{ width: `${discovery?.density || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Surface-Medium Pair Outcomes */}
        {pairOutcomes && pairOutcomes.length > 0 && (
          <Card className="bg-black/40 border-purple-500/30 mb-8">
            <CardHeader>
              <CardTitle className="text-purple-400 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top Material Combinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pairOutcomes.slice(0, 10).map((pair, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-amber-400">{pair.surfaceName}</span>
                        <span className="text-gray-600">×</span>
                        <span className="text-magenta-400">{pair.mediumName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>{pair.count} trials</span>
                        <span>{pair.trashRate?.toFixed(0)}% trash</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-400">
                        {pair.avgRating?.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">avg rating</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {pairOutcomes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Need at least 2 trials per combination to show patterns
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Low Rating + High Discovery (Glitch Harvests) */}
        {lowRatingHighDiscovery && lowRatingHighDiscovery.length > 0 && (
          <Card className="bg-black/40 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Glitch Harvests
                <span className="text-xs font-normal text-gray-500 ml-2">
                  Low rating, high insight
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowRatingHighDiscovery.slice(0, 5).map((work) => (
                  <div key={work.id} className="border-l-2 border-amber-500/50 pl-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-cyan-400">{work.code}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-amber-400">Rating {work.rating}</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{work.discovery}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(work.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
              
              {lowRatingHighDiscovery.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No glitch harvests yet - keep experimenting!
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Empty State */}
        {(!summary || summary.totalWorks === 0) && (
          <Card className="bg-black/40 border-cyan-500/30">
            <CardContent className="p-12 text-center">
              <Flame className="w-12 h-12 text-cyan-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No trials logged yet</h3>
              <p className="text-gray-500 mb-6">
                Start logging material trials to see patterns emerge
              </p>
              <Link href="/crucible/intake">
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
                  Log Your First Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
