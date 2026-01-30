import { Link, useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Star, Trash2, HelpCircle, Check, Calendar, Ruler, Clock, Edit, Layers, Droplets, Wrench } from 'lucide-react';

const RATING_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Somatic Drill', description: 'Pure motor practice, no insight expected' },
  2: { label: 'Glitch Harvest', description: 'Failure with observable data' },
  3: { label: 'Stable Execution', description: 'Expected outcome, no surprise' },
  4: { label: 'Signal Detected', description: 'Something new emerged' },
  5: { label: 'Breakthrough', description: 'Paradigm shift moment' },
};

const DISPOSITION_CONFIG = {
  Trash: { icon: Trash2, color: 'text-gray-500', label: 'Trash' },
  Probably_Trash: { icon: HelpCircle, color: 'text-amber-500', label: 'Probably Trash' },
  Save: { icon: Check, color: 'text-cyan-400', label: 'Save' },
};

export default function WorkDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const workId = parseInt(params.id || '0');
  
  const { data: work, isLoading } = trpc.works.get.useQuery({ id: workId });
  const { data: surfaces } = trpc.works.getSurfaces.useQuery({ workId });
  const { data: mediums } = trpc.works.getMediums.useQuery({ workId });
  const { data: tools } = trpc.works.getTools.useQuery({ workId });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-gray-500">Loading trial...</div>
      </div>
    );
  }
  
  if (!work) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Trial not found</p>
          <Link href="/crucible/works">
            <Button variant="outline">Back to Works</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const DispositionIcon = DISPOSITION_CONFIG[work.disposition].icon;
  const dispositionColor = DISPOSITION_CONFIG[work.disposition].color;
  const ratingInfo = RATING_LABELS[work.rating];
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-magenta-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/crucible/works">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-magenta-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  All Works
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-magenta-400 font-mono">{work.code}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(work.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => navigate(`/crucible/work/${work.id}/edit`)}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Trial
            </Button>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Photo */}
          {work.photoUrl && (
            <Card className="bg-black/40 border-purple-500/30 overflow-hidden">
              <img 
                src={work.photoUrl} 
                alt={work.code}
                className="w-full max-h-[600px] object-contain bg-black"
              />
            </Card>
          )}
          
          {/* Rating & Disposition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-black/40 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400 text-lg">Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i <= work.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-600'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-lg font-bold text-white">{ratingInfo.label}</div>
                <div className="text-sm text-gray-400">{ratingInfo.description}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-black/40 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-lg">Disposition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <DispositionIcon className={`w-8 h-8 ${dispositionColor}`} />
                  <div className="text-lg font-bold text-white">
                    {DISPOSITION_CONFIG[work.disposition].label}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Size & Hours */}
          {(work.heightCm || work.widthCm || work.hours) && (
            <Card className="bg-black/40 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-purple-400 text-lg">Dimensions & Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6">
                  {work.heightCm && work.widthCm && (
                    <div className="flex items-center gap-2">
                      <Ruler className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-sm text-gray-500">Size</div>
                        <div className="text-lg font-bold text-white">
                          {work.heightCm} × {work.widthCm} cm
                        </div>
                      </div>
                    </div>
                  )}
                  {work.hours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-sm text-gray-500">Time Spent</div>
                        <div className="text-lg font-bold text-white">
                          {work.hours} {work.hours === 1 ? 'hour' : 'hours'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Materials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Surfaces */}
            <Card className="bg-black/40 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Surfaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                {surfaces && surfaces.length > 0 ? (
                  <ul className="space-y-2">
                    {surfaces.map((s: any) => (
                      <li key={s.id} className="text-sm">
                        <div className="font-mono text-amber-400">{s.code}</div>
                        <div className="text-gray-400">{s.displayName}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">None</p>
                )}
              </CardContent>
            </Card>
            
            {/* Mediums */}
            <Card className="bg-black/40 border-magenta-500/30">
              <CardHeader>
                <CardTitle className="text-magenta-400 text-sm flex items-center gap-2">
                  <Droplets className="w-4 h-4" />
                  Mediums
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mediums && mediums.length > 0 ? (
                  <ul className="space-y-2">
                    {mediums.map((m: any) => (
                      <li key={m.id} className="text-sm">
                        <div className="font-mono text-magenta-400">{m.code}</div>
                        <div className="text-gray-400">{m.displayName}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">None</p>
                )}
              </CardContent>
            </Card>
            
            {/* Tools */}
            <Card className="bg-black/40 border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tools && tools.length > 0 ? (
                  <ul className="space-y-2">
                    {tools.map((t: any) => (
                      <li key={t.id} className="text-sm">
                        <div className="font-mono text-cyan-400">{t.code}</div>
                        <div className="text-gray-400">{t.displayName}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">None</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Notes */}
          {(work.technicalIntent || work.discovery) && (
            <div className="space-y-6">
              {work.technicalIntent && (
                <Card className="bg-black/40 border-cyan-500/30">
                  <CardHeader>
                    <CardTitle className="text-cyan-400 text-lg">Technical Intent</CardTitle>
                    <p className="text-xs text-gray-500">Pre-action hypothesis</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-wrap">{work.technicalIntent}</p>
                  </CardContent>
                </Card>
              )}
              
              {work.discovery && (
                <Card className="bg-black/40 border-magenta-500/30">
                  <CardHeader>
                    <CardTitle className="text-magenta-400 text-lg">Discovery</CardTitle>
                    <p className="text-xs text-gray-500">Post-action observation</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-wrap">{work.discovery}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
