'use client';

import { redirect, useParams } from 'next/navigation';
import { useTenant } from '@/components/layout/tenant-provider';
import { useDispatchForm } from '@/lib/hooks/use-dispatch-form';
import { TransactionStepper, type StepConfig } from '@/components/forms/transaction-stepper';
import Link from 'next/link';
import { FormSection } from '@/components/ui/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';

export default function NewDispatchPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const ctx = useTenant();
  if (ctx.role !== 'tenant_admin' && !ctx.permissions.canDispatch) redirect(`/t/${tenantSlug}`);

  const form = useDispatchForm();

  if (form.loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Shared field fragments ─── */

  const locationsFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Origin Location
        </Label>
        <Select value={form.originLocationId} onValueChange={(val) => form.setOriginLocationId(val ?? '')}>
          <SelectTrigger className="w-full bg-background border-border text-foreground">
            <SelectValue placeholder="Select origin" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-off)] border-border">
            {form.locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id} label={`${loc.code} — ${loc.name}`} className="text-foreground focus:bg-muted">
                <span className="font-mono text-[var(--accent-color)] mr-2">{loc.code}</span>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Destination Location
        </Label>
        <Select value={form.destLocationId} onValueChange={(val) => form.setDestLocationId(val ?? '')}>
          <SelectTrigger className="w-full bg-background border-border text-foreground">
            <SelectValue placeholder="Select destination" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-off)] border-border">
            {form.locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id} label={`${loc.code} — ${loc.name}`} className="text-foreground focus:bg-muted">
                <span className="font-mono text-[var(--accent-color)] mr-2">{loc.code}</span>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const itemsFields = (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={form.addItem}
          className="border-border text-[var(--text-body)] hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5 mr-1" />
          Add Item
        </Button>
      </div>
      {form.items.map((item) => (
        <div key={item.key} className="rounded-lg border border-border p-3 space-y-3 bg-[var(--bg-off)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Line Item</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => form.removeItem(item.key)}
              disabled={form.items.length <= 1}
              className="text-muted-foreground hover:text-[var(--red)] disabled:opacity-30"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Item</Label>
            <Select value={item.commodity_id} onValueChange={(val) => form.updateItem(item.key, 'commodity_id', val ?? '')}>
              <SelectTrigger className="w-full bg-background border-border text-foreground">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-off)] border-border">
                {form.commodities.map((c) => (
                  <SelectItem key={c.id} value={c.id} label={`${c.code} — ${c.name}`} className="text-foreground focus:bg-muted">
                    <span className="font-mono text-[var(--accent-color)] mr-2">{c.code}</span>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Unit</Label>
              <Select value={item.unit_id} onValueChange={(val) => form.updateItem(item.key, 'unit_id', val ?? '')}>
                <SelectTrigger className="w-full bg-background border-border text-foreground">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--bg-off)] border-border">
                  {form.units.map((u) => (
                    <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.abbreviation})`} className="text-foreground focus:bg-muted">
                      {u.abbreviation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Qty</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={item.sent_quantity}
                onChange={(e) => form.updateItem(item.key, 'sent_quantity', e.target.value)}
                placeholder="0"
                className="bg-background border-border text-foreground font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Bags</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={item.sent_bags}
                onChange={(e) => form.updateItem(item.key, 'sent_bags', e.target.value)}
                placeholder="0"
                className="bg-background border-border text-foreground font-mono"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const transportFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Transporter Name</Label>
        <Input
          value={form.transporterName}
          onChange={(e) => form.setTransporterName(e.target.value)}
          placeholder="Transport company name"
          className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Vehicle Number</Label>
        <Input
          value={form.vehicleNumber}
          onChange={(e) => form.setVehicleNumber(e.target.value)}
          placeholder="e.g. KA-01-AB-1234"
          className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Driver Name</Label>
        <Input
          value={form.driverName}
          onChange={(e) => form.setDriverName(e.target.value)}
          placeholder="Driver full name"
          className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Driver Phone</Label>
        <Input
          inputMode="tel"
          value={form.driverPhone}
          onChange={(e) => form.setDriverPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => form.setNotes(e.target.value)}
          placeholder="Any additional notes..."
          rows={3}
          className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
    </div>
  );

  const reviewContent = (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3 space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Locations</h3>
        <p className="text-sm">
          <span className="text-[var(--text-muted)]">From:</span>{' '}
          {form.locations.find((l) => l.id === form.originLocationId)?.name || '—'}
        </p>
        <p className="text-sm">
          <span className="text-[var(--text-muted)]">To:</span>{' '}
          {form.locations.find((l) => l.id === form.destLocationId)?.name || '—'}
        </p>
      </div>
      <div className="rounded-lg border border-border p-3 space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Items ({form.items.filter((i) => i.commodity_id).length})
        </h3>
        {form.items.filter((i) => i.commodity_id).map((item) => {
          const commodity = form.commodities.find((c) => c.id === item.commodity_id);
          const unit = form.units.find((u) => u.id === item.unit_id);
          return (
            <p key={item.key} className="text-sm">
              {commodity?.name || '?'} — {item.sent_quantity} {unit?.abbreviation || ''}
              {item.sent_bags ? ` (${item.sent_bags} bags)` : ''}
            </p>
          );
        })}
      </div>
      {(form.transporterName || form.vehicleNumber || form.driverName) && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Transport</h3>
          {form.transporterName && <p className="text-sm">{form.transporterName}</p>}
          {form.vehicleNumber && <p className="text-sm">{form.vehicleNumber}</p>}
          {form.driverName && <p className="text-sm">{form.driverName} {form.driverPhone}</p>}
        </div>
      )}
      {form.notes && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Notes</h3>
          <p className="text-sm whitespace-pre-wrap">{form.notes}</p>
        </div>
      )}
      {form.error && (
        <div className="rounded-md border border-[var(--red)]/30 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
          {form.error}
        </div>
      )}
    </div>
  );

  /* ─── Mobile stepper steps ─── */

  const mobileSteps: StepConfig[] = [
    {
      label: 'Locations',
      content: locationsFields,
      validate: form.validateLocations,
    },
    {
      label: 'Items',
      content: itemsFields,
      validate: form.validateItems,
    },
    {
      label: 'Transport',
      content: transportFields,
    },
    {
      label: 'Review',
      content: reviewContent,
    },
  ];

  return (
    <>
      {/* ─── Mobile ─── */}
      <div className="block md:hidden">
        {form.error && !mobileSteps.find(() => false) && (
          <div className="mx-4 mt-2 rounded-md border border-[var(--red)]/30 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
            {form.error}
          </div>
        )}
        <TransactionStepper
          steps={mobileSteps}
          onSubmit={() => form.handleSubmit()}
          submitting={form.loading}
          submitLabel="Create Dispatch"
        />
      </div>

      {/* ─── Desktop ─── */}
      <div className="hidden md:block">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href={`/t/${tenantSlug}/dispatches`}>
              <Button variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-foreground">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
                New Dispatch
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create a new item dispatch between locations
              </p>
            </div>
          </div>

          <form onSubmit={form.handleSubmit} className="space-y-6">
            {form.error && (
              <div className="rounded-md border border-[var(--red)]/30 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
                {form.error}
              </div>
            )}

            {/* Locations */}
            <FormSection title="Locations">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Origin Location
                    </Label>
                    <Select value={form.originLocationId} onValueChange={(val) => form.setOriginLocationId(val ?? '')}>
                      <SelectTrigger className="w-full bg-background border-border text-foreground">
                        <SelectValue placeholder="Select origin" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--bg-off)] border-border">
                        {form.locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id} label={`${loc.code} — ${loc.name}`} className="text-foreground focus:bg-muted">
                            <span className="font-mono text-[var(--accent-color)] mr-2">{loc.code}</span>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Destination Location
                    </Label>
                    <Select value={form.destLocationId} onValueChange={(val) => form.setDestLocationId(val ?? '')}>
                      <SelectTrigger className="w-full bg-background border-border text-foreground">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent className="bg-[var(--bg-off)] border-border">
                        {form.locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id} label={`${loc.code} — ${loc.name}`} className="text-foreground focus:bg-muted">
                            <span className="font-mono text-[var(--accent-color)] mr-2">{loc.code}</span>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
            </FormSection>

            {/* Transport Details */}
            <FormSection title="Transport Details" defaultOpen={false} badge="optional">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transporter" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Transporter Name
                    </Label>
                    <Input
                      id="transporter"
                      value={form.transporterName}
                      onChange={(e) => form.setTransporterName(e.target.value)}
                      placeholder="Transport company name"
                      className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Vehicle Number
                    </Label>
                    <Input
                      id="vehicle"
                      value={form.vehicleNumber}
                      onChange={(e) => form.setVehicleNumber(e.target.value)}
                      placeholder="e.g. KA-01-AB-1234"
                      className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Driver Name
                    </Label>
                    <Input
                      id="driver"
                      value={form.driverName}
                      onChange={(e) => form.setDriverName(e.target.value)}
                      placeholder="Driver full name"
                      className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                      Driver Phone
                    </Label>
                    <Input
                      id="phone"
                      value={form.driverPhone}
                      onChange={(e) => form.setDriverPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="notes" className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => form.setNotes(e.target.value)}
                    placeholder="Any additional notes for this dispatch..."
                    rows={3}
                    className="bg-background border-border text-foreground placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                  />
                </div>
            </FormSection>

            {/* Items */}
            <FormSection title="Items">
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={form.addItem}
                  className="border-border text-[var(--text-body)] hover:bg-muted hover:text-foreground"
                >
                  <Plus className="size-3.5 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="-mx-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground pl-6">
                        Item
                      </TableHead>
                      <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Unit
                      </TableHead>
                      <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Quantity
                      </TableHead>
                      <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                        Bags
                      </TableHead>
                      <TableHead className="text-xs font-mono uppercase tracking-wider text-muted-foreground w-12 pr-6" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item) => (
                      <TableRow key={item.key} className="border-border hover:bg-muted/30">
                        <TableCell className="pl-6">
                          <Select
                            value={item.commodity_id}
                            onValueChange={(val) => form.updateItem(item.key, 'commodity_id', val ?? '')}
                          >
                            <SelectTrigger className="w-full min-w-[180px] bg-background border-border text-foreground">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--bg-off)] border-border">
                              {form.commodities.map((c) => (
                                <SelectItem key={c.id} value={c.id} label={`${c.code} — ${c.name}`} className="text-foreground focus:bg-muted">
                                  <span className="font-mono text-[var(--accent-color)] mr-2">{c.code}</span>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit_id}
                            onValueChange={(val) => form.updateItem(item.key, 'unit_id', val ?? '')}
                          >
                            <SelectTrigger className="w-full min-w-[120px] bg-background border-border text-foreground">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--bg-off)] border-border">
                              {form.units.map((u) => (
                                <SelectItem key={u.id} value={u.id} label={`${u.name} (${u.abbreviation})`} className="text-foreground focus:bg-muted">
                                  {u.name}
                                  <span className="text-muted-foreground ml-1">({u.abbreviation})</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.sent_quantity}
                            onChange={(e) => form.updateItem(item.key, 'sent_quantity', e.target.value)}
                            placeholder="0.00"
                            className="w-28 bg-background border-border text-foreground font-mono placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={item.sent_bags}
                            onChange={(e) => form.updateItem(item.key, 'sent_bags', e.target.value)}
                            placeholder="0"
                            className="w-20 bg-background border-border text-foreground font-mono placeholder:text-[var(--text-dim)] focus-visible:border-[var(--accent-color)] focus-visible:ring-[var(--accent-color)]/20"
                          />
                        </TableCell>
                        <TableCell className="pr-6">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => form.removeItem(item.key)}
                            disabled={form.items.length <= 1}
                            className="text-muted-foreground hover:text-[var(--red)] disabled:opacity-30"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </FormSection>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
              <Link href={`/t/${tenantSlug}/dispatches`}>
                <Button
                  type="button"
                  variant="outline"
                  className="border-border text-[var(--text-body)] hover:bg-muted"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={form.loading}
                variant="orange"
              >
                {form.loading && <Loader2 className="size-4 mr-1 animate-spin" />}
                Create Dispatch
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
