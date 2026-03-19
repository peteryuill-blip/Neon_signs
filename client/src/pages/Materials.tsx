import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Layers, Droplets, Wrench, Lock, Pencil } from 'lucide-react';

type MaterialType = 'Surface' | 'Medium' | 'Tool';

// Dynamic field configurations for each material type
const SURFACE_FIELDS = [
  { name: 'reactivityProfile', label: 'Reactivity Profile', options: ['Stable', 'Responsive', 'Volatile', 'Chaotic'] },
  { name: 'edgeBehavior', label: 'Edge Behavior', options: ['Sharp', 'Feathered', 'Blooming', 'Fractured'] },
  { name: 'absorptionCurve', label: 'Absorption Curve', options: ['Immediate', 'Delayed', 'Variable'] },
  { name: 'consistencyPattern', label: 'Consistency Pattern', options: ['Reliable', 'Variable', 'Glitch_Prone'] },
  { name: 'practiceRole', label: 'Practice Role', options: ['Final_Work', 'Exploration', 'Anxiety_Discharge', 'Conditioning'] },
];

const MEDIUM_FIELDS = [
  { name: 'viscosityBand', label: 'Viscosity Band', options: ['Thin', 'Balanced', 'Dense'] },
  { name: 'chromaticForce', label: 'Chromatic Force', options: ['Muted', 'Balanced', 'Aggressive'] },
  { name: 'reactivationTendency', label: 'Reactivation Tendency', options: ['Low', 'Medium', 'High'] },
  { name: 'forgivenessWindow', label: 'Forgiveness Window', options: ['Narrow', 'Medium', 'Wide'] },
  { name: 'dilutionSensitivity', label: 'Dilution Sensitivity', options: ['Low', 'Medium', 'High'] },
  { name: 'sedimentationBehavior', label: 'Sedimentation Behavior', options: ['Stable', 'Variable'] },
];

const TOOL_FIELDS = [
  { name: 'contactMode', label: 'Contact Mode', options: ['Direct', 'Indirect', 'Mediated', 'Mechanical'] },
  { name: 'controlBias', label: 'Control Bias', options: ['Precision', 'Balanced', 'Chaos'] },
  { name: 'repeatability', label: 'Repeatability', options: ['High', 'Medium', 'Low'] },
];

