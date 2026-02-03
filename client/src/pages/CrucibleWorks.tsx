import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Flame, Star, Trash2, HelpCircle, Check, Calendar, Ruler, Clock, Download } from 'lucide-react';

const RATING_LABELS: Record<number, string> = {
  1: 'Somatic Drill',
  2: 'Glitch Harvest',
  3: 'Stable Execution',
  4: 'Signal Detected',
  5: 'Breakthrough',
};

const DISPOSITION_CONFIG = {
  Trash: { icon: Trash2, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  Probably_Trash: { icon: HelpCircle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  Save_Archive: { icon: Check, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
  Save_Has_Potential: { icon: Star, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
};

export default function CrucibleWorks() {
  const [dispositionFilter, setDispositionFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  
  const { data: works, isLoading } = trpc.works.getAll.useQuery({ limit: 100 });
  const { refetch: fetchExportData } = trpc.works.exportCSV.useQuery(undefined, { enabled: false });
  
  const handleExportCSV = async () => {
    try {
      const { data } = await fetchExportData();
      if (!data) return;
      
      // Convert to CSV
      const headers = ['Code', 'Date', 'Rating', 'Disposition', 'Surfaces', 'Mediums', 'Tools', 'Technical Intent', 'Discovery', 'Height (cm)', 'Width (cm)', 'Hours'];
      const rows = data.map(work => [
        work.code,
        new Date(work.date).toISOString().split('T')[0],
        work.rating || '',
        work.disposition.replace(/_/g, ' '),
        work.surfaces,
        work.mediums,
        work.tools,
        work.technicalIntent || '',
        work.discovery || '',
        work.heightCm || '',
        work.widthCm || '',
        work.hours || '',
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `crucible-works-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };
  
  // Filter works
  const filteredWorks = works?.filter(work => {
    if (dispositionFilter !== 'all' && work.disposition !== dispositionFilter) return false;
    if (ratingFilter !== 'all' && work.rating !== parseInt(ratingFilter)) return false;
    return true;
  }) || [];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-magenta-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-magenta-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-magenta-400">Crucible Works</h1>
                <p className="text-sm text-gray-500">Browse all material trials</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{filteredWorks.length}</div>
                <div className="text-sm text-gray-500">trials</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Filters */}
      <div className="container py-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-gray-400 mb-2 block">Disposition</label>
            <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
              <SelectTrigger className="bg-black/50 border-purple-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Save_Has_Potential">Save - Has Potential</SelectItem>
                <SelectItem value="Save_Archive">Save - Archive</SelectItem>
                <SelectItem value="Probably_Trash">Probably Trash</SelectItem>
                <SelectItem value="Trash">Trash</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-gray-400 mb-2 block">Rating</label>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="bg-black/50 border-purple-500/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 - Breakthrough</SelectItem>
                <SelectItem value="4">4 - Signal Detected</SelectItem>
                <SelectItem value="3">3 - Stable Execution</SelectItem>
                <SelectItem value="2">2 - Glitch Harvest</SelectItem>
                <SelectItem value="1">1 - Somatic Drill</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Works Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading trials...</div>
        ) : filteredWorks.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No trials found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorks.map((work) => {
              const DispositionIcon = DISPOSITION_CONFIG[work.disposition].icon;
              const dispositionColor = DISPOSITION_CONFIG[work.disposition].color;
              const dispositionBg = DISPOSITION_CONFIG[work.disposition].bgColor;
              
              return (
                <Link key={work.id} href={`/crucible/work/${work.id}`}>
                  <Card className="bg-black/40 border-purple-500/30 hover:border-magenta-400/50 transition-all cursor-pointer group">
                    <CardContent className="p-0">
                      {/* Photo */}
                      {(work.photoThumbnail || work.photoUrl) ? (
                        <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
                          <img 
                            src={work.photoThumbnail || work.photoUrl || ''} 
                            alt={work.code}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gradient-to-br from-purple-900/20 to-black rounded-t-lg flex items-center justify-center">
                          <Flame className="w-12 h-12 text-purple-500/30" />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-mono text-cyan-400 font-bold">{work.code}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(work.date).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className={`p-2 rounded-lg ${dispositionBg}`}>
                            <DispositionIcon className={`w-4 h-4 ${dispositionColor}`} />
                          </div>
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i <= work.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">{RATING_LABELS[work.rating]}</span>
                        </div>
                        
                        {/* Size & Hours */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {work.heightCm && work.widthCm && (
                            <div className="flex items-center gap-1">
                              <Ruler className="w-3 h-3" />
                              {work.heightCm}×{work.widthCm}cm
                            </div>
                          )}
                          {work.hours && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {work.hours}h
                            </div>
                          )}
                        </div>
                        
                        {/* Technical Intent Preview */}
                        {work.technicalIntent && (
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {work.technicalIntent}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
