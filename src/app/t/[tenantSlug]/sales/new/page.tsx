'use client';

import { redirect, useParams } from 'next/navigation';
import { useTenant } from '@/components/layout/tenant-provider';
import { useSaleForm } from '@/lib/hooks/use-sale-form';
import { TransactionStepper, type StepConfig } from '@/components/forms/transaction-stepper';
import { FormSection } from '@/components/ui/form-section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewSalePage() {
  const routeParams = useParams<{ tenantSlug: string }>();
  const tenantSlug = routeParams.tenantSlug;
  const ctx = useTenant();
  if (ctx.role !== 'tenant_admin' && !ctx.permissions.canSale) redirect(`/t/${tenantSlug}`);

  const form = useSaleForm();

  const selectClass =
    'h-8 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)]/20';

  /* ─── Shared field fragments ─── */

  const customerLocationFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Location *
        </Label>
        <select
          value={form.locationId}
          onChange={(e) => form.setLocationId(e.target.value)}
          className={selectClass}
        >
          <option value="">Select location</option>
          {form.locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.code ? `${loc.code} - ` : ''}
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Transporter Name
        </Label>
        <Input
          value={form.transporterName}
          onChange={(e) => form.setTransporterName(e.target.value)}
          placeholder="Enter transporter name"
          className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Vehicle Number
        </Label>
        <Input
          value={form.vehicleNumber}
          onChange={(e) => form.setVehicleNumber(e.target.value)}
          placeholder="e.g. MH-12-AB-1234"
          className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Driver Name
        </Label>
        <Input
          value={form.driverName}
          onChange={(e) => form.setDriverName(e.target.value)}
          placeholder="Enter driver name"
          className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
          Driver Phone
        </Label>
        <Input
          inputMode="tel"
          value={form.driverPhone}
          onChange={(e) => form.setDriverPhone(e.target.value)}
          placeholder="Enter phone number"
          className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
    </div>
  );

  const itemsFields = (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={form.addItem}
          className="h-7 text-xs font-mono border-border text-[var(--text-body)] hover:bg-muted hover:text-foreground"
        >
          + Add Row
        </Button>
      </div>
      {form.items.map((item) => (
        <div key={item.key} className="rounded-lg border border-border p-3 space-y-3 bg-[var(--bg-off)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Line Item</span>
            <button
              type="button"
              onClick={() => form.removeItem(item.key)}
              className="text-[var(--text-dim)] hover:text-[var(--red)] text-sm font-mono"
            >
              x
            </button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Item</Label>
            <select
              value={item.commodity_id}
              onChange={(e) => form.updateItem(item.key, 'commodity_id', e.target.value)}
              className={selectClass}
            >
              <option value="">Select</option>
              {form.commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} - ` : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Unit</Label>
              <select
                value={item.unit_id}
                onChange={(e) => form.updateItem(item.key, 'unit_id', e.target.value)}
                className={selectClass}
              >
                <option value="">Select</option>
                {form.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.abbreviation ?? u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Qty</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0.01"
                value={item.quantity}
                onChange={(e) => form.updateItem(item.key, 'quantity', e.target.value)}
                placeholder="0"
                className="border-border bg-background text-foreground font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Bags</Label>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={item.bags}
                onChange={(e) => form.updateItem(item.key, 'bags', e.target.value)}
                placeholder="0"
                className="border-border bg-background text-foreground font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Unit Price</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={item.unit_price}
                onChange={(e) => form.updateItem(item.key, 'unit_price', e.target.value)}
                placeholder="0.00"
                className="border-border bg-background text-foreground font-mono"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const notesReviewFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => form.setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={3}
          className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
        />
      </div>
      <div className="rounded-lg border border-border p-3 space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Summary</h3>
        <p className="text-sm">
          <span className="text-[var(--text-muted)]">Location:</span>{' '}
          {form.locations.find((l) => l.id === form.locationId)?.name || '—'}
        </p>
        <p className="text-sm">
          <span className="text-[var(--text-muted)]">Items:</span>{' '}
          {form.items.filter((i) => i.commodity_id).length} line item(s)
        </p>
        {form.items.filter((i) => i.commodity_id).map((item) => {
          const commodity = form.commodities.find((c) => c.id === item.commodity_id);
          const unit = form.units.find((u) => u.id === item.unit_id);
          return (
            <p key={item.key} className="text-sm ml-3">
              {commodity?.name || '?'} — {item.quantity} {unit?.abbreviation ?? unit?.name ?? ''}
              {item.unit_price ? ` @ ${item.unit_price}` : ''}
            </p>
          );
        })}
      </div>
      {form.error && (
        <div className="rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
          {form.error}
        </div>
      )}
    </div>
  );

  /* ─── Mobile stepper steps ─── */

  const mobileSteps: StepConfig[] = [
    {
      label: 'Customer',
      content: customerLocationFields,
      validate: form.validateCustomerLocation,
    },
    {
      label: 'Items',
      content: itemsFields,
      validate: form.validateItems,
    },
    {
      label: 'Review',
      content: notesReviewFields,
    },
  ];

  return (
    <>
      {/* ─── Mobile ─── */}
      <div className="block md:hidden">
        {form.error && (
          <div className="mx-4 mt-2 rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
            {form.error}
          </div>
        )}
        <TransactionStepper
          steps={mobileSteps}
          onSubmit={() => form.handleSubmit()}
          submitting={form.submitting}
          submitLabel="Create Sale"
        />
      </div>

      {/* ─── Desktop ─── */}
      <div className="hidden md:block">
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-serif">
              New Sale
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record an outgoing sale to a customer
            </p>
          </div>

          {form.error && (
            <div className="rounded-lg border border-[var(--red)]/20 bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
              {form.error}
            </div>
          )}

          <form onSubmit={form.handleSubmit} className="space-y-6">
            {/* Location */}
            <FormSection title="Location">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Location *
                  </Label>
                  <select
                    required
                    value={form.locationId}
                    onChange={(e) => form.setLocationId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select location</option>
                    {form.locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code ? `${loc.code} - ` : ''}
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </FormSection>

            {/* Transport Details */}
            <FormSection title="Transport Details" defaultOpen={false} badge="optional">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Transporter Name
                  </Label>
                  <Input
                    value={form.transporterName}
                    onChange={(e) => form.setTransporterName(e.target.value)}
                    placeholder="Enter transporter name"
                    className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Vehicle Number
                  </Label>
                  <Input
                    value={form.vehicleNumber}
                    onChange={(e) => form.setVehicleNumber(e.target.value)}
                    placeholder="e.g. MH-12-AB-1234"
                    className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Driver Name
                  </Label>
                  <Input
                    value={form.driverName}
                    onChange={(e) => form.setDriverName(e.target.value)}
                    placeholder="Enter driver name"
                    className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Driver Phone
                  </Label>
                  <Input
                    value={form.driverPhone}
                    onChange={(e) => form.setDriverPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Notes
                </Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => form.setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className="border-border bg-background text-foreground placeholder:text-[var(--text-dim)]"
                />
              </div>
            </FormSection>

            {/* Items */}
            <FormSection title="Items">
              <div className="flex justify-end mb-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={form.addItem}
                  className="h-7 text-xs font-mono border-border text-[var(--text-body)] hover:bg-muted hover:text-foreground"
                >
                  + Add Row
                </Button>
              </div>
              <div className="-mx-4 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground px-4 py-2">
                          Item
                        </th>
                        <th className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground px-4 py-2">
                          Unit
                        </th>
                        <th className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 w-28">
                          Quantity
                        </th>
                        <th className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 w-24">
                          Bags
                        </th>
                        <th className="text-left text-xs font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 w-28">
                          Unit Price
                        </th>
                        <th className="w-12 px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item) => (
                        <tr
                          key={item.key}
                          className="border-b border-border"
                        >
                          <td className="px-4 py-2">
                            <select
                              required
                              value={item.commodity_id}
                              onChange={(e) =>
                                form.updateItem(item.key, 'commodity_id', e.target.value)
                              }
                              className={selectClass}
                            >
                              <option value="">Select</option>
                              {form.commodities.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.code ? `${c.code} - ` : ''}
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              required
                              value={item.unit_id}
                              onChange={(e) =>
                                form.updateItem(item.key, 'unit_id', e.target.value)
                              }
                              className={selectClass}
                            >
                              <option value="">Select</option>
                              {form.units.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.abbreviation ?? u.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              required
                              type="number"
                              step="any"
                              min="0.01"
                              value={item.quantity}
                              onChange={(e) =>
                                form.updateItem(item.key, 'quantity', e.target.value)
                              }
                              placeholder="0"
                              className="border-border bg-background text-foreground font-mono"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={item.bags}
                              onChange={(e) =>
                                form.updateItem(item.key, 'bags', e.target.value)
                              }
                              placeholder="0"
                              className="border-border bg-background text-foreground font-mono"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) =>
                                form.updateItem(item.key, 'unit_price', e.target.value)
                              }
                              placeholder="0.00"
                              className="border-border bg-background text-foreground font-mono"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => form.removeItem(item.key)}
                              className="text-[var(--text-dim)] hover:text-[var(--red)] text-sm font-mono"
                              title="Remove row"
                            >
                              x
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </FormSection>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={form.submitting}
                variant="orange"
              >
                {form.submitting ? 'Creating...' : 'Create Sale'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.router.push(`/t/${tenantSlug}/sales`)}
                className="border-border text-[var(--text-body)] hover:bg-muted hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
