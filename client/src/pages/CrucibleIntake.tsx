import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Flame, Star, Trash2, HelpCircle, Check, Upload, ChevronDown, ChevronUp, Ruler, Clock } from 'lucide-react';
import { naturalSortByCode } from '@shared/naturalSort';

// Rating descriptions
const RATING_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Material Test', description: 'Pure motor practice, no insight expected' },
  2: { label: 'Glitch Harvest', description: 'Failure with observable data' },
  3: { label: 'Stable Execution', description: 'Expected outcome, no surprise' },
  4: { label: 'Signal Detected', description: 'Something new emerged' },
  5: { label: 'Breakthrough', description: 'Reserve for genuine breakthrough moments' },
};

const DISPOSITION_OPTIONS = [
  { value: 'Trash', label: 'Trash', icon: Trash2, color: 'text-red-500', borderColor: 'border-red-500' },
  { value: 'Probably_Trash', label: 'Probably Trash', icon: HelpCircle, color: 'text-amber-500', borderColor: 'border-amber-500' },
  { value: 'Save_Archive', label: 'Save - Archive', icon: Check, color: 'text-emerald-400', borderColor: 'border-emerald-400' },
  { value: 'Save_Has_Potential', label: 'Has Potential', icon: Star, color: 'text-yellow-400', borderColor: 'border-yellow-400' },
];

// Hours quick-select options
const HOURS_PRESETS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

// Auto-disposition from rating
function getAutoDisposition(rating: number): 'Trash' | 'Probably_Trash' | 'Save_Archive' | 'Save_Has_Potential' {
  if (rating <= 2) return 'Probably_Trash';
  if (rating === 3) return 'Save_Archive';
  return 'Save_Archive'; // 4-5 also default to Save_Archive
}

