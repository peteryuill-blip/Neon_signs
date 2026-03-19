import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Flame, Star, Trash2, HelpCircle, Check, Calendar, Ruler, Clock, Download, X, Sparkles } from 'lucide-react';

const RATING_LABELS: Record<number, string> = {
  1: 'Material Test',
  2: 'Glitch Harvest',
  3: 'Stable Execution',
  4: 'Signal Detected',
  5: 'Breakthrough',
};

const DISPOSITION_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  Trash: { icon: Trash2, color: 'text-[var(--status-trash)]', bgColor: 'bg-[var(--status-trash)]/10' },
  Probably_Trash: { icon: HelpCircle, color: 'text-[var(--status-probably-trash)]', bgColor: 'bg-[var(--status-probably-trash)]/10' },
  Save_Archive: { icon: Check, color: 'text-[var(--status-save)]', bgColor: 'bg-[var(--status-save)]/10' },
  Save_Has_Potential: { icon: Star, color: 'text-[var(--status-potential)]', bgColor: 'bg-[var(--status-potential)]/10' },
};

export default function CrucibleWorks() {
  const [dispositionFilter, setDispositionFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [lightboxWork, setLightboxWork] = useState<any>(null);
  
  const { data: works, isLoading } = trpc.works.getAll.useQuery({ limit: 100 });
  const { data: surfaces } = trpc.materials.getByType.useQuery({ type: 'Surface' });
  const { refetch: fetchExportData } = trpc.works.exportCSV.useQuery(undefined, { enabled: false });
  
  const handleExportCSV = async () => {
    try {
      const { data } = await fetchExportData();
      if (!data) return;
      
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
  
  const filteredWorks = works?.filter(work => {
    if (dispositionFilter !== 'all' && work.disposition !== dispositionFilter) return false;
    if (ratingFilter !== 'all' && work.rating !== parseInt(ratingFilter)) return false;
    if (surfaceFilter !== 'all') {
      const surfaceId = parseInt(surfaceFilter);
      const workSurfaceIds = (work as any).surfaceIds as number[] | undefined;
      if (!workSurfaceIds || !workSurfaceIds.includes(surfaceId)) return false;
    }
    return true;
  }) || [];

  const hasDiscovery = (work: any) => work.discovery && work.discovery.trim().length > 0;
  
  return (
    <div className="min-h-screen bg-[var(--void-black)] text-white pb-24">
      {/* Header */}
      <header className="border-b border-[var(--border-default)] bg-[var(--near-black)]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-[var(--text-muted)] hover:text-[var(--neon-magenta)]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[var(--neon-magenta)]">Crucible Works</h1>
                <p className="text-sm text-[var(--text-muted)]">Browse all material trials</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="text-right">
                <div className="text-2xl font-bold data-code text-[var(--neon-cyan)]">{filteredWorks.length}</div>
                <div className="text-xs text-[var(--text-muted)]">trials</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Filters */}
      <div className="container py-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[160px]">
            <label className="text-sm text-[var(--text-muted)] mb-2 block">Disposition</label>
            <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
              <SelectTrigger className="bg-[var(--void-black)] border-[var(--border-interactive)]">
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
          
          <div className="flex-1 min-w-[160px]">
            <label className="text-sm text-[var(--text-muted)] mb-2 block">Surface</label>
            <Select value={surfaceFilter} onValueChange={setSurfaceFilter}>
              <SelectTrigger className="bg-[var(--void-black)] border-[var(--border-interactive)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Surfaces</SelectItem>
                {surfaces?.sort((a, b) => {
                  const aNum = parseInt((a.code || '').replace(/\D/g, '')) || 0;
                  const bNum = parseInt((b.code || '').replace(/\D/g, '')) || 0;
                  return aNum - bNum;
                }).map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.code ? `${s.code} – ${s.displayName}` : s.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="text-sm text-[var(--text-muted)] mb-2 block">Rating</label>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="bg-[var(--void-black)] border-[var(--border-interactive)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 - Breakthrough</SelectItem>
                <SelectItem value="4">4 - Signal Detected</SelectItem>
                <SelectItem value="3">3 - Stable Execution</SelectItem>
                <SelectItem value="2">2 - Glitch Harvest</SelectItem>
                <SelectItem value="1">1 - Material Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Works Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-[var(--text-muted)]">Loading trials...</div>
        ) : filteredWorks.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="w-12 h-12 text-[var(--text-dim)] mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">No trials found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredWorks.map((work) => {
              const config = DISPOSITION_CONFIG[work.disposition] || DISPOSITION_CONFIG.Trash;
              const DispositionIcon = config.icon;
              const discovery = hasDiscovery(work);
              
              return (
                <div key={work.id} className="relative">
                  {/* Gallery card - click photo for lightbox, click info for detail */}
                  <div 
                    className={`cyber-card-interactive rounded-lg overflow-hidden ${discovery ? 'cyber-card-signal' : ''}`}
                  >
                    {/* Photo - opens lightbox */}
                    <div 
                      className="aspect-square overflow-hidden cursor-pointer"
                      onClick={() => setLightboxWork(work)}
                    >
                      {(work.photoThumbnail || work.photoUrl) ? (
                        <img 
                          src={work.photoThumbnail || work.photoUrl || ''} 
                          alt={work.code}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--neon-purple)]/10 to-[var(--void-black)] flex items-center justify-center">
                          <Flame className="w-8 h-8 text-[var(--neon-purple)]/30" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info overlay */}
                    <Link href={`/crucible/work/${work.id}`}>
                      <div className="p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="data-code text-[var(--neon-cyan)] font-bold text-sm">{work.code}</span>
                          <div className={`p-1 rounded ${config.bgColor}`}>
                            <DispositionIcon className={`w-3.5 h-3.5 ${config.color}`} />
                          </div>
                        </div>
                        
                        {/* Rating stars */}
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i <= work.rating
                                  ? 'fill-[var(--neon-amber)] text-[var(--neon-amber)]'
                                  : 'text-[var(--text-dim)]'
                              }`}
                            />
                          ))}
                        </div>
                        
                        {/* Meta row */}
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                          {work.heightCm && work.widthCm && (
                            <span className="data-code">{work.heightCm}×{work.widthCm}</span>
                          )}
                          {work.hours && (
                            <span className="data-code">{work.hours}h</span>
                          )}
                          {discovery && (
                            <Sparkles className="w-3 h-3 text-[var(--neon-amber)]" />
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxWork && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxWork(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white z-10"
            onClick={() => setLightboxWork(null)}
          >
            <X className="w-8 h-8" />
          </button>
          
          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            {(lightboxWork.photoUrl || lightboxWork.photoThumbnail) ? (
              <img 
                src={lightboxWork.photoUrl || lightboxWork.photoThumbnail} 
                alt={lightboxWork.code}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-[var(--near-black)] rounded-lg flex items-center justify-center">
                <Flame className="w-16 h-16 text-[var(--neon-purple)]/30" />
              </div>
            )}
            
            {/* Info bar */}
            <div className="bg-[var(--near-black)] rounded-lg p-4 w-full max-w-lg border border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-2">
                <span className="data-code text-[var(--neon-cyan)] font-bold text-lg">{lightboxWork.code}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i: number) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i <= lightboxWork.rating
                          ? 'fill-[var(--neon-amber)] text-[var(--neon-amber)]'
                          : 'text-[var(--text-dim)]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <span>{new Date(lightboxWork.date).toLocaleDateString()}</span>
                <span className="data-code">{RATING_LABELS[lightboxWork.rating]}</span>
                {lightboxWork.heightCm && lightboxWork.widthCm && (
                  <span className="data-code">{lightboxWork.heightCm}×{lightboxWork.widthCm}cm</span>
                )}
                {lightboxWork.hours && <span className="data-code">{lightboxWork.hours}h</span>}
              </div>
              {lightboxWork.technicalIntent && (
                <p className="text-sm text-[var(--text-soft)] mt-2">{lightboxWork.technicalIntent}</p>
              )}
              {hasDiscovery(lightboxWork) && (
                <div className="mt-2 p-2 rounded bg-[var(--neon-amber)]/5 border-l-2 border-[var(--neon-amber)]">
                  <div className="flex items-center gap-1 text-xs text-[var(--neon-amber)] mb-1">
                    <Sparkles className="w-3 h-3" />
                    Discovery
                  </div>
                  <p className="text-sm text-[var(--text-soft)]">{lightboxWork.discovery}</p>
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Link href={`/crucible/work/${lightboxWork.id}`}>
                  <Button size="sm" variant="outline" className="border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10">
                    View Full Detail
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