function MaterialForm({ 
  type, 
  onSuccess, 
  onCancel,
  initialData
}: { 
  type: MaterialType; 
  onSuccess: () => void; 
  onCancel: () => void;
  initialData?: any;
}) {
  // Basic fields from Google Sheets
  const [code, setCode] = useState(initialData?.code || '');
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [specs, setSpecs] = useState(initialData?.specs || '');
  const [size, setSize] = useState(initialData?.size || '');
  const [purchaseLocation, setPurchaseLocation] = useState(initialData?.purchaseLocation || '');
  const [cost, setCost] = useState(initialData?.cost || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // Behavioral properties
  const [fields, setFields] = useState<Record<string, string>>(initialData || {});
  
  // Photo upload
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photoUrl || null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const uploadPhotoMutation = trpc.materials.uploadPhoto.useMutation();
  
  const utils = trpc.useUtils();
  const createMutation = trpc.materials.create.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getByType.invalidate();
      onSuccess();
    },
  });
  
  const updateMutation = trpc.materials.update.useMutation({
    onSuccess: () => {
      utils.materials.getAll.invalidate();
      utils.materials.getByType.invalidate();
      onSuccess();
    },
  });
  
  const dynamicFields = type === 'Surface' ? SURFACE_FIELDS : type === 'Medium' ? MEDIUM_FIELDS : TOOL_FIELDS;
  
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsOptimizing(true);
    
    try {
      // Import optimization utility dynamically
      const { optimizeImageForUpload } = await import('@shared/imageOptimization');
      
      // Optimize image
      const optimizedFile = await optimizeImageForUpload(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
      });
      
      setPhoto(optimizedFile);
      
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
    
    const data = {
      materialType: type,
      code: code || undefined,
      displayName,
      brand: brand || undefined,
      specs: specs || undefined,
      size: size || undefined,
      purchaseLocation: purchaseLocation || undefined,
      cost: cost || undefined,
      notes: notes || undefined,
      ...fields,
    };
    
    try {
      let materialId = initialData?.id;
      
      // Create or update material first
      if (initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, ...data });
      } else {
        const result = await createMutation.mutateAsync(data as any);
        materialId = result.id;
      }
      
      // Upload photo if present
      if (photo && materialId) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const photoData = e.target?.result as string;
          await uploadPhotoMutation.mutateAsync({
            materialId,
            photoData,
            fileName: photo.name.replace(/\.[^/.]+$/, ''),
          });
          utils.materials.getAll.invalidate();
          utils.materials.getByType.invalidate();
          onSuccess();
        };
        reader.readAsDataURL(photo);
      } else {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to save material:', error);
    }
  };
  
  const isLoading = createMutation.isPending || updateMutation.isPending;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {/* Basic Info Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Basic Info</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="code" className="text-xs text-gray-400">CODE</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="MB1, MB2..."
              className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9"
            />
          </div>
          
          <div>
            <Label htmlFor="cost" className="text-xs text-gray-400">COST</Label>
            <Input
              id="cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="$25.00"
              className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="displayName" className="text-xs text-cyan-400">ITEM NAME *</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={`e.g., ${type === 'Surface' ? 'Arches 300gsm' : type === 'Medium' ? 'Lamp Black' : 'Size 8 Round'}`}
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="brand" className="text-xs text-gray-400">BRAND</Label>
          <Input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Manufacturer/brand"
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9"
          />
        </div>
        
        <div>
          <Label htmlFor="size" className="text-xs text-gray-400">SIZE</Label>
          <Input
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Physical dimensions"
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9"
          />
        </div>
        
        <div>
          <Label htmlFor="specs" className="text-xs text-gray-400">SPECS</Label>
          <Textarea
            id="specs"
            value={specs}
            onChange={(e) => setSpecs(e.target.value)}
            placeholder="Specifications/description"
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-16"
          />
        </div>
        
        <div>
          <Label htmlFor="purchaseLocation" className="text-xs text-gray-400">PURCHASE LOCATION</Label>
          <Input
            id="purchaseLocation"
            value={purchaseLocation}
            onChange={(e) => setPurchaseLocation(e.target.value)}
            placeholder="Where to buy / link"
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9"
          />
        </div>
        
        <div>
          <Label htmlFor="notes" className="text-xs text-gray-400">NOTES</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes"
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-16"
          />
        </div>
        
        {/* Photo Upload */}
        <div>
          <Label htmlFor="photo" className="text-xs text-gray-400">PHOTO (Optional)</Label>
          <Input
            id="photo"
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={isOptimizing}
            className="mt-1 bg-black/50 border-cyan-500/30 text-sm h-9 file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:bg-cyan-500/20 file:text-cyan-400 file:text-xs hover:file:bg-cyan-500/30"
          />
          {isOptimizing && (
            <p className="text-xs text-cyan-400 mt-1">Optimizing image...</p>
          )}
          {photoPreview && (
            <div className="mt-2">
              <img
                src={photoPreview}
                alt="Material preview"
                className="w-32 h-32 object-cover rounded border border-cyan-500/30"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Behavioral Properties Section */}
      <div className="border-t border-cyan-500/20 pt-4 space-y-3">
        <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">Behavioral Properties</h4>
        <div className="grid grid-cols-1 gap-3">
          {dynamicFields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name} className="text-xs text-gray-400">{field.label.toUpperCase()}</Label>
              <Select
                value={fields[field.name] || ''}
                onValueChange={(value) => setFields({ ...fields, [field.name]: value })}
              >
                <SelectTrigger className="mt-1 bg-black/50 border-cyan-500/30 h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-gray-600"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!displayName || isLoading}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black"
        >
          {isLoading ? 'Saving...' : initialData?.id ? 'Update' : 'Add Material'}
        </Button>
      </div>
    </form>
  );
}

