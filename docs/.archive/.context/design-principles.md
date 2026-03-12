# WareOS Design Principles

> Authoritative checklist for visual design reviews. Derived from `.claude/context/design_reference.html` Section 12.
> When reviewing UI changes, every item below is a mandatory pass/fail check.

---

## I. WareOS Non-Negotiable Rules (Section 12)

These 7 rules come directly from the WareOS design spec. Any violation is a **Blocker**.

1. **White cards on off-white pages.**
   Page background is always `--bg-off: #F5F5F3`. Cards and panels are always `--bg-base: #FFFFFF`. Never invert this.

2. **Typography roles are absolute.**
   - **Hedvig Letters Serif** → page titles + KPI display values only
   - **Space Mono** → table headers (10px, uppercase, 0.08em tracking, `--text-dim`), sequence numbers (bold 11–12px, `--accent-color` on active entry), timestamps, badges
   - **Rethink Sans** → all other UI text

3. **Orange marks every interaction point.**
   - CTA buttons are pills: `height: 48px; border-radius: 9999px; active:scale(0.98)`
   - Focused inputs: `border-color: var(--accent-color); box-shadow: 0 0 0 3px rgba(244,95,0,0.1)`
   - These are non-negotiable.

4. **Orange left-border = active nav.**
   Sidebar active state requires ALL THREE together:
   - `border-left: 2px solid var(--accent-color)`
   - `background: var(--accent-tint)`
   - `color: var(--accent-color)`
   Never partially applied.

5. **Status badges pill; type labels rect. Never mix.**
   - `.badge` (received / dispatched / confirmed / cancelled) → `border-radius: 9999px`
   - `.type-badge` (DISPATCH / PURCHASE / SALE) → `border-radius: 4px`

6. **`--accent-color` is canonical orange (`#F45F00`); `--accent-tint` for 6% surface.**
   > **Implementation note:** In this codebase, `--accent-color: #F45F00` is the WareOS orange token
   > (in `src/app/globals.css` line 91). shadcn/ui occupies `--accent` with the 6% tint, so `--accent-color`
   > is used instead of `--accent` to avoid collision.

7. **Never use inline color values; always use tokens.**
   Every color reference must go through a CSS custom property. Exception: brand-hex values in comments.

---

## II. Token Reference

Quick-check table for review. All defined in `src/app/globals.css`.

### Brand Colors
| Token | Value | Usage |
|---|---|---|
| `--accent-color` | `#F45F00` | Primary CTA, active nav, focus rings, orange badges |
| `--accent-dark` | `#C94F00` | CTA hover state |
| `--accent-tint` | `rgba(244,95,0,0.06)` | Active nav bg, row highlights, subtle surfaces |
| `--orange-bg` | `rgba(244,95,0,0.08)` | Badge tint for dispatched/orange status |

### Page Structure
| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#FFFFFF` | Cards, panels, modal content |
| `--bg-off` | `#F5F5F3` | Page backgrounds |
| `--bg-ink` | `#080808` | Deep dark surfaces (tooltips) |

### Typography
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#000000` | Headings, labels |
| `--text-body` | `#1C1C1C` | Body copy |
| `--text-muted` | `#575757` | Secondary text |
| `--text-dim` | `#A3A3A3` | Table headers, placeholders |

### Status Colors
| Token | Color | `*-bg` tint (8%) |
|---|---|---|
| `--green` | `#16A34A` | `--green-bg: rgba(22,163,74,0.08)` |
| `--blue` | `#2563EB` | `--blue-bg: rgba(37,99,235,0.08)` |
| `--red` | `#DC2626` | `--red-bg: rgba(220,38,38,0.08)` |

### Layout & Sizing
| Token | Value |
|---|---|
| `--header-h` | `60px` |
| `--sidebar-w` | `240px` |
| `--content-px` | `28px` |
| `--btn-h-lg` | `48px` (primary CTA) |
| `--btn-h` | `40px` (standard button) |
| `--btn-h-sm` | `36px` (compact button) |
| `--input-h` | `38px` |

---

## III. Responsiveness

Test at three breakpoints:
- **Desktop**: 1440px width
- **Tablet**: 768px width
- **Mobile**: 375px width

Mobile-specific patterns live in `src/components/mobile/`:
- `mobile-receive-form.tsx` — card layout, `inputMode` numeric/text, sticky submit button
- Responsive dual-form pattern on `/dispatches/[id]/receive`: `block md:hidden` (mobile) + `hidden md:block` (desktop)

---

## IV. Component-Specific Rules

### Tables
- Headers: Space Mono, 10px, uppercase, `--text-dim`, 0.08em letter-spacing
- Row height: `--table-cell-py: 11px` vertical padding
- Sequence numbers (DSP-000001): Space Mono, bold, 11–12px; accent color on latest/active entry

### Badges (Status)
```
.badge.received   → green-bg / green
.badge.dispatched → orange-bg / accent-color
.badge.confirmed  → blue-bg / blue
.badge.cancelled  → muted
```
All with `border-radius: 9999px` (pill).

### Type Labels
```
.type-badge.dispatch  → orange-bg / accent-color
.type-badge.purchase  → blue-bg / blue
.type-badge.sale      → green-bg / green
```
All with `border-radius: 4px` (rect).

### Toasts / Alerts
- Success: `--green` with `--green-bg`
- Error: `--red` with `--red-bg`
- Info: `--blue` with `--blue-bg`

### Empty States
- Center-aligned, `--text-muted` color
- Optionally a simple line-art SVG (no heavy illustrations)
- CTA button if there is a clear primary action

### KPI Cards
- Value: Hedvig Letters Serif, `--fs-2xl` (28px), `--kpi-letter-spacing: -0.5px`
- Label: Rethink Sans, `--fs-sm` (12px), `--text-muted`
- On white (`--bg-base`) card with `--card-padding: 20px`

---

## V. Multi-Tenancy Navigation

All app routes are `/t/[tenantSlug]/...`. When navigating in Playwright reviews:
- Replace `[tenantSlug]` with a real slug (e.g., `demo`, `test-tenant`, or whatever slug exists in the dev DB)
- The dev server runs on `http://localhost:3000`
- Common review URLs:
  - `http://localhost:3000/t/{slug}/` (dashboard)
  - `http://localhost:3000/t/{slug}/dispatches`
  - `http://localhost:3000/t/{slug}/purchases`
  - `http://localhost:3000/t/{slug}/sales`
  - `http://localhost:3000/t/{slug}/inventory`
  - `http://localhost:3000/t/{slug}/returns`
