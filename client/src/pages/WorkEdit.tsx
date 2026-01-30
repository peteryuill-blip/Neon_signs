import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Star, Trash2, HelpCircle, Check, Save } from 'lucide-react';
import { toast } from 'sonner';

const RATING_LABELS: Record<number, string> = {
  1: 'Somatic Drill',
  2: 'Glitch Harvest',
  3: 'Stable Execution',
  4: 'Signal Detected',
  5: 'Breakthrough',
};

const DISPOSITION_OPTIONS = [
  { value: 'Trash', label: 'Trash', icon: Trash2, color: 'text-gray-500' },
  { value: 'Probably_Trash', label: 'Probably Trash', icon: HelpCircle, color: 'text-amber-500' },
  { value: 'Save', label: 'Save', icon: Check, color: 'text-cyan-400' },
] as const;

export default function WorkEdit() {
  const params = useParams();
  const [, navigate] = useLocation();
  const workId = parseInt(params.id || '0');
  
  const { data: work, isLoading } = trpc.works.get.useQuery({ id: workId });
  const { data: allSurfaces } = trpc.materials.getByType.useQuery({ type: 'Surface' });
  const { data: allMediums } = trpc.materials.getByType.useQuery({ type: 'Medium' });
  const { data: allTools } = trpc.materials.getByType.useQuery({ type: 'Tool' });
  const { data: currentSurfaces } = trpc.works.getSurfaces.useQuery({ workId });
  const { data: currentMediums } = trpc.works.getMediums.useQuery({ workId });
  const { data: currentTools } = trpc.works.getTools.useQuery({ workId });
  
  const updateMutation = trpc.works.update.useMutation({
    onSuccess: () => {
      toast.success('Trial updated successfully');
      navigate(`/crucible/work/${workId}`);
    },
    onError: (error) => {
      toast.error(`Failed to update trial: ${error.message}`);
    },
  });
  
  const updateMaterialsMutation = trpc.works.updateMaterials.useMutation({
    onSuccess: () => {
      toast.success('Materials updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update materials: ${error.message}`);
    },
  });
  
  // Form state
  const [technicalIntent, setTechnicalIntent] = useState('');
  const [discovery, setDiscovery] = useState('');
  const [rating, setRating] = useState(3);
  const [disposition, setDisposition] = useState<'Trash' | 'Probably_Trash' | 'Save'>('Save');
  const [heightCm, setHeightCm] = useState<number | undefined>();
  const [widthCm, setWidthCm] = useState<number | undefined>();
  const [hours, setHours] = useState<number | undefined>();
  const [selectedSurfaces, setSelectedSurfaces] = useState<number[]>([]);
  const [selectedMediums, setSelectedMediums] = useState<number[]>([]);
  const [selectedTools, setSelectedTools] = useState<number[]>([]);
  
  // Initialize form when work loads
  useEffect(() => {
    if (work) {
      setTechnicalIntent(work.technicalIntent || '');
      setDiscovery(work.discovery || '');
      setRating(work.rating);
      setDisposition(work.disposition);
      setHeightCm(work.heightCm || undefined);
      setWidthCm(work.widthCm || undefined);
      setHours(work.hours || undefined);
    }
  }, [work]);
  
  useEffect(() => {
    if (currentSurfaces) {
      setSelectedSurfaces(currentSurfaces.map((s: any) => s.id));
    }
  }, [currentSurfaces]);
  
  useEffect(() => {
    if (currentMediums) {
      setSelectedMediums(currentMediums.map((m: any) => m.id));
    }
  }, [currentMediums]);
  
  useEffect(() => {
    if (currentTools) {
      setSelectedTools(currentTools.map((t: any) => t.id));
    }
  }, [currentTools]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSurfaces.length === 0) {
      toast.error('Please select at least one surface');
      return;
    }
    
    if (selectedMediums.length === 0) {
      toast.error('Please select at least one medium');
      return;
    }
    
    // Update work details
    await updateMutation.mutateAsync({
      id: workId,
      technicalIntent: technicalIntent || undefined,
      discovery: discovery || undefined,
      rating,
      disposition,
      heightCm: heightCm || undefined,
      widthCm: widthCm || undefined,
      hours: hours || undefined,
    });
    
    // Update materials
    await updateMaterialsMutation.mutateAsync({
      workId,
      surfaceIds: selectedSurfaces,
      mediumIds: selectedMediums,
      toolIds: selectedTools.length > 0 ? selectedTools : undefined,
    });
  };
  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-magenta-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Link href={`/crucible/work/${workId}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-magenta-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-magenta-400">Edit Trial</h1>
              <p className="text-sm text-gray-500 font-mono">{work.code}</p>
            </div>
          </div>
        </div>
      </header>
      
      {/* Form */}
      <main className="container py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date & Size */}
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400">Date & Size</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-400">Height (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={heightCm || ''}
                    onChange={(e) => setHeightCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="bg-black/50 border-purple-500/30"
                    placeholder="Height"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Width (cm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={widthCm || ''}
                    onChange={(e) => setWidthCm(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="bg-black/50 border-purple-500/30"
                    placeholder="Width"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Hours Spent</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={hours || ''}
                    onChange={(e) => setHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="bg-black/50 border-purple-500/30"
                    placeholder="e.g., 2.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Materials */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400">Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Surfaces */}
              <div>
                <Label className="text-amber-400 mb-2 block">Surfaces * (select one or more)</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allSurfaces?.map((surface: any) => (
                    <label key={surface.id} className="flex items-center gap-2 cursor-pointer hover:bg-purple-500/10 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedSurfaces.includes(surface.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSurfaces([...selectedSurfaces, surface.id]);
                          } else {
                            setSelectedSurfaces(selectedSurfaces.filter(id => id !== surface.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        <span className="font-mono text-amber-400">{surface.code}</span> {surface.displayName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Mediums */}
              <div>
                <Label className="text-magenta-400 mb-2 block">Mediums * (select one or more)</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allMediums?.map((medium: any) => (
                    <label key={medium.id} className="flex items-center gap-2 cursor-pointer hover:bg-purple-500/10 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedMediums.includes(medium.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMediums([...selectedMediums, medium.id]);
                          } else {
                            setSelectedMediums(selectedMediums.filter(id => id !== medium.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        <span className="font-mono text-magenta-400">{medium.code}</span> {medium.displayName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Tools */}
              <div>
                <Label className="text-cyan-400 mb-2 block">Tools (optional, select one or more)</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allTools?.map((tool: any) => (
                    <label key={tool.id} className="flex items-center gap-2 cursor-pointer hover:bg-purple-500/10 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTools([...selectedTools, tool.id]);
                          } else {
                            setSelectedTools(selectedTools.filter(id => id !== tool.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        <span className="font-mono text-cyan-400">{tool.code}</span> {tool.displayName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Notes */}
          <Card className="bg-black/40 border-magenta-500/30">
            <CardHeader>
              <CardTitle className="text-magenta-400">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-400">Technical Intent (pre-action hypothesis, 140 chars)</Label>
                <Textarea
                  value={technicalIntent}
                  onChange={(e) => setTechnicalIntent(e.target.value)}
                  maxLength={140}
                  placeholder="What are you testing or trying to achieve?"
                  className="bg-black/50 border-purple-500/30 min-h-[80px]"
                />
                <div className="text-xs text-gray-500 text-right mt-1">{technicalIntent.length}/140</div>
              </div>
              
              <div>
                <Label className="text-gray-400">Discovery (post-action observation, 280 chars)</Label>
                <Textarea
                  value={discovery}
                  onChange={(e) => setDiscovery(e.target.value)}
                  maxLength={280}
                  placeholder="What did you observe? What surprised you?"
                  className="bg-black/50 border-purple-500/30 min-h-[120px]"
                />
                <div className="text-xs text-gray-500 text-right mt-1">{discovery.length}/280</div>
              </div>
            </CardContent>
          </Card>
          
          {/* Rating */}
          <Card className="bg-black/40 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-amber-400">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      rating === r
                        ? 'border-amber-400 bg-amber-400/20'
                        : 'border-purple-500/30 hover:border-amber-400/50'
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 mx-auto mb-2 ${
                        rating === r ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
                      }`}
                    />
                    <div className="text-xs text-gray-400">{r}</div>
                    <div className="text-xs text-gray-500 mt-1">{RATING_LABELS[r]}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Disposition */}
          <Card className="bg-black/40 border-cyan-500/30">
            <CardHeader>
              <CardTitle className="text-cyan-400">Disposition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {DISPOSITION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDisposition(option.value)}
                      className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                        disposition === option.value
                          ? 'border-cyan-400 bg-cyan-400/20'
                          : 'border-purple-500/30 hover:border-cyan-400/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${option.color}`} />
                      <div className="text-sm text-white">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href={`/crucible/work/${workId}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={updateMutation.isPending || updateMaterialsMutation.isPending}
              className="bg-magenta-500/20 hover:bg-magenta-500/30 text-magenta-400 border border-magenta-500/30"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending || updateMaterialsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
