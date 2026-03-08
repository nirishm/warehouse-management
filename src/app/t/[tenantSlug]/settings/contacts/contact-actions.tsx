'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { ContactForm } from './contact-form';
import type { Contact } from '@/modules/inventory/validations/contact';

interface ContactActionsProps {
  contact: Contact;
  tenantSlug: string;
}

export function ContactActions({ contact, tenantSlug }: ContactActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !contact.is_active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${contact.name}"? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      await fetch(`/api/t/${tenantSlug}/contacts/${contact.id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ContactForm
        tenantSlug={tenantSlug}
        contact={contact}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-[var(--text-muted)] hover:text-foreground hover:bg-muted"
          >
            <Pencil className="size-3.5" />
          </Button>
        }
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={loading}
              className="text-[var(--text-muted)] hover:text-foreground hover:bg-muted"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="bg-[var(--bg-off)] border-border min-w-[160px]"
        >
          <DropdownMenuItem
            onClick={toggleActive}
            className="text-[var(--text-body)] focus:bg-muted focus:text-foreground gap-2"
          >
            {contact.is_active ? (
              <>
                <PowerOff className="size-3.5" />
                Deactivate
              </>
            ) : (
              <>
                <Power className="size-3.5" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-muted" />
          <DropdownMenuItem
            onClick={handleDelete}
            variant="destructive"
            className="gap-2"
          >
            <Trash2 className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
