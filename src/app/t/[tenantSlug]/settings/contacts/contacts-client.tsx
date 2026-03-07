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
  supplier: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  customer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  both: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
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
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 pl-6">
            Name
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Type
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Email
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Phone
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            Status
          </TableHead>
          <TableHead className="text-xs font-mono uppercase tracking-wider text-zinc-500 text-right pr-6">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contacts.map((contact) => (
          <TableRow
            key={contact.id}
            className="border-zinc-800/60 hover:bg-zinc-800/30"
          >
            <TableCell className="pl-6 text-sm text-zinc-200 font-medium">
              {contact.name}
            </TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${typeColors[contact.type] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'}`}
              >
                {contact.type}
              </span>
            </TableCell>
            <TableCell className="text-sm text-zinc-400">
              {contact.email ?? <span className="text-zinc-600">--</span>}
            </TableCell>
            <TableCell className="text-sm text-zinc-400 font-mono">
              {contact.phone ?? <span className="text-zinc-600 font-sans">--</span>}
            </TableCell>
            <TableCell>
              <Badge
                variant={contact.is_active ? 'default' : 'secondary'}
                className={
                  contact.is_active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/50'
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