export default function CrucibleIntake() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [surfaceIds, setSurfaceIds] = useState<number[]>([]);
  const [mediumIds, setMediumIds] = useState<number[]>([]);
  const [toolIds, setToolIds] = useState<number[]>([]);
  const [technicalIntent, setTechnicalIntent] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [rating, setRating] = useState<number | null>(null); // No default rating
  const [disposition, setDisposition] = useState<'Trash' | 'Probably_Trash' | 'Save_Archive' | 'Save_Has_Potential' | null>(null);
  const [dispositionManuallySet, setDispositionManuallySet] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Date and size
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [heightCm, setHeightCm] = useState<string>('');
  const [widthCm, setWidthCm] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  
  // Collapsed sections
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  // Track if defaults have been applied
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  
  const uploadPhotoMutation = trpc.works.uploadPhoto.useMutation();
  
  // Fetch materials
  const { data: surfacesRaw } = trpc.materials.getByType.useQuery({ type: 'Surface' });
  const { data: mediumsRaw } = trpc.materials.getByType.useQuery({ type: 'Medium' });
  const { data: toolsRaw } = trpc.materials.getByType.useQuery({ type: 'Tool' });
  
  const surfaces = surfacesRaw ? naturalSortByCode(surfacesRaw) : [];
  const mediums = mediumsRaw ? naturalSortByCode(mediumsRaw) : [];
  const tools = toolsRaw ? naturalSortByCode(toolsRaw) : [];
  
  const { data: nextCodeData } = trpc.works.getNextCode.useQuery();
  const { data: lastDefaults } = trpc.works.lastTrialDefaults.useQuery();
  const { data: commonDims } = trpc.works.commonDimensions.useQuery();
  
  const createMutation = trpc.works.create.useMutation();
  
  // Apply smart defaults from last trial
  useEffect(() => {
    if (lastDefaults && !defaultsApplied) {
      setSurfaceIds(lastDefaults.surfaceIds);
      setMediumIds(lastDefaults.mediumIds);
      setToolIds(lastDefaults.toolIds);
      setDefaultsApplied(true);
    }
  }, [lastDefaults, defaultsApplied]);
  
  // Auto-disposition from rating (only if user hasn't manually set disposition)
  useEffect(() => {
    if (rating !== null && !dispositionManuallySet) {
      setDisposition(getAutoDisposition(rating));
    }
  }, [rating, dispositionManuallySet]);
  
  // Build material summary text for collapsed view
  const materialSummary = (() => {
    const parts: string[] = [];
    if (surfaceIds.length > 0) {
      const names = surfaces.filter(s => surfaceIds.includes(s.id)).map(s => s.code || s.materialId);
      parts.push(names.join('+'));
    }
    if (mediumIds.length > 0) {
      const names = mediums.filter(m => mediumIds.includes(m.id)).map(m => m.code || m.materialId);
      parts.push(names.join('+'));
    }
    if (toolIds.length > 0) {
      const names = tools.filter(t => toolIds.includes(t.id)).map(t => t.code || t.materialId);
      parts.push(names.join('+'));
    }
    return parts.join(' · ') || 'No materials selected';
  })();
  
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsOptimizing(true);
    try {
      const { optimizeImageForUpload } = await import('@shared/imageOptimization');
      const optimizedFile = await optimizeImageForUpload(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });
      setPhotoFile(optimizedFile);
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
      setMaterialsExpanded(true);
      return;
    }
    
    if (rating === null) {
      alert('Please select a rating');
      return;
    }
    
    if (disposition === null) {
      alert('Please select a disposition');
      return;
    }
    
    try {
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
        hours: hours ? parseFloat(hours) : undefined,
      });
      
      if (photoFile && work.id) {
        setIsUploading(true);
        try {
          const photoData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(photoFile);
          });
          await uploadPhotoMutation.mutateAsync({
            workId: work.id,
            photoData,
            fileName: photoFile.name.replace(/\.[^/.]+$/, ''),
          });
          setIsUploading(false);
        } catch (error) {
          console.error('Photo upload FAILED:', error);
          alert('Photo upload failed, but work was saved. You can edit later to add the photo.');
          setIsUploading(false);
        }
      }
      
      navigate('/crucible/analytics');
    } catch (error) {
      console.error('Failed to create work:', error);
      alert('Failed to create work. Please try again.');
      setIsUploading(false);
    }
  };
  
  const isSubmitting = createMutation.isPending || isUploading;
  const canSubmit = surfaceIds.length > 0 && mediumIds.length > 0 && rating !== null && !isSubmitting;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-24">
      {/* Header */}
      <header className="border-b border-magenta-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-magenta-400 p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-magenta-400">Crucible Intake</h1>
                <p className="text-xs text-gray-500">target: 45 seconds</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-cyan-400 text-lg">{nextCodeData?.nextCode || 'T_001'}</div>
              <div className="text-xs text-gray-500">{workDate}</div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Form */}
      <main className="container py-4 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* SECTION 1: ESSENTIALS (always visible) */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardContent className="pt-4 space-y-4">
              {/* Photo Upload - front and center */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              {isOptimizing && (
                <div className="text-center py-4 border-2 border-dashed border-cyan-500/30 rounded-lg">
                  <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs text-cyan-400">Optimizing...</p>
                </div>
              )}
              
              {photoPreview && !isOptimizing ? (
                <div className="relative">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : !isOptimizing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-cyan-500/30 rounded-lg hover:border-cyan-400 transition-colors"
                >
                  <Camera className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xs text-gray-400">Tap to capture</div>
                </button>
              )}
              
              {/* Dimensions - quick select + manual */}
              <div>
                <Label className="text-purple-400 text-xs flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  Size (cm)
                </Label>
                
                {/* Dimension presets */}
                {commonDims && commonDims.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                    {commonDims.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setHeightCm(String(d.height));
                          setWidthCm(String(d.width));
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          heightCm === String(d.height) && widthCm === String(d.width)
                            ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                            : 'border-gray-700 text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {d.height}×{d.width}
                        <span className="text-gray-600 ml-1">({d.count}×)</span>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="H"
                    className="bg-black/50 border-purple-500/30 text-white w-20 text-center"
                  />
                  <span className="text-gray-500 text-sm">×</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={widthCm}
                    onChange={(e) => setWidthCm(e.target.value)}
                    placeholder="W"
                    className="bg-black/50 border-purple-500/30 text-white w-20 text-center"
                  />
                  <span className="text-gray-500 text-xs">cm</span>
                </div>
              </div>
              
              {/* Hours - quick select */}
              <div>
                <Label className="text-purple-400 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Hours
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {HOURS_PRESETS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(String(h))}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        hours === String(h)
                          ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={HOURS_PRESETS.includes(Number(hours)) ? '' : hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="other"
                    className="bg-black/50 border-purple-500/30 text-white w-16 text-center text-xs h-7"
                  />
                </div>
              </div>
              
              {/* Rating - no default */}
              <div>
                <Label className="text-magenta-400 text-xs">Rating *</Label>
                <div className="flex gap-1.5 mt-1.5">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRating(r)}
                      className={`flex-1 py-2.5 rounded-lg border transition-all ${
                        rating === r
                          ? 'bg-magenta-500/20 border-magenta-400 text-magenta-400'
                          : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        {r >= 4 ? <Flame className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                        <span className="font-bold text-sm">{r}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {rating !== null && (
                  <div className="text-center mt-1.5">
                    <div className="text-xs font-medium text-magenta-400">{RATING_LABELS[rating].label}</div>
                    <div className="text-[10px] text-gray-500">{RATING_LABELS[rating].description}</div>
                  </div>
                )}
                {rating === null && (
                  <div className="text-center mt-1.5">
                    <div className="text-[10px] text-gray-600">Tap to rate — no default</div>
                  </div>
                )}
              </div>
              
              {/* Disposition - auto-suggested from rating */}
              <div>
                <Label className="text-amber-400 text-xs flex items-center gap-1">
                  Disposition
                  {rating !== null && !dispositionManuallySet && (
                    <span className="text-[10px] text-gray-500 font-normal">(auto from rating)</span>
                  )}
                </Label>
                <div className="flex gap-2 mt-1.5">
                  {DISPOSITION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = disposition === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setDisposition(opt.value as any);
                          setDispositionManuallySet(true);
                        }}
                        className={`flex-1 py-3 rounded-lg border transition-all ${
                          isSelected
                            ? `bg-black/50 ${opt.borderColor} ${opt.color}`
                            : 'bg-black/30 border-gray-700 text-gray-500 hover:border-gray-500'
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-0.5" />
                        <div className="text-[10px] leading-tight">{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* SECTION 2: MATERIALS (collapsed by default) */}
          <Card className="bg-black/40 border-cyan-500/30">
            <button
              type="button"
              onClick={() => setMaterialsExpanded(!materialsExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm font-medium">Materials</span>
                {!materialsExpanded && (
                  <span className="text-xs text-gray-500 truncate max-w-[200px]">
                    {materialSummary}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {surfaceIds.length > 0 && mediumIds.length > 0 && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {materialsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>
            
            {materialsExpanded && (
              <CardContent className="pt-0 space-y-3">
                {/* Surfaces */}
                <div>
                  <Label className="text-amber-400 text-xs">Surfaces *</Label>
                  <div className="mt-1 space-y-1 max-h-36 overflow-y-auto border border-amber-500/20 rounded-lg p-2 bg-black/50">
                    {surfaces.length === 0 ? (
                      <Link href="/materials">
                        <span className="text-xs text-amber-400 hover:underline cursor-pointer">+ Add surfaces first</span>
                      </Link>
                    ) : (
                      surfaces.map((s) => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-cyan-500/10 p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={surfaceIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSurfaceIds([...surfaceIds, s.id]);
                              else setSurfaceIds(surfaceIds.filter(id => id !== s.id));
                            }}
                            className="w-3.5 h-3.5 accent-cyan-400"
                          />
                          <span className="font-mono text-[10px] font-bold text-cyan-400">{s.code || s.materialId}</span>
                          <span className="text-xs">{s.displayName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Mediums */}
                <div>
                  <Label className="text-magenta-400 text-xs">Mediums *</Label>
                  <div className="mt-1 space-y-1 max-h-36 overflow-y-auto border border-magenta-500/20 rounded-lg p-2 bg-black/50">
                    {mediums.length === 0 ? (
                      <Link href="/materials">
                        <span className="text-xs text-magenta-400 hover:underline cursor-pointer">+ Add mediums first</span>
                      </Link>
                    ) : (
                      mediums.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-magenta-500/10 p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={mediumIds.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) setMediumIds([...mediumIds, m.id]);
                              else setMediumIds(mediumIds.filter(id => id !== m.id));
                            }}
                            className="w-3.5 h-3.5 accent-magenta-400"
                          />
                          <span className="font-mono text-[10px] font-bold text-magenta-400">{m.code || m.materialId}</span>
                          <span className="text-xs">{m.displayName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Tools */}
                <div>
                  <Label className="text-cyan-400 text-xs">Tools (optional)</Label>
                  <div className="mt-1 space-y-1 max-h-36 overflow-y-auto border border-cyan-500/20 rounded-lg p-2 bg-black/50">
                    {tools.length === 0 ? (
                      <span className="text-xs text-gray-500">No tools added yet</span>
                    ) : (
                      tools.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-amber-500/10 p-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={toolIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) setToolIds([...toolIds, t.id]);
                              else setToolIds(toolIds.filter(id => id !== t.id));
                            }}
                            className="w-3.5 h-3.5 accent-amber-400"
                          />
                          <span className="font-mono text-[10px] font-bold text-amber-400">{t.code || t.materialId}</span>
                          <span className="text-xs">{t.displayName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* SECTION 3: NOTES (collapsed by default) */}
          <Card className="bg-black/40 border-cyan-500/30">
            <button
              type="button"
              onClick={() => setNotesExpanded(!notesExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm font-medium">Notes</span>
                {!notesExpanded && (technicalIntent || discovery) && (
                  <span className="text-xs text-gray-500 truncate max-w-[200px]">
                    {technicalIntent ? technicalIntent.slice(0, 30) + '...' : discovery?.slice(0, 30) + '...'}
                  </span>
                )}
                {!notesExpanded && !technicalIntent && !discovery && (
                  <span className="text-xs text-gray-600">optional</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(technicalIntent || discovery) && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {notesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>
            
            {notesExpanded && (
              <CardContent className="pt-0 space-y-3">
                <div>
                  <Label className="text-gray-400 text-xs">
                    Technical Intent <span className="text-[10px]">(140 chars)</span>
                  </Label>
                  <Textarea
                    value={technicalIntent}
                    onChange={(e) => setTechnicalIntent(e.target.value.slice(0, 140))}
                    placeholder="What are you testing?"
                    className="mt-1 bg-black/50 border-cyan-500/30 h-16 text-sm"
                    maxLength={140}
                  />
                  <div className="text-[10px] text-gray-600 text-right">{technicalIntent.length}/140</div>
                </div>
                
                <div>
                  <Label className="text-gray-400 text-xs">
                    Discovery <span className="text-[10px]">(280 chars)</span>
                  </Label>
                  <Textarea
                    value={discovery}
                    onChange={(e) => setDiscovery(e.target.value.slice(0, 280))}
                    placeholder="What did you observe?"
                    className="mt-1 bg-black/50 border-cyan-500/30 h-20 text-sm"
                    maxLength={280}
                  />
                  <div className="text-[10px] text-gray-600 text-right">{discovery.length}/280</div>
                </div>
              </CardContent>
            )}
          </Card>
        </form>
      </main>
      
      {/* Sticky Save Button at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            type="submit"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full py-5 text-base bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white disabled:opacity-30"
          >
            {isUploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-pulse" />
                Uploading Photo...
              </>
            ) : isSubmitting ? (
              'Logging Trial...'
            ) : (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Log Trial — {nextCodeData?.nextCode || 'T_001'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
