import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, User, Building2, MapPin, Link2, FileText } from 'lucide-react';

const CITIES = ['Hong Kong', 'Bangkok', 'Singapore', 'Other'] as const;
type City = typeof CITIES[number];

const EMPTY_FORM = {
  name: '',
  role: '',
  organization: '',
  city: '' as City | '',
  howConnected: '',
  notes: '',
};

export default function ContactLog() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const utils = trpc.useUtils();
  const { data: contacts = [], isLoading } = trpc.contacts.getAll.useQuery();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success('Contact saved');
      setForm({ ...EMPTY_FORM });
      utils.contacts.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save contact');
    },
    onSettled: () => setSubmitting(false),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success('Contact deleted');
      utils.contacts.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to delete'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmitting(true);
    createMutation.mutate({
      name: form.name.trim(),
      role: form.role.trim() || undefined,
      organization: form.organization.trim() || undefined,
      city: form.city || undefined,
      howConnected: form.howConnected.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  }

  function update(field: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/more">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-semibold text-base">Contact Log</h1>
        <span className="ml-auto text-xs text-muted-foreground">{contacts.length} contacts</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* Form */}
        <form onSubmit={handleSubmit} className="cyber-card rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-1">Add Contact</h2>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="w-3 h-3" /> Name <span className="text-magenta-400">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Full name"
              className="cyber-input rounded-lg"
              required
            />
          </div>

          {/* Role / Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role / Title</Label>
            <Input
              value={form.role}
              onChange={e => update('role', e.target.value)}
              placeholder="e.g. Gallerist, Curator, Collector"
              className="cyber-input rounded-lg"
            />
          </div>

          {/* Organization */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Organization
            </Label>
            <Input
              value={form.organization}
              onChange={e => update('organization', e.target.value)}
              placeholder="Gallery, institution, company"
              className="cyber-input rounded-lg"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> City
            </Label>
            <Select value={form.city} onValueChange={v => update('city', v)}>
              <SelectTrigger className="cyber-input rounded-lg">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* How Connected */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Link2 className="w-3 h-3" /> How Connected
            </Label>
            <Input
              value={form.howConnected}
              onChange={e => update('howConnected', e.target.value)}
              placeholder="e.g. Met at Art Basel, introduced by X"
              className="cyber-input rounded-lg"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Notes
            </Label>
            <Textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Anything worth remembering"
              className="cyber-input rounded-lg resize-none"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting || !form.name.trim()}
            className="w-full cyber-button rounded-lg"
          >
            {submitting ? 'Saving…' : 'Save Contact'}
          </Button>
        </form>

        {/* List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">All Contacts</h2>

          {isLoading && (
            <div className="text-center text-muted-foreground text-sm py-8">Loading…</div>
          )}

          {!isLoading && contacts.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No contacts yet. Add the first one above.
            </div>
          )}

          {contacts.map(contact => (
            <div key={contact.id} className="cyber-card rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">{contact.name}</p>
                  {(contact.role || contact.organization) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[contact.role, contact.organization].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteMutation.mutate({ id: contact.id })}
                  className="text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  aria-label="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {contact.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{contact.city}
                  </span>
                )}
                {contact.howConnected && (
                  <span className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />{contact.howConnected}
                  </span>
                )}
              </div>

              {contact.notes && (
                <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
                  {contact.notes}
                </p>
              )}

              <p className="text-xs text-muted-foreground/50">
                {new Date(contact.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
