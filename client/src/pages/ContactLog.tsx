import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Trash2, User, Building2, MapPin, Link2, FileText, Download, Pencil, X, Check, Phone, Instagram, Mail, Search, ArrowUpDown } from 'lucide-react';

const CITIES = ['Hong Kong', 'Bangkok', 'Singapore', 'Other'] as const;
type City = typeof CITIES[number];

interface ContactFormData {
  name: string;
  role: string;
  organization: string;
  city: City | '';
  phone: string;
  instagram: string;
  email: string;
  howConnected: string;
  notes: string;
}

const EMPTY_FORM: ContactFormData = {
  name: '',
  role: '',
  organization: '',
  city: '',
  phone: '',
  instagram: '',
  email: '',
  howConnected: '',
  notes: '',
};

function ContactForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  submitting,
}: {
  initial: ContactFormData;
  onSubmit: (data: ContactFormData) => void;
  onCancel?: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const [form, setForm] = useState<ContactFormData>({ ...initial });

  function update(field: keyof ContactFormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <User className="w-3 h-3" /> Name <span className="text-red-400">*</span>
        </Label>
        <Input value={form.name} onChange={e => update('name', e.target.value)}
          placeholder="Full name" className="cyber-input rounded-lg" required />
      </div>

      {/* Role */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Role / Title</Label>
        <Input value={form.role} onChange={e => update('role', e.target.value)}
          placeholder="e.g. Gallerist, Curator, Collector" className="cyber-input rounded-lg" />
      </div>

      {/* Organization */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3 h-3" /> Organization
        </Label>
        <Input value={form.organization} onChange={e => update('organization', e.target.value)}
          placeholder="Gallery, institution, company" className="cyber-input rounded-lg" />
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
            {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Phone className="w-3 h-3" /> Phone / WhatsApp
        </Label>
        <Input value={form.phone} onChange={e => update('phone', e.target.value)}
          placeholder="+66 81 234 5678" className="cyber-input rounded-lg" type="tel" />
      </div>

      {/* Instagram */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Instagram className="w-3 h-3" /> Instagram
        </Label>
        <Input value={form.instagram} onChange={e => update('instagram', e.target.value)}
          placeholder="@handle" className="cyber-input rounded-lg" />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Mail className="w-3 h-3" /> Email
        </Label>
        <Input value={form.email} onChange={e => update('email', e.target.value)}
          placeholder="name@example.com" className="cyber-input rounded-lg" type="email" />
      </div>

      {/* How Connected */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Link2 className="w-3 h-3" /> How Connected
        </Label>
        <Input value={form.howConnected} onChange={e => update('howConnected', e.target.value)}
          placeholder="e.g. Met at Art Basel, introduced by X" className="cyber-input rounded-lg" />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Notes
        </Label>
        <Textarea value={form.notes} onChange={e => update('notes', e.target.value)}
          placeholder="Anything worth remembering" className="cyber-input rounded-lg resize-none" rows={3} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || !form.name.trim()} className="flex-1 cyber-button rounded-lg">
          {submitting ? 'Saving…' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-lg px-4">
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function ContactCard({ contact, onDeleted, onUpdated }: {
  contact: any;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateMutation = trpc.contacts.update.useMutation({
    onSuccess: () => { toast.success('Contact updated'); setEditing(false); onUpdated(); },
    onError: (err) => toast.error(err.message || 'Failed to update'),
    onSettled: () => setSaving(false),
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => { toast.success('Contact deleted'); onDeleted(); },
    onError: (err) => toast.error(err.message || 'Failed to delete'),
  });

  function handleUpdate(data: ContactFormData) {
    setSaving(true);
    updateMutation.mutate({
      id: contact.id,
      name: data.name.trim(),
      role: data.role.trim() || null,
      organization: data.organization.trim() || null,
      city: data.city || null,
      phone: data.phone.trim() || null,
      instagram: data.instagram.trim() || null,
      email: data.email.trim() || null,
      howConnected: data.howConnected.trim() || null,
      notes: data.notes.trim() || null,
    });
  }

  const initial: ContactFormData = {
    name: contact.name ?? '',
    role: contact.role ?? '',
    organization: contact.organization ?? '',
    city: (contact.city as City | '') ?? '',
    phone: contact.phone ?? '',
    instagram: contact.instagram ?? '',
    email: contact.email ?? '',
    howConnected: contact.howConnected ?? '',
    notes: contact.notes ?? '',
  };

  if (editing) {
    return (
      <div className="cyber-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Editing</span>
          <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ContactForm
          initial={initial}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Save Changes"
          submitting={saving}
        />
      </div>
    );
  }

  return (
    <div className="cyber-card rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">{contact.name}</p>
          {(contact.role || contact.organization) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[contact.role, contact.organization].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-cyan-400 transition-colors" aria-label="Edit contact">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => deleteMutation.mutate({ id: contact.id })}
            className="text-muted-foreground hover:text-red-400 transition-colors" aria-label="Delete contact">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location & connection */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {contact.city && (
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{contact.city}</span>
        )}
        {contact.howConnected && (
          <span className="flex items-center gap-1"><Link2 className="w-3 h-3" />{contact.howConnected}</span>
        )}
      </div>

      {/* Contact details */}
      {(contact.phone || contact.instagram || contact.email) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground border-t border-border/40 pt-2">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
              <Phone className="w-3 h-3" />{contact.phone}
            </a>
          )}
          {contact.instagram && (
            <a href={`https://instagram.com/${contact.instagram.replace(/^@/, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
              <Instagram className="w-3 h-3" />{contact.instagram.startsWith('@') ? contact.instagram : `@${contact.instagram}`}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
              <Mail className="w-3 h-3" />{contact.email}
            </a>
          )}
        </div>
      )}

      {contact.notes && (
        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
          {contact.notes}
        </p>
      )}

      <p className="text-xs text-muted-foreground/50">
        {new Date(contact.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

export default function ContactLog() {
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAZ, setSortAZ] = useState(false);

  const utils = trpc.useUtils();
  const { data: contacts = [], isLoading } = trpc.contacts.getAll.useQuery();

  const filteredContacts = (() => {
    let list = searchQuery.trim()
      ? contacts.filter(c => {
          const q = searchQuery.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            (c.organization ?? '').toLowerCase().includes(q) ||
            (c.role ?? '').toLowerCase().includes(q) ||
            (c.notes ?? '').toLowerCase().includes(q) ||
            (c.city ?? '').toLowerCase().includes(q) ||
            (c.howConnected ?? '').toLowerCase().includes(q)
          );
        })
      : [...contacts];
    if (sortAZ) list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
    return list;
  })();

  const createMutation = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success('Contact saved');
      setShowForm(false);
      utils.contacts.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to save contact'),
    onSettled: () => setSubmitting(false),
  });

  function handleCreate(data: ContactFormData) {
    setSubmitting(true);
    createMutation.mutate({
      name: data.name.trim(),
      role: data.role.trim() || undefined,
      organization: data.organization.trim() || undefined,
      city: data.city || undefined,
      phone: data.phone.trim() || undefined,
      instagram: data.instagram.trim() || undefined,
      email: data.email.trim() || undefined,
      howConnected: data.howConnected.trim() || undefined,
      notes: data.notes.trim() || undefined,
    });
  }

  function exportCSV() {
    if (contacts.length === 0) { toast.error('No contacts to export'); return; }
    const headers = ['Name', 'Role/Title', 'Organization', 'City', 'Phone/WhatsApp', 'Instagram', 'Email', 'How Connected', 'Notes', 'Date Added'];
    const rows = contacts.map(c => [
      c.name,
      c.role ?? '',
      c.organization ?? '',
      c.city ?? '',
      c.phone ?? '',
      c.instagram ?? '',
      c.email ?? '',
      c.howConnected ?? '',
      c.notes ?? '',
      new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`);
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
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{contacts.length} contacts</span>
          {contacts.length > 0 && (
            <>
              <button
                onClick={() => setSortAZ(v => !v)}
                className={`transition-colors ${sortAZ ? 'text-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
                title={sortAZ ? 'Sorted A–Z (tap for recent)' : 'Sort A–Z'}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button onClick={exportCSV}
                className="text-muted-foreground hover:text-cyan-400 transition-colors" title="Export as CSV">
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-6">

        {/* Add Contact toggle */}
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="w-full cyber-button rounded-xl">
            + Add Contact
          </Button>
        ) : (
          <div className="cyber-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Add Contact</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ContactForm
              initial={EMPTY_FORM}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitLabel="Save Contact"
              submitting={submitting}
            />
          </div>
        )}

        {/* Search */}
        {contacts.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by name, org, city, notes…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 cyber-input rounded-xl"
            />
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
            {searchQuery.trim() ? `Results (${filteredContacts.length})` : 'All Contacts'}
          </h2>

          {isLoading && (
            <div className="text-center text-muted-foreground text-sm py-8">Loading…</div>
          )}

          {!isLoading && contacts.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No contacts yet. Add the first one above.
            </div>
          )}

          {!isLoading && contacts.length > 0 && filteredContacts.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No contacts match "{searchQuery}".
            </div>
          )}

          {filteredContacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onDeleted={() => utils.contacts.getAll.invalidate()}
              onUpdated={() => utils.contacts.getAll.invalidate()}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
