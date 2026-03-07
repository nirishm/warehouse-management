'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ALL_MODULES = [
  'inventory', 'dispatch', 'purchase', 'sale',
  'analytics', 'shortage_tracking', 'user_management', 'audit_trail',
];

interface Props {
  tenantId: string;
  enabledModules: string[];
  modules: Array<{ module_id: string; status: string }>;
}

export function TenantModulesManager({ tenantId, enabledModules, modules }: Props) {
  const [enabled, setEnabled] = useState<string[]>(enabledModules);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function toggleModule(moduleId: string) {
    setEnabled(prev =>
      prev.includes(moduleId)
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    );
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled_modules: enabled }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-zinc-200 text-base">Enabled Modules</CardTitle>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ALL_MODULES.map((mod) => (
            <button
              key={mod}
              onClick={() => toggleModule(mod)}
              className={`p-3 rounded-lg border text-left text-sm transition-all ${
                enabled.includes(mod)
                  ? 'border-amber-500/40 bg-amber-500/5 text-zinc-200'
                  : 'border-zinc-800 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <span className="font-mono text-xs uppercase tracking-wider">
                {mod.replace(/_/g, ' ')}
              </span>
              {enabled.includes(mod) && (
                <Badge className="mt-2 bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
                  Active
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
