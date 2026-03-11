'use client';

import { useState } from 'react';
import { ImportDropzone } from '@/components/bulk-import/import-dropzone';

const TABS = [
  { id: 'commodities', label: 'Items' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'initial-stock', label: 'Initial Stock' },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  tenantSlug: string;
}

export function BulkImportTabs({ tenantSlug }: Props) {
  const [active, setActive] = useState<TabId>('commodities');
  const base = `/api/t/${tenantSlug}/bulk-import`;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 text-sm font-mono transition-colors border-b-2 -mb-px ${
              active === tab.id
                ? 'border-[var(--accent-color)] text-[var(--accent-color)]'
                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-body)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-xl">
        {active === 'commodities' && (
          <ImportDropzone
            label="Import items from CSV"
            uploadUrl={`${base}/commodities`}
            templateUrl={`${base}/commodities`}
          />
        )}
        {active === 'contacts' && (
          <ImportDropzone
            label="Import contacts from CSV"
            uploadUrl={`${base}/contacts`}
            templateUrl={`${base}/contacts`}
          />
        )}
        {active === 'initial-stock' && (
          <ImportDropzone
            label="Import initial stock as purchase receipts"
            uploadUrl={`${base}/purchases`}
            templateUrl={`${base}/purchases`}
          />
        )}
      </div>
    </div>
  );
}
