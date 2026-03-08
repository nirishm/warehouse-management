'use client';

import { type ReactElement, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import type { Contact, ContactType } from '@/modules/inventory/validations/contact';
import { CONTACT_TYPES } from '@/modules/inventory/validations/contact';

interface ContactFormProps {
  tenantSlug: string;
  contact?: Contact;
  trigger?: ReactElement;
}

export function ContactForm({ tenantSlug, contact, trigger }: ContactFormProps) {
  const router = useRouter();
  const isEditing = !!contact;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(contact?.name ?? '');
  const [type, setType] = useState<ContactType>(contact?.type ?? 'supplier');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [address, setAddress] = useState(contact?.address ?? '');

  function resetForm() {
    if (!isEditing) {
      setName('');
      setType('supplier');
      setEmail('');
      setPhone('');
      setAddress('');
    }
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      type,
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
    };

    try {
      const url = isEditing
        ? `/api/t/${tenantSlug}/contacts/${contact.id}`
        : `/api/t/${tenantSlug}/contacts`;

      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save contact');
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          if (isEditing && contact) {
            setName(contact.name);
            setType(contact.type);
            setEmail(contact.email ?? '');
            setPhone(contact.phone ?? '');
            setAddress(contact.address ?? '');
          }
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="bg-[var(--accent-color)] text-foreground hover:bg-[var(--accent-color)] font-medium">
              <Plus className="size-4 mr-1" />
              New Contact
            </Button>
          )
        }
      />
      <DialogContent className="bg-[var(--bg-off)] border border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-semibold">
            {isEditing ? 'Edit Contact' : 'New Contact'}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-dim)]">
            {isEditing
              ? 'Update the contact details below.'
              : 'Add a new supplier, customer, or combined contact.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-[var(--red)]/30 bg-[var(--red)]/10 px-3 py-2 text-sm text-[var(--red)]">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contact-name" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Name
            </Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Supplies Inc."
              required
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Type
            </Label>
            <Select value={type} onValueChange={(val) => setType(val as ContactType)}>
              <SelectTrigger className="w-full bg-background border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-off)] border-border">
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-foreground focus:bg-muted">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Email
              <span className="text-[var(--text-dim)] normal-case font-sans ml-1">(optional)</span>
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Phone
              <span className="text-[var(--text-dim)] normal-case font-sans ml-1">(optional)</span>
            </Label>
            <Input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="bg-background border-border text-foreground font-mono placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-address" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
              Address
              <span className="text-[var(--text-dim)] normal-case font-sans ml-1">(optional)</span>
            </Label>
            <Textarea
              id="contact-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Business St, City, State"
              rows={2}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
            />
          </div>

          <DialogFooter className="bg-background/50 border-border">
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--accent-color)] text-foreground hover:bg-[var(--accent-color)] font-medium"
            >
              {loading && <Loader2 className="size-4 mr-1 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
