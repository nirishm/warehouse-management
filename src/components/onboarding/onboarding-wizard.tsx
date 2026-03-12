"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTenant } from "@/components/layout/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingStatus {
  needed: boolean;
  hasLocations: boolean;
  hasUnits: boolean;
  hasItems: boolean;
}

interface CreatedUnit {
  id: string;
  name: string;
  abbreviation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9\-]/g, "");
}

const DISMISSAL_KEY = (tenantId: string) =>
  `wareos-onboarding-dismissed-${tenantId}`;

// ─── Default units ────────────────────────────────────────────────────────────

const DEFAULT_UNITS = [
  { name: "Piece", abbreviation: "pc", type: "count" as const, defaultChecked: true },
  { name: "Kilogram", abbreviation: "kg", type: "weight" as const, defaultChecked: true },
  { name: "Box", abbreviation: "box", type: "count" as const, defaultChecked: true },
  { name: "Litre", abbreviation: "L", type: "volume" as const, defaultChecked: false },
  { name: "Metre", abbreviation: "m", type: "length" as const, defaultChecked: false },
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={stepNum} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: isActive
                  ? "var(--accent-color)"
                  : isDone
                  ? "var(--green)"
                  : "var(--bg-off)",
                color: isActive || isDone ? "#fff" : "var(--text-muted)",
                border: isActive
                  ? "2px solid var(--accent-color)"
                  : isDone
                  ? "2px solid var(--green)"
                  : "2px solid var(--border)",
                transition: "all 0.2s",
              }}
            >
              {isDone ? "✓" : stepNum}
            </div>
            {stepNum < total && (
              <div
                style={{
                  width: "32px",
                  height: "2px",
                  backgroundColor: isDone ? "var(--green)" : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Create Location ──────────────────────────────────────────────────

function StepLocation({
  tenantSlug,
  onDone,
}: {
  tenantSlug: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"warehouse" | "store" | "yard" | "external">("warehouse");
  const [codeManual, setCodeManual] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!codeManual) setCode(toCode(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Location name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined, type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Failed to create location");
      }
      toast.success("Location created!");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create location");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
          Start by setting up your first storage location — typically your main warehouse.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Label htmlFor="loc-name">Location name <span style={{ color: "var(--accent-color)" }}>*</span></Label>
        <Input
          id="loc-name"
          placeholder="e.g. Main Warehouse"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Label htmlFor="loc-code">Code (auto-generated)</Label>
        <Input
          id="loc-code"
          placeholder="e.g. MAIN-WAREHOUSE"
          value={code}
          onChange={(e) => {
            setCodeManual(true);
            setCode(e.target.value);
          }}
        />
        <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
          Used as a short reference. Auto-filled from name.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Label htmlFor="loc-type">Type</Label>
        <Select
          value={type}
          onValueChange={(v) => setType(v as typeof type)}
        >
          <SelectTrigger id="loc-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="warehouse">Warehouse</SelectItem>
            <SelectItem value="store">Store</SelectItem>
            <SelectItem value="yard">Yard</SelectItem>
            <SelectItem value="external">External</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={loading}
        style={{
          height: "48px",
          borderRadius: "9999px",
          backgroundColor: "var(--accent-color)",
          color: "#fff",
          fontWeight: 700,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          marginTop: "4px",
        }}
      >
        {loading ? "Creating…" : "Create Location"}
      </Button>
    </form>
  );
}

// ─── Step 2: Add Default Units ────────────────────────────────────────────────

function StepUnits({
  tenantSlug,
  onDone,
}: {
  tenantSlug: string;
  onDone: (units: CreatedUnit[]) => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(
    DEFAULT_UNITS.map((u) => u.defaultChecked)
  );
  const [loading, setLoading] = useState(false);

  function toggleUnit(index: number) {
    setChecked((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = DEFAULT_UNITS.filter((_, i) => checked[i]);
    if (selected.length === 0) {
      toast.error("Select at least one unit");
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        selected.map((unit) =>
          fetch(`/api/v1/t/${tenantSlug}/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: unit.name,
              abbreviation: unit.abbreviation,
              type: unit.type,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err?.message ?? `Failed to create unit: ${unit.name}`);
            }
            const json = await res.json();
            return json.data as CreatedUnit;
          })
        )
      );
      toast.success(`${results.length} unit${results.length !== 1 ? "s" : ""} added!`);
      onDone(results);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add units");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "4px" }}>
          Select the units of measurement you use. You can always add more later.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {DEFAULT_UNITS.map((unit, i) => (
          <label
            key={unit.abbreviation}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "8px",
              border: checked[i]
                ? "1.5px solid var(--accent-color)"
                : "1.5px solid var(--border)",
              backgroundColor: checked[i] ? "var(--accent-tint)" : "var(--bg-base)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => toggleUnit(i)}
              style={{ accentColor: "var(--accent-color)", width: "16px", height: "16px" }}
            />
            <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
              {unit.name}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-off)",
                borderRadius: "4px",
                padding: "2px 8px",
                border: "1px solid var(--border)",
              }}
            >
              {unit.abbreviation}
            </span>
          </label>
        ))}
      </div>

      <Button
        type="submit"
        disabled={loading}
        style={{
          height: "48px",
          borderRadius: "9999px",
          backgroundColor: "var(--accent-color)",
          color: "#fff",
          fontWeight: 700,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          marginTop: "4px",
        }}
      >
        {loading ? "Adding units…" : "Add Units"}
      </Button>
    </form>
  );
}

// ─── Step 3: Create First Item ────────────────────────────────────────────────

function StepItem({
  tenantSlug,
  availableUnits,
  onDone,
}: {
  tenantSlug: string;
  availableUnits: CreatedUnit[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<"goods" | "service" | "composite">("goods");
  const [unitId, setUnitId] = useState(availableUnits[0]?.id ?? "");
  const [codeManual, setCodeManual] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!codeManual) setCode(toCode(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Item name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          type,
          defaultUnitId: unitId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Failed to create item");
      }
      toast.success("Item created!");
      onDone();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "4px" }}>
          Add your first inventory item. You can import more items in bulk later.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Label htmlFor="item-name">Item name <span style={{ color: "var(--accent-color)" }}>*</span></Label>
        <Input
          id="item-name"
          placeholder="e.g. Safety Helmet"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Label htmlFor="item-code">Code (auto-generated)</Label>
        <Input
          id="item-code"
          placeholder="e.g. SAFETY-HELMET"
          value={code}
          onChange={(e) => {
            setCodeManual(true);
            setCode(e.target.value);
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Label htmlFor="item-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger id="item-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="goods">Goods</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="composite">Composite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {availableUnits.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <Label htmlFor="item-unit">Default unit</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger id="item-unit">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.abbreviation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        style={{
          height: "48px",
          borderRadius: "9999px",
          backgroundColor: "var(--accent-color)",
          color: "#fff",
          fontWeight: 700,
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
          marginTop: "4px",
        }}
      >
        {loading ? "Creating…" : "Create Item"}
      </Button>
    </form>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "16px",
        padding: "24px 0 8px",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "9999px",
          backgroundColor: "var(--accent-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "36px",
        }}
      >
        🎉
      </div>
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        You&apos;re all set!
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0, maxWidth: "320px" }}>
        Your warehouse, units, and first item are ready. Explore WareOS to manage your inventory.
      </p>
      <Button
        onClick={onClose}
        style={{
          height: "48px",
          borderRadius: "9999px",
          backgroundColor: "var(--accent-color)",
          color: "#fff",
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          padding: "0 40px",
          marginTop: "8px",
        }}
      >
        Go to Dashboard
      </Button>
    </div>
  );
}

// ─── Wizard Shell ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Create Location", "Add Units", "Create Item"];

export function OnboardingWizard() {
  const { tenantId, tenantSlug } = useTenant();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(1); // 1-3, or 4 = success
  const [createdUnits, setCreatedUnits] = useState<CreatedUnit[]>([]);

  const dismissalKey = DISMISSAL_KEY(tenantId);

  const checkAndShow = useCallback(async () => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(dismissalKey);
      if (dismissed === "true") return;
    }

    try {
      const res = await fetch(`/api/v1/t/${tenantSlug}/onboarding/status`);
      if (!res.ok) return;
      const status: OnboardingStatus = await res.json();
      if (status.needed) {
        // Start from the first incomplete step
        if (!status.hasLocations) setStep(1);
        else if (!status.hasUnits) setStep(2);
        else setStep(3);
        setVisible(true);
      }
    } catch {
      // Silently fail — don't block app loading
    }
  }, [tenantSlug, dismissalKey]);

  useEffect(() => {
    checkAndShow();
  }, [checkAndShow]);

  function handleDismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(dismissalKey, "true");
    }
    setVisible(false);
  }

  function handleClose() {
    setVisible(false);
  }

  if (!visible) return null;

  const isSuccess = step === 4;

  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Card */}
      <div
        style={{
          backgroundColor: "var(--bg-base)",
          borderRadius: "var(--card-radius)",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {isSuccess ? "Setup Complete" : "Welcome to WareOS"}
            </h1>
            {!isSuccess && (
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                Step {step} of 3 — {STEP_LABELS[step - 1]}
              </p>
            )}
          </div>
          {!isSuccess && (
            <button
              onClick={handleDismiss}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: "13px",
                padding: "4px 8px",
                borderRadius: "4px",
              }}
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Step indicator */}
        {!isSuccess && (
          <div
            style={{
              padding: "16px 24px 0",
            }}
          >
            <StepIndicator current={step} total={3} />
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {isSuccess && <SuccessScreen onClose={handleClose} />}

          {step === 1 && (
            <StepLocation
              tenantSlug={tenantSlug}
              onDone={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepUnits
              tenantSlug={tenantSlug}
              onDone={(units) => {
                setCreatedUnits(units);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <StepItem
              tenantSlug={tenantSlug}
              availableUnits={createdUnits}
              onDone={() => setStep(4)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
