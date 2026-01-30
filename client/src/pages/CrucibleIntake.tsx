import { useState, useRef } from 'react';
import { Link, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Flame, Star, Trash2, HelpCircle, Check, Upload, Calendar, Ruler } from 'lucide-react';
import { naturalSortByCode } from '@shared/naturalSort';
// Photo upload will be handled via server-side tRPC mutation

// Rating descriptions from spec
const RATING_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Somatic Drill', description: 'Pure motor practice, no insight expected' },
  2: { label: 'Glitch Harvest', description: 'Failure with observable data' },
  3: { label: 'Stable Execution', description: 'Expected outcome, no surprise' },
  4: { label: 'Signal Detected', description: 'Something new emerged' },
  5: { label: 'Breakthrough', description: 'Paradigm shift moment' },
};

const DISPOSITION_OPTIONS = [
  { value: 'Trash', label: 'Trash', icon: Trash2, color: 'text-gray-500' },
  { value: 'Probably_Trash', label: 'Probably Trash', icon: HelpCircle, color: 'text-amber-500' },
  { value: 'Save', label: 'Save', icon: Check, color: 'text-cyan-400' },
];

export default function CrucibleIntake() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state - now supports multiple materials
  const [surfaceIds, setSurfaceIds] = useState<number[]>([]);
  const [mediumIds, setMediumIds] = useState<number[]>([]);
  const [toolIds, setToolIds] = useState<number[]>([]);
  const [technicalIntent, setTechnicalIntent] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [disposition, setDisposition] = useState<'Trash' | 'Probably_Trash' | 'Save'>('Probably_Trash');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const uploadPhotoMutation = trpc.works.uploadPhoto.useMutation();
  
  // Date and size
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [heightCm, setHeightCm] = useState<string>('');
  const [widthCm, setWidthCm] = useState<string>('');
  
  // Fetch materials
  const { data: surfacesRaw } = trpc.materials.getByType.useQuery({ type: 'Surface' });
  const { data: mediumsRaw } = trpc.materials.getByType.useQuery({ type: 'Medium' });
  const { data: toolsRaw } = trpc.materials.getByType.useQuery({ type: 'Tool' });
  
  // Sort materials by code (S1, S2, S10 not S1, S10, S2)
  const surfaces = surfacesRaw ? naturalSortByCode(surfacesRaw) : [];
  const mediums = mediumsRaw ? naturalSortByCode(mediumsRaw) : [];
  const tools = toolsRaw ? naturalSortByCode(toolsRaw) : [];
  const { data: nextCodeData } = trpc.works.getNextCode.useQuery();
  
  const createMutation = trpc.works.create.useMutation({
    onSuccess: (data) => {
      navigate(`/crucible/work/${data.id}`);
    },
  });
  
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsOptimizing(true);
    
    try {
      // Import optimization utility dynamically
      const { optimizeImageForUpload } = await import('@shared/imageOptimization');
      
      // Optimize image
      const optimizedFile = await optimizeImageForUpload(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });
      
      setPhotoFile(optimizedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(optimizedFile);
    } catch (error) {
      console.error('Failed to optimize image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (surfaceIds.length === 0 || mediumIds.length === 0) {
      alert('Please select at least one surface and one medium');
      return;
    }
    
    try {
      // Create work first
      const work = await createMutation.mutateAsync({
        date: workDate,
        surfaceIds,
        mediumIds,
        toolIds: toolIds.length > 0 ? toolIds : undefined,
        technicalIntent: technicalIntent || undefined,
        discovery: discovery || undefined,
        rating,
        disposition,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        widthCm: widthCm ? parseFloat(widthCm) : undefined,
      });
      
      // Upload photo if present
      if (photoFile && work.id) {
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
          const photoData = e.target?.result as string;
          await uploadPhotoMutation.mutateAsync({
            workId: work.id,
            photoData,
            fileName: photoFile.name.replace(/\.[^/.]+$/, ''),
          });
          setIsUploading(false);
          navigate(`/crucible/work/${work.id}`);
        };
        reader.readAsDataURL(photoFile);
      } else {
        navigate(`/crucible/work/${work.id}`);
      }
    } catch (error) {
      console.error('Failed to create work:', error);
      setIsUploading(false);
    }
  };
  
  const isSubmitting = createMutation.isPending || isUploading;
  const canSubmit = surfaceIds.length > 0 && mediumIds.length > 0 && !isSubmitting;
  
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
                <h1 className="text-xl font-bold text-magenta-400">Crucible Intake</h1>
                <p className="text-sm text-gray-500">Log a material trial — target: 60 seconds</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">Next Code</div>
              <div className="font-mono text-cyan-400">{nextCodeData?.nextCode || 'T_001'}</div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Form */}
      <main className="container py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date & Size */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-purple-400 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date & Size
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date */}
              <div>
                <Label className="text-purple-400">Date</Label>
                <Input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="mt-1 bg-black/50 border-purple-500/30 text-white"
                />
              </div>
              
              {/* Size */}
              <div>
                <Label className="text-purple-400 flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Size (cm)
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="Height"
                    className="bg-black/50 border-purple-500/30 text-white w-24"
                  />
                  <span className="text-gray-500">×</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                    placeholder="Width"
                    className="bg-black/50 border-purple-500/30 text-white w-24"
                  />
                  <span className="text-gray-500 text-sm">cm</span>
                </div>
                {heightCm && widthCm && (
                  <p className="text-xs text-purple-400 mt-1">
                    {heightCm}cm × {widthCm}cm
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Materials Selection */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-cyan-400 text-lg">Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Surfaces (multi-select) */}
              <div>
                <Label className="text-amber-400">Surfaces * (select one or more)</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-amber-500/30 rounded-lg p-3 bg-black/50">
                  {surfaces.length === 0 ? (
                    <Link href="/materials">
                      <span className="text-xs text-amber-400 hover:underline cursor-pointer">
                        + Add surfaces first
                      </span>
                    </Link>
                  ) : (
                    surfaces.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-cyan-500/10 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={surfaceIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSurfaceIds([...surfaceIds, s.id]);
                            } else {
                              setSurfaceIds(surfaceIds.filter(id => id !== s.id));
                            }
                          }}
                          className="w-4 h-4 accent-cyan-400"
                        />
                        <span className="font-mono text-xs font-bold text-cyan-400">{s.code || s.materialId}</span>
                        <span className="text-sm">{s.displayName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              
              {/* Mediums (multi-select) */}
              <div>
                <Label className="text-magenta-400">Mediums * (select one or more)</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-magenta-500/30 rounded-lg p-3 bg-black/50">
                  {mediums.length === 0 ? (
                    <Link href="/materials">
                      <span className="text-xs text-magenta-400 hover:underline cursor-pointer">
                        + Add mediums first
                      </span>
                    </Link>
                  ) : (
                    mediums.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-magenta-500/10 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={mediumIds.includes(m.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMediumIds([...mediumIds, m.id]);
                            } else {
                              setMediumIds(mediumIds.filter(id => id !== m.id));
                            }
                          }}
                          className="w-4 h-4 accent-magenta-400"
                        />
                        <span className="font-mono text-xs font-bold text-magenta-400">{m.code || m.materialId}</span>
                        <span className="text-sm">{m.displayName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              
              {/* Tools (multi-select, optional) */}
              <div>
                <Label className="text-cyan-400">Tools (optional, select one or more)</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-cyan-500/30 rounded-lg p-3 bg-black/50">
                  {tools.length === 0 ? (
                    <span className="text-xs text-gray-500">No tools added yet</span>
                  ) : (
                    tools.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-amber-500/10 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={toolIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setToolIds([...toolIds, t.id]);
                            } else {
                              setToolIds(toolIds.filter(id => id !== t.id));
                            }
                          }}
                          className="w-4 h-4 accent-amber-400"
                        />
                        <span className="font-mono text-xs font-bold text-amber-400">{t.code || t.materialId}</span>
                        <span className="text-sm">{t.displayName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Intent & Discovery */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-cyan-400 text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-400">
                  Technical Intent <span className="text-xs">(pre-action hypothesis, 140 chars)</span>
                </Label>
                <Textarea
                  value={technicalIntent}
                  onChange={(e) => setTechnicalIntent(e.target.value.slice(0, 140))}
                  placeholder="What are you testing or trying to achieve?"
                  className="mt-1 bg-black/50 border-cyan-500/30 h-20"
                  maxLength={140}
                />
                <div className="text-xs text-gray-500 text-right">{technicalIntent.length}/140</div>
              </div>
              
              <div>
                <Label className="text-gray-400">
                  Discovery <span className="text-xs">(post-action observation, 280 chars)</span>
                </Label>
                <Textarea
                  value={discovery}
                  onChange={(e) => setDiscovery(e.target.value.slice(0, 280))}
                  placeholder="What did you observe? What surprised you?"
                  className="mt-1 bg-black/50 border-cyan-500/30 h-24"
                  maxLength={280}
                />
                <div className="text-xs text-gray-500 text-right">{discovery.length}/280</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Rating */}
          <Card className="bg-black/40 border-magenta-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-magenta-400 text-lg">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`flex-1 py-3 rounded-lg border transition-all ${
                      rating === r
                        ? 'bg-magenta-500/20 border-magenta-400 text-magenta-400'
                        : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {r >= 4 ? <Flame className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      <span className="font-bold">{r}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-magenta-400">{RATING_LABELS[rating].label}</div>
                <div className="text-xs text-gray-500">{RATING_LABELS[rating].description}</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Disposition */}
          <Card className="bg-black/40 border-amber-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-amber-400 text-lg">Disposition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {DISPOSITION_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDisposition(opt.value as any)}
                      className={`flex-1 py-4 rounded-lg border transition-all ${
                        disposition === opt.value
                          ? `bg-black/50 border-current ${opt.color}`
                          : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm">{opt.label}</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Photo Upload */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-cyan-400 text-lg">Photo (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              {isOptimizing && (
                <div className="text-center py-4">
                  <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-cyan-400">Optimizing image...</p>
                </div>
              )}
              
              {photoPreview && !isOptimizing ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded-full hover:bg-black"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isOptimizing}
                  className="w-full py-8 border-2 border-dashed border-cyan-500/30 rounded-lg hover:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Tap to add photo</div>
                  <div className="text-xs text-gray-500 mt-1">Auto-compressed to WebP</div>
                </button>
              )}
            </CardContent>
          </Card>
          
          {/* Submit */}
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-6 text-lg bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white"
          >
            {isUploading ? (
              <>
                <Upload className="w-5 h-5 mr-2 animate-pulse" />
                Uploading Photo...
              </>
            ) : isSubmitting ? (
              'Logging Trial...'
            ) : (
              <>
                <Flame className="w-5 h-5 mr-2" />
                Log Trial
              </>
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
