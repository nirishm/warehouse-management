'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { ContactForm } from './contact-form';
import { ContactActions } from './contact-actions';
import type { Contact } from '@/modules/inventory/validations/contact';

const typeStyles: Record<string, string> = {
  supplier: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  customer: 'bg-[var(--green-bg)] text-[var(--green)]',
  both: 'bg-[var(--orange-bg)] text-[var(--accent-color)]',
};

function getColumns(tenantSlug: string): ColumnDef<Contact>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-bold text-sm text-[var(--text-primary)]">
          {row.getValue('name')}
        </span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as string;
        return (
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${typeStyles[type] ?? 'bg-muted text-[var(--text-muted)]'}`}
          >
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string | null;
        return phone ? (
          <span className="text-sm text-[var(--text-body)]">{phone}</span>
        ) : (
          <span className="text-sm text-[var(--text-dim)]">&mdash;</span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string | null;
        return email ? (
          <span className="text-sm text-[var(--text-body)]">{email}</span>
        ) : (
          <span className="text-sm text-[var(--text-dim)]">&mdash;</span>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return isActive ? (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-[var(--green-bg)] text-[var(--green)]">
            Active
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-[var(--bg-off)] text-[var(--text-dim)]">
            Inactive
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <ContactActions contact={row.original} tenantSlug={tenantSlug} />
      ),
    },
  ];
}

interface ContactsTableProps {
  data: Contact[];
  tenantSlug: string;
}

export function ContactsTable({ data, tenantSlug }: ContactsTableProps) {
  const columns = getColumns(tenantSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-[var(--text-primary)]">Contacts</h1>
        <ContactForm tenantSlug={tenantSlug} />
      </div>

      <div className="rounded-xl border border-border bg-[var(--bg-base)] overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchKey="name"
          searchPlaceholder="Search contacts..."
        />
      </div>
    </div>
  );
}
