'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  tenantId: string;
  enabledModules: string[];
  allModules: Array<{ id: string; name: string }>;
}

export function TenantModulesManager({ tenantId, enabledModules, allModules }: Props) {
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
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground text-base">Enabled Modules</CardTitle>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-[var(--accent-color)] hover:bg-[var(--accent-dark)] text-white font-semibold"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allModules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => toggleModule(mod.id)}
              className={`p-3 rounded-lg border text-left text-sm transition-all ${
                enabled.includes(mod.id)
                  ? 'border-[var(--accent-color)]/30 bg-[var(--accent-tint)] text-foreground'
                  : 'border-border bg-muted/50 text-muted-foreground hover:border-border'
              }`}
            >
              <span className="font-mono text-xs uppercase tracking-wider">
                {mod.name}
              </span>
              {enabled.includes(mod.id) && (
                <Badge className="mt-2 bg-[var(--accent-tint)] text-[var(--accent-color)] border-[var(--accent-color)]/20 text-[10px]">
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