function MaterialCard({ material, onEdit }: { material: any; onEdit: () => void }) {
  const isLocked = material.usedInWorksCount > 0;
  
  const getTypeIcon = () => {
    switch (material.materialType) {
      case 'Surface': return <Layers className="w-4 h-4" />;
      case 'Medium': return <Droplets className="w-4 h-4" />;
      case 'Tool': return <Wrench className="w-4 h-4" />;
    }
  };
  
  const getTypeColor = () => {
    switch (material.materialType) {
      case 'Surface': return 'text-amber-400 border-amber-500/30';
      case 'Medium': return 'text-magenta-400 border-magenta-500/30';
      case 'Tool': return 'text-cyan-400 border-cyan-500/30';
    }
  };

  const getCodeColor = () => {
    switch (material.materialType) {
      case 'Surface': return 'text-amber-400';
      case 'Medium': return 'text-pink-400';
      case 'Tool': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <Card className={`bg-black/40 border ${getTypeColor()} hover:bg-black/60 transition-colors`}>
      <CardContent className="p-4">
        {/* Top row: type icon + edit/lock */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-500">{getTypeIcon()}</span>
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Lock className="w-4 h-4 text-gray-500" />
            ) : (
              <button onClick={onEdit} className="text-gray-400 hover:text-cyan-400">
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Code + Name on same line — code always visible on the left */}
        <div className="flex items-baseline gap-2">
          <span className={`font-mono font-bold text-sm shrink-0 ${getCodeColor()}`}>
            {material.materialId || '—'}
          </span>
          <h3 className="font-medium text-white leading-snug min-w-0">{material.displayName}</h3>
        </div>
        
        {material.notes && (
          <p className="text-sm text-gray-400 mt-1.5 line-clamp-2">{material.notes}</p>
        )}
        
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>Used {material.usedInWorksCount}×</span>
          {material.firstUsedDate && (
            <span>First: {new Date(material.firstUsedDate).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Materials() {
  const [activeTab, setActiveTab] = useState<MaterialType>('Surface');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  
  const { data: materials, isLoading } = trpc.materials.getAll.useQuery();
  
  const surfaces = materials?.filter(m => m.materialType === 'Surface') || [];
  const mediums = materials?.filter(m => m.materialType === 'Medium') || [];
  const tools = materials?.filter(m => m.materialType === 'Tool') || [];
  
  const currentList = activeTab === 'Surface' ? surfaces : activeTab === 'Medium' ? mediums : tools;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white pb-24">
      {/* Header */}
      <header className="border-b border-cyan-500/20 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-cyan-400">Materials Library</h1>
                <p className="text-sm text-gray-500">Surfaces, Mediums, and Tools</p>
              </div>
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-cyan-500/30 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">Add New {activeTab}</DialogTitle>
                </DialogHeader>
                <MaterialForm 
                  type={activeTab} 
                  onSuccess={() => setIsAddOpen(false)}
                  onCancel={() => setIsAddOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-black/40 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <Layers className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-400">{surfaces.length}</div>
              <div className="text-sm text-gray-400">Surfaces</div>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-magenta-500/30">
            <CardContent className="p-4 text-center">
              <Droplets className="w-6 h-6 text-magenta-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-magenta-400">{mediums.length}</div>
              <div className="text-sm text-gray-400">Mediums</div>
            </CardContent>
          </Card>
          <Card className="bg-black/40 border-cyan-500/30">
            <CardContent className="p-4 text-center">
              <Wrench className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-cyan-400">{tools.length}</div>
              <div className="text-sm text-gray-400">Tools</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MaterialType)}>
          <TabsList className="bg-black/50 border border-cyan-500/30 mb-6">
            <TabsTrigger value="Surface" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <Layers className="w-4 h-4 mr-2" />
              Surfaces ({surfaces.length})
            </TabsTrigger>
            <TabsTrigger value="Medium" className="data-[state=active]:bg-magenta-500/20 data-[state=active]:text-magenta-400">
              <Droplets className="w-4 h-4 mr-2" />
              Mediums ({mediums.length})
            </TabsTrigger>
            <TabsTrigger value="Tool" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <Wrench className="w-4 h-4 mr-2" />
              Tools ({tools.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading materials...</div>
            ) : currentList.length === 0 ? (
              <Card className="bg-black/40 border-cyan-500/30">
                <CardContent className="p-12 text-center">
                  <div className="text-gray-500 mb-4">
                    No {activeTab.toLowerCase()}s added yet
                  </div>
                  <Button 
                    onClick={() => setIsAddOpen(true)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First {activeTab}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentList.map((material) => (
                  <MaterialCard 
                    key={material.id} 
                    material={material}
                    onEdit={() => setEditingMaterial(material)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Edit Dialog */}
        <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
          <DialogContent className="bg-gray-900 border-cyan-500/30 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Edit {editingMaterial?.materialType}</DialogTitle>
            </DialogHeader>
            {editingMaterial && (
              <MaterialForm 
                type={editingMaterial.materialType} 
                initialData={editingMaterial}
                onSuccess={() => setEditingMaterial(null)}
                onCancel={() => setEditingMaterial(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
