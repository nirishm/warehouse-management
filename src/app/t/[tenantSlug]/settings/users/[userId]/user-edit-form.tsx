'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Permissions } from '@/modules/user-management/validations/user';
import { PERMISSION_LABELS } from '@/modules/user-management/validations/user';

interface UserData {
  user_id: string;
  email: string;
  role: string;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
  permissions: Permissions | null;
  created_at: string;
}

interface LocationOption {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface UserEditFormProps {
  tenantSlug: string;
  userId: string;
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
  canManagePayments: false,
  canManageAlerts: false,
  canGenerateDocuments: false,
  canManageLots: false,
  canManageReturns: false,
  canImportData: false,
  canManageAdjustments: false,
};

const roleColors: Record<string, string> = {
  tenant_admin: 'bg-[var(--accent-tint)] text-[var(--accent-color)]',
  manager: 'bg-[var(--blue-bg)] text-[var(--blue)]',
  employee: 'bg-muted/50 text-[var(--text-muted)]',
};

const roleLabels: Record<string, string> = {
  tenant_admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
};

export function UserEditForm({ tenantSlug, userId }: UserEditFormProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);

  // Locations
  const [availableLocations, setAvailableLocations] = useState<LocationOption[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

  // Saving states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/users/${userId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      const json = await res.json();
      const userData = json.data as UserData;
      setUser(userData);
      setDisplayName(userData.display_name ?? '');
      setPhone(userData.phone ?? '');
      setIsActive(userData.is_active);
      setPermissions({ ...DEFAULT_PERMISSIONS, ...(userData.permissions ?? {}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, userId]);

  const fetchLocations = useCallback(async () => {
    try {
      const [locRes, userLocRes] = await Promise.all([
        fetch(`/api/t/${tenantSlug}/locations`),
        fetch(`/api/t/${tenantSlug}/users/${userId}/locations`),
      ]);
      if (locRes.ok) {
        const locJson = await locRes.json();
        setAvailableLocations(locJson.data ?? []);
      }
      if (userLocRes.ok) {
        const userLocJson = await userLocRes.json();
        const ids = (userLocJson.data ?? []).map(
          (l: { location_id: string }) => l.location_id
        );
        setSelectedLocationIds(ids);
      }
    } catch {
      // Locations may not load if inventory module is disabled
    }
  }, [tenantSlug, userId]);

  useEffect(() => {
    fetchUser();
    fetchLocations();
  }, [fetchUser, fetchLocations]);

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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName || undefined,
          phone: phone || undefined,
          is_active: isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update profile');
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update permissions');
      }
      toast.success('Permissions updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleSaveLocations = async () => {
    setSavingLocations(true);
    try {
      const res = await fetch(`/api/t/${tenantSlug}/users/${userId}/locations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_ids: selectedLocationIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to update locations');
      }
      toast.success('Location assignments updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save locations');
    } finally {
      setSavingLocations(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--bg-off)]" />
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--bg-off)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-6">
            <div className="h-4 w-32 animate-pulse rounded bg-[var(--bg-off)] mb-4" />
            <div className="space-y-3">
              <div className="h-9 w-full animate-pulse rounded bg-[var(--bg-off)]" />
              <div className="h-9 w-full animate-pulse rounded bg-[var(--bg-off)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href={`/t/${tenantSlug}/settings/users`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-foreground transition-colors"
        >
          &larr; Back to Users
        </Link>
        <div className="rounded-xl border border-border bg-white p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            {error ?? 'User not found'}
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'tenant_admin';

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href={`/t/${tenantSlug}/settings/users`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-foreground transition-colors mb-3"
        >
          &larr; Back to Users
        </Link>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {user.display_name || user.email}
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-0.5">{user.email}</p>
      </div>

      {/* Card 1: Profile Info */}
      <div className="rounded-xl border border-border bg-white p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            Profile Information
          </h2>
          <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${roleColors[user.role] ?? roleColors.employee}`}
          >
            {roleLabels[user.role] ?? user.role}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="display_name"
              className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]"
            >
              Display Name
            </label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              className="h-9 w-full rounded-lg border border-border bg-[var(--bg-base)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/50"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="h-9 w-full rounded-lg border border-border bg-[var(--bg-off)] px-3 text-sm text-[var(--text-muted)] cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="phone"
              className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]"
            >
              Phone
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              className="h-9 w-full rounded-lg border border-border bg-[var(--bg-base)] px-3 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/50"
            />
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 pt-1">
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
          <span className="text-sm text-[var(--text-body)]">
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="orange"
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {/* Card 2: Permissions */}
      <div className="rounded-xl border border-border bg-white p-6 space-y-5">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
            Permissions
          </h2>
          {isAdmin && (
            <p className="text-xs text-[var(--accent-color)] mt-1">
              Admins have all permissions enabled by default
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      : 'border-border bg-[var(--bg-base)] hover:border-[var(--text-dim)]/30'
                  } ${isAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      enabled
                        ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                        : 'border-border bg-[var(--bg-off)]'
                    }`}
                  >
                    {enabled && (
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
                  <span className="text-xs font-bold text-[var(--text-body)]">
                    {PERMISSION_LABELS[key]}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="orange"
            onClick={handleSavePermissions}
            disabled={savingPermissions || isAdmin}
          >
            {savingPermissions ? 'Saving...' : 'Save Permissions'}
          </Button>
        </div>
      </div>

      {/* Card 3: Location Assignments */}
      <div className="rounded-xl border border-border bg-white p-6 space-y-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-dim)]">
          Location Assignments
        </h2>

        {availableLocations.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">
            No locations available. Create locations in Settings first.
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
                      : 'border-border bg-[var(--bg-base)] hover:border-[var(--text-dim)]/30'
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
                    <span className="text-xs font-bold text-[var(--accent-color)]">
                      {location.code}
                    </span>
                    <span className="block text-xs text-[var(--text-muted)] truncate">
                      {location.name}
                    </span>
                  </div>
                  {!location.is_active && (
                    <Badge
                      className="ml-auto rounded-full bg-muted text-[var(--text-dim)] border border-border text-[10px]"
                    >
                      Inactive
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            variant="orange"
            onClick={handleSaveLocations}
            disabled={savingLocations}
          >
            {savingLocations ? 'Saving...' : 'Save Locations'}
          </Button>
        </div>
      </div>
    </div>
  );
}
