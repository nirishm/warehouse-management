'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ContactForm } from './contact-form';
import { ContactActions } from './contact-actions';
import type { Contact } from '@/modules/inventory/validations/contact';

const typeColors: Record<string, string> = {
  supplier: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[var(--blue)]/20',
  customer: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  both: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
};

interface ContactsClientProps {
  contacts: Contact[];
  tenantSlug: string;
  renderMode: 'button' | 'table';
}

export function ContactsClient({ contacts, tenantSlug, renderMode }: ContactsClientProps) {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  if (renderMode === 'button') {
    return <ContactForm tenantSlug={tenantSlug} />;
  }

  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground0">
        <p className="text-sm font-mono">No contacts found</p>
        <p className="text-xs mt-1">
          Create your first contact to get started
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0 pl-6">
            Name
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
            Type
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
            Email
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
            Phone
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0">
            Status
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-foreground0 text-right pr-6">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow
            key={contact.id}
            className="border-border hover:bg-muted/50"
          >
            <TableCell className="pl-6 text-sm text-foreground font-medium">
              {contact.name}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${typeColors[contact.type] ?? 'bg-muted/50 text-[var(--text-muted)] border-border'}`}
              >
                {contact.type}
              </span>
            </TableCell>
            <TableCell className="text-sm text-[var(--text-muted)]">
              {contact.email ?? <span className="text-[var(--text-dim)]">--</span>}
            </TableCell>
            <TableCell className="text-sm text-[var(--text-muted)] font-mono">
              {contact.phone ?? <span className="text-[var(--text-dim)] font-sans">--</span>}
            </TableCell>
            <TableCell>
              <Badge
                variant={contact.is_active ? 'default' : 'secondary'}
                className={
                  contact.is_active
                    ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                    : 'bg-muted text-[var(--text-muted)] border border-border'
                }
              >
                {contact.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="text-right pr-6">
              <ContactActions
                contact={contact}
                tenantSlug={tenantSlug}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
