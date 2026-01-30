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
  
  // Form state
  const [surfaceId, setSurfaceId] = useState<number | null>(null);
  const [mediumId, setMediumId] = useState<number | null>(null);
  const [toolId, setToolId] = useState<number | null>(null);
  const [technicalIntent, setTechnicalIntent] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [disposition, setDisposition] = useState<'Trash' | 'Probably_Trash' | 'Save'>('Probably_Trash');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Date and size
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [heightCm, setHeightCm] = useState<string>('');
  const [widthCm, setWidthCm] = useState<string>('');
  
  // Fetch materials
  const { data: surfaces } = trpc.materials.getByType.useQuery({ type: 'Surface' });
  const { data: mediums } = trpc.materials.getByType.useQuery({ type: 'Medium' });
  const { data: tools } = trpc.materials.getByType.useQuery({ type: 'Tool' });
  const { data: nextCodeData } = trpc.works.getNextCode.useQuery();
  
  const createMutation = trpc.works.create.useMutation({
    onSuccess: (data) => {
      navigate(`/crucible/work/${data.id}`);
    },
  });
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!surfaceId || !mediumId) {
      alert('Please select a surface and medium');
      return;
    }
    
    let photoUrl: string | undefined;
    let photoKey: string | undefined;
    
    // Photo upload placeholder - will be implemented with server-side upload
    // For now, photos are not uploaded but the UI is ready
    if (photoFile) {
      // TODO: Implement photo upload via server endpoint
      console.log('Photo selected:', photoFile.name);
    }
    
    createMutation.mutate({
      date: workDate,
      surfaceId,
      mediumId,
      toolId: toolId || undefined,
      technicalIntent: technicalIntent || undefined,
      discovery: discovery || undefined,
      rating,
      disposition,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      widthCm: widthCm ? parseFloat(widthCm) : undefined,
      photoUrl,
      photoKey,
    });
  };
  
  const isSubmitting = createMutation.isPending || isUploading;
  const canSubmit = surfaceId && mediumId && !isSubmitting;
  
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
              {/* Surface */}
              <div>
                <Label className="text-amber-400">Surface *</Label>
                <Select
                  value={surfaceId?.toString() || ''}
                  onValueChange={(v) => setSurfaceId(parseInt(v))}
                >
                  <SelectTrigger className="mt-1 bg-black/50 border-amber-500/30">
                    <SelectValue placeholder="Select surface..." />
                  </SelectTrigger>
                  <SelectContent>
                    {surfaces?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        <span className="font-mono text-xs text-gray-500 mr-2">{s.materialId}</span>
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!surfaces || surfaces.length === 0) && (
                  <Link href="/materials">
                    <span className="text-xs text-amber-400 hover:underline cursor-pointer">
                      + Add surfaces first
                    </span>
                  </Link>
                )}
              </div>
              
              {/* Medium */}
              <div>
                <Label className="text-magenta-400">Medium *</Label>
                <Select
                  value={mediumId?.toString() || ''}
                  onValueChange={(v) => setMediumId(parseInt(v))}
                >
                  <SelectTrigger className="mt-1 bg-black/50 border-magenta-500/30">
                    <SelectValue placeholder="Select medium..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mediums?.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        <span className="font-mono text-xs text-gray-500 mr-2">{m.materialId}</span>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!mediums || mediums.length === 0) && (
                  <Link href="/materials">
                    <span className="text-xs text-magenta-400 hover:underline cursor-pointer">
                      + Add mediums first
                    </span>
                  </Link>
                )}
              </div>
              
              {/* Tool (optional) */}
              <div>
                <Label className="text-cyan-400">Tool (optional)</Label>
                <Select
                  value={toolId?.toString() || 'none'}
                  onValueChange={(v) => setToolId(v === 'none' ? null : parseInt(v))}
                >
                  <SelectTrigger className="mt-1 bg-black/50 border-cyan-500/30">
                    <SelectValue placeholder="Select tool..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tools?.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        <span className="font-mono text-xs text-gray-500 mr-2">{t.materialId}</span>
                        {t.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              
              {photoPreview ? (
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
                  className="w-full py-8 border-2 border-dashed border-cyan-500/30 rounded-lg hover:border-cyan-400 transition-colors"
                >
                  <Camera className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Tap to add photo</div>
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
