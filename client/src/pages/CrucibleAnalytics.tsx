import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Flame, Layers, Droplets, Trash2, Lightbulb, TrendingUp, BarChart3, Star, Clock, Ruler } from 'lucide-react';

export default function CrucibleAnalytics() {
  const { data: summary, isLoading: summaryLoading } = trpc.crucibleAnalytics.summary.useQuery();
  const { data: materialUsage } = trpc.crucibleAnalytics.materialUsage.useQuery();
  const { data: ratingDist } = trpc.crucibleAnalytics.ratingDistribution.useQuery();
  const { data: dispositionBreakdown } = trpc.crucibleAnalytics.dispositionBreakdown.useQuery();
  const { data: dimensionalStats } = trpc.crucibleAnalytics.dimensionalStats.useQuery();
  const { data: timeInvestment } = trpc.crucibleAnalytics.timeInvestment.useQuery();
  
  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-24">
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
                <p className="text-sm text-gray-500">Comprehensive material trial insights</p>
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
              <Trash2 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-400">
                {typeof summary?.trashRate === 'number' ? summary.trashRate.toFixed(0) : '0'}%
              </div>
              <div className="text-sm text-gray-400">Trash Rate</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Rating Distribution */}
        <Card className="bg-black/40 border-yellow-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center gap-2">
              <Star className="w-5 h-5" />
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((rating) => {
                const ratingData = ratingDist?.find((r) => r.rating === rating);
                const count = ratingData?.count || 0;
                const total = ratingDist?.reduce((sum, r) => sum + (r.count || 0), 0) || 1;
                const percentage = ((count / total) * 100).toFixed(0);
                
                return (
                  <div key={rating} className="text-center">
                    <div className="flex justify-center mb-2">
                      {Array.from({ length: rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{count}</div>
                    <div className="text-xs text-gray-500">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Disposition Breakdown */}
        <Card className="bg-black/40 border-purple-500/30 mb-6">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Disposition Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dispositionBreakdown?.map((item) => {
                const total = dispositionBreakdown.reduce((sum, d) => sum + (d.count || 0), 0);
                const percentage = ((item.count / total) * 100).toFixed(1);
                const label = item.disposition.replace(/_/g, ' - ');
                
                return (
                  <div key={item.disposition} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-400">{label}</div>
                    <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-end pr-2"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.count}</span>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-gray-500 text-right">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Material Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Surfaces */}
          <Card className="bg-black/40 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-amber-400 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Surface Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {materialUsage?.surfaceUsage.slice(0, 10).map((surface) => (
                  <div key={surface.materialId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">{surface.code}</span>
                    <span className="text-amber-400 font-bold">{surface.usageCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Mediums */}
          <Card className="bg-black/40 border-magenta-500/30">
            <CardHeader>
              <CardTitle className="text-magenta-400 flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                Medium Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {materialUsage?.mediumUsage.slice(0, 10).map((medium) => (
                  <div key={medium.materialId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">{medium.code}</span>
                    <span className="text-magenta-400 font-bold">{medium.usageCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Tools */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Tool Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {materialUsage?.toolUsage.slice(0, 10).map((tool) => (
                  <div key={tool.materialId} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">{tool.code}</span>
                    <span className="text-cyan-400 font-bold">{tool.usageCount}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Dimensional & Time Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Dimensional Stats */}
          <Card className="bg-black/40 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Dimensional Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Avg Height</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {dimensionalStats?.avgHeight ? dimensionalStats.avgHeight.toFixed(1) : '—'} cm
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Avg Width</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {dimensionalStats?.avgWidth ? dimensionalStats.avgWidth.toFixed(1) : '—'} cm
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Min Size</div>
                  <div className="text-lg font-bold text-gray-300">
                    {dimensionalStats?.minHeight ? `${dimensionalStats.minHeight.toFixed(0)}×${dimensionalStats.minWidth?.toFixed(0)}` : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Max Size</div>
                  <div className="text-lg font-bold text-gray-300">
                    {dimensionalStats?.maxHeight ? `${dimensionalStats.maxHeight.toFixed(0)}×${dimensionalStats.maxWidth?.toFixed(0)}` : '—'}
                  </div>
                </div>
                <div className="col-span-2 text-center mt-2">
                  <div className="text-sm text-gray-400 mb-1">Total Area</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {dimensionalStats?.totalArea ? (dimensionalStats.totalArea / 10000).toFixed(2) : '—'} m²
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Time Investment */}
          <Card className="bg-black/40 border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Time Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Total Hours</div>
                  <div className="text-2xl font-bold text-green-400">
                    {timeInvestment?.totalHours ? timeInvestment.totalHours.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Avg Hours</div>
                  <div className="text-2xl font-bold text-green-400">
                    {timeInvestment?.avgHours ? timeInvestment.avgHours.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Min Hours</div>
                  <div className="text-lg font-bold text-gray-300">
                    {timeInvestment?.minHours ? timeInvestment.minHours.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Max Hours</div>
                  <div className="text-lg font-bold text-gray-300">
                    {timeInvestment?.maxHours ? timeInvestment.maxHours.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="col-span-2 text-center mt-2">
                  <div className="text-xs text-gray-500">
                    {timeInvestment?.worksWithHours || 0} works have time data
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Discovery Insights */}
        <Card className="bg-black/40 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-300">
              <p>• Discovery Density: <span className="text-cyan-400 font-bold">{typeof summary?.discoveryDensity === 'number' ? summary.discoveryDensity.toFixed(1) : '0.0'}%</span> of works have discovery notes</p>
              <p>• Trash Rate indicates experimentation velocity - higher rate suggests rapid iteration</p>
              <p>• Material usage shows which surfaces, mediums, and tools are most frequently tested</p>
              <p>• Rating distribution reveals quality patterns across all trials</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
