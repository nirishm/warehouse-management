'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type {
  Permissions,
  UserWithLocations,
} from '@/modules/user-management/validations/user';
import { PERMISSION_LABELS } from '@/modules/user-management/validations/user';

interface LocationOption {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface UserEditFormProps {
  user: UserWithLocations;
  tenantSlug: string;
}

const DEFAULT_PERMISSIONS: Permissions = {
  canPurchase: false,
  canDispatch: false,
  canReceive: false,
  canSale: false,
  canViewStock: false,
  canManageLocations: false,
  canManageCommodities: false,
  canManageContacts: false,
  canViewAnalytics: false,
  canExportData: false,
  canViewAuditLog: false,
};

export function UserEditForm({ user, tenantSlug }: UserEditFormProps) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [isActive, setIsActive] = useState(user.is_active);
  const [permissions, setPermissions] = useState<Permissions>(
    user.permissions ?? DEFAULT_PERMISSIONS
  );
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(
    user.locations.map((l) => l.location_id)
  );
  const [availableLocations, setAvailableLocations] = useState<LocationOption[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch(`/api/t/${tenantSlug}/locations`);
      if (res.ok) {
        const json = await res.json();
        setAvailableLocations(json.data ?? []);
      }
    } catch {
      // Locations may not load if inventory module is disabled
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const togglePermission = (key: keyof Permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const profileRes = await fetch(
        `/api/t/${tenantSlug}/users/${user.user_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: displayName || undefined,
            phone: phone || undefined,
            is_active: isActive,
            permissions,
          }),
        }
      );

      if (!profileRes.ok) {
        const err = await profileRes.json();
        throw new Error(err.error ?? 'Failed to update profile');
      }

      const locationsRes = await fetch(
        `/api/t/${tenantSlug}/users/${user.user_id}/locations`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location_ids: selectedLocationIds }),
        }
      );

      if (!locationsRes.ok) {
        const err = await locationsRes.json();
        throw new Error(err.error ?? 'Failed to update locations');
      }

      toast.success('User updated successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save changes'
      );
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user.role === 'tenant_admin';

  const roleColors: Record<string, string> = {
    tenant_admin: 'bg-[var(--accent-color)]/15 text-[var(--accent-color)] border-[var(--accent-color)]/30',
    manager: 'bg-[var(--blue-bg)] text-[var(--blue)] border-[rgba(37,99,235,0.2)]',
    employee: 'bg-muted/50 text-[var(--text-muted)] border-border',
  };

  const roleLabels: Record<string, string> = {
    tenant_admin: 'Admin',
    manager: 'Manager',
    employee: 'Employee',
  };

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
              Profile Information
            </CardTitle>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium ${roleColors[user.role] ?? roleColors.employee}`}
            >
              {roleLabels[user.role] ?? user.role}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="display_name"
                className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]"
              >
                Display Name
              </Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-background border-border text-foreground font-mono"
                placeholder="Enter display name"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]"
              >
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-background border-border text-foreground font-mono"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-border transition-colors ${
                isActive ? 'bg-[var(--green)]' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  isActive ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <Label className="text-sm text-[var(--text-body)]">
              {isActive ? 'Active' : 'Inactive'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Permissions
          </CardTitle>
          {isAdmin && (
            <p className="text-xs text-[var(--accent-color)]/80 font-mono mt-1">
              Admins have all permissions enabled by default
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(PERMISSION_LABELS) as (keyof Permissions)[]).map(
              (key) => {
                const enabled = isAdmin || permissions[key];
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isAdmin}
                    onClick={() => togglePermission(key)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      enabled
                        ? 'border-[var(--accent-color)]/30 bg-[var(--accent-color)]/5'
                        : 'border-border bg-background hover:border-border'
                    } ${isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div
                      role="switch"
                      aria-checked={enabled}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors ${
                        enabled
                          ? 'bg-[var(--accent-color)] border-[var(--accent-color)]'
                          : 'bg-muted border-border'
                      }`}
                    >
                      <span
                        className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-mono text-[var(--text-body)]">
                      {PERMISSION_LABELS[key]}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Assignments */}
      <Card className="border-border bg-[var(--bg-off)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
            Location Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableLocations.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)] font-mono">
              No locations available. Create locations in the inventory module first.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableLocations.map((location) => {
                const isSelected = selectedLocationIds.includes(location.id);
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => toggleLocation(location.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent-color)]/30 bg-[var(--accent-color)]/5'
                        : 'border-border bg-background hover:border-border'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                          : 'border-border bg-[var(--bg-off)]'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-mono text-[var(--accent-color)] font-medium">
                        {location.code}
                      </span>
                      <span className="block text-xs text-[var(--text-muted)] truncate">
                        {location.name}
                      </span>
                    </div>
                    {!location.is_active && (
                      <Badge
                        variant="secondary"
                        className="ml-auto bg-muted text-[var(--text-dim)] border border-border text-[10px]"
                      >
                        Inactive
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--accent-color)] hover:bg-[var(--accent-color)] text-foreground font-mono font-semibold px-8"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
