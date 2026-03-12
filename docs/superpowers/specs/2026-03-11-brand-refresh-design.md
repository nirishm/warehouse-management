# Stow — Brand Refresh & Experience Architecture Design Spec

**Date**: 2026-03-11
**Status**: Approved
**Replaces**: WareOS brand, current monolithic route tree

---

## 1. Name

**Stow**

One syllable. Directly English: *"to stow goods"* — the act of placing cargo correctly and securely. Nautical in origin, which gives it precision and purpose without being jargon-heavy. Pronounceable without distortion in Hindi, Tamil, and Telugu. No existing SaaS or WMS brand conflict.

**Domain recommendation**: `stow.app` (preferred) or `getstow.com` (fallback). `.in` for India-specific landing page.

---

## 2. Logo

### Icon
Stacked-layers SVG representing warehouse goods organized in tiers. Four rectangles tapering from wide at the base to narrow at the top — the physical metaphor of stacked pallets in a godown.

```svg
<svg width="64" height="58" viewBox="0 0 64 58" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6"  y="43" width="52" height="15" rx="5" fill="#E8520A"/>
  <rect x="13" y="28" width="38" height="13" rx="4" fill="#F07030"/>
  <rect x="20" y="14" width="24" height="13" rx="4" fill="#F5A472" opacity="0.9"/>
  <rect x="26" y="2"  width="12" height="11" rx="3" fill="#FAC8A8" opacity="0.75"/>
</svg>
```

The orange gradient reads as energy and heat at the bottom (the floor, the work) fading to lightness at the top (the overview, the control).

### Wordmark
- **Font**: Hedvig Letters Serif
- **Case**: Title case — **"Stow"** (not "STOW")
- **Color**: `#0A0A0A` on light, `#FFFFFF` on dark
- **Weight**: Regular (the serif itself carries authority — no need for bold)

### Lockup
Icon left, wordmark right. Gap proportional to icon height (approx. 28% of icon width at each size).

| Size    | Icon      | Font size | Gap  |
|---------|-----------|-----------|------|
| Small   | 28×25px   | 22px      | 9px  |
| Medium  | 44×40px   | 36px      | 13px |
| Large   | 64×58px   | 56px      | 18px |

### On Dark Backgrounds
Icon uses burnt orange scale: `#F45F00` → `#CC4E00` → `#993C00` → `#662800`.

### On Brand Orange (`#F45F00`) Background
Icon uses white rgba layers: `rgba(255,255,255,0.95)` → `0.65` → `0.40` → `0.20`. Wordmark white.

---

## 3. Color Palette — "Orange Signal"

The current WareOS orange `#F45F00` is retained as the anchor. Everything else is recalibrated around it to add warmth and reduce the cold Swiss-editorial feel.

**Important**: The existing design system uses `--accent-color: #F45F00` for the brand orange (not `--accent`, which shadcn/ui reserves for its 6% tint background). All references below use the correct token names.

| Token              | Value       | Usage |
|--------------------|-------------|-------|
| `--accent-color`   | `#F45F00`   | Primary CTA, active states, brand orange (token name unchanged) |
| `--accent-dark`    | `#C94F00`   | Hover/pressed states on accent |
| `--accent-tint`    | `#F45F000F` | 6% tint for accent backgrounds (same as current) |
| `--bg-base`        | `#FFFFFF`   | Page backgrounds (unchanged) |
| `--bg-off`         | `#F7F6F4`   | Cards, inputs, secondary surfaces (warmer: was `#F5F5F3`) |
| `--bg-ink`         | `#0A0A0A`   | App header (worker app), dark surfaces (new token) |
| `--text-primary`   | `#0A0A0A`   | Body text, headings (unchanged) |
| `--text-body`      | `#1A1A1A`   | Standard body copy (unchanged) |
| `--text-muted`     | `#666666`   | Secondary labels (was `#575757` — intentional refresh) |
| `--text-dim`       | `#999999`   | Placeholder, disabled (was `#A3A3A3` — intentional refresh) |

Status colors (unchanged): `--status-green`, `--status-blue`, `--status-red` with 8% tint variants.

---

## 4. Typography System

### Fonts
| Role | Font | Weights | Notes |
|------|------|---------|-------|
| All UI | Rethink Sans | 400, 600, 800 | Replaces Inter + Space Mono |
| Brand / display | Hedvig Letters Serif | Regular | Wordmark only; optional for hero headings |

**Space Mono is removed entirely.** No monospace font in the design system.

### Why Rethink Sans 800 Instead of Monospace
Sequence numbers (DSP-000001, PUR-000001) and badge labels previously used Space Mono for visual distinction. Rethink Sans 800 provides the same weight-based differentiation without introducing a third font family. It also renders better on low-end Android displays where monospace fonts can appear too thin.

### Type Scale

The existing `globals.css` defines `--fs-*` tokens (`--fs-xs: 10px`, `--fs-sm: 12px`, `--fs-base: 14px`, etc.). The new scale adjusts these values slightly for warmth; the token names are kept so existing components need no class changes, only the token values update.

| Token / Name | Old Size | New Size | Weight | Usage |
|---|---|---|---|---|
| Display (new) | — | 32px | 800 | Page titles |
| `--fs-xl` / Heading 1 | 20px | 24px | 700 | Section headings |
| `--fs-lg` / Heading 2 | 18px | 18px | 600 | Card titles (unchanged) |
| `--fs-base` / Body | 14px | 15px | 400 | All body copy (+1px for warmth) |
| `--fs-sm` / Label | 12px | 13px | 600 | Field labels, table headers |
| `--fs-xs` / Small | 10px | 12px | 400/600 | Captions, metadata |
| Sequence (new class) | Space Mono 12px | 13px / 800 | 800 | Transaction codes, badges |

Components using `text-[--fs-base]` will automatically pick up the 15px value after the token update. The `font-['Space_Mono']` class is replaced with `font-sans font-extrabold` (Rethink Sans 800).

---

## 5. Three-Tier Experience Architecture

### Core Principle
The three tiers serve fundamentally different emotional jobs. They currently share one route tree — this creates bundle bloat and UX compromise. They must be separated into route groups within the same Next.js app.

### Tier Map

```
Tier 1 — Worker App    /t/[slug]/app/
  Emotional job: CONFIRM ("I did this correctly")
  Device: Phone only, cheap Android (₹5k–₹12k range)
  Interaction: QR scan → number entry → submit
  Constraints: Light bundle, offline-tolerant, 44px targets, 3 screens max

Tier 2 — Manager App   /t/[slug]/manage/
  Emotional job: OVERSEE ("Is everything on track?")
  Device: Phone + web
  Interaction: Review transactions, approve, quick-create, check alerts
  Constraints: Responsive, notification-first, current feature set

Tier 3 — Admin App     /t/[slug]/settings/
  Emotional job: CONFIGURE ("I set the rules")
  Device: Web primary, mobile secondary
  Interaction: Module config, user management, analytics, integrations
  Constraints: Full power, less mobile-optimized OK
```

### Route Group Structure

The current tenant route tree lives at `src/app/t/[tenantSlug]/` (outside the `(platform)` group — only admin pages are under `(platform)`). The refactor introduces route groups inside this existing tree:

```
src/app/t/[tenantSlug]/
  (worker)/app/         ← Tier 1 — minimal layout, bottom nav
  (manager)/manage/     ← Tier 2 — current feature set, responsive sidebar
  (admin)/settings/     ← Tier 3 — full admin, web-first layout
  layout.tsx            ← Keep as shared root (auth + TenantProvider)
```

The existing `layout.tsx` at `src/app/t/[tenantSlug]/layout.tsx` handles auth and `TenantProvider` — it becomes the root layout. Each route group's inner `layout.tsx` handles only the nav chrome (sidebar, bottom nav, minimal). This avoids duplicating auth logic.

Code-splitting at the route group level means the worker app does not load the sidebar, global search, or other manager/admin components.

---

### 5.1 Tier Access Control

The current auth system uses `role` (from `membership.role`) and `permissions` (from `user_profiles.permissions`). The existing roles are `tenant_admin` and `member`. The three-tier split maps onto these as follows:

| Tier | Allowed roles | Access check location |
|------|--------------|----------------------|
| Worker (`/app/`) | `member` | `(worker)/app/layout.tsx` — redirects `tenant_admin` to `/manage/` |
| Manager (`/manage/`) | `member`, `tenant_admin` | No role gate needed — existing permissions govern feature access |
| Admin (`/settings/`) | `tenant_admin` only | `(admin)/settings/layout.tsx` — redirects non-admin to `/manage/` |

No new roles or permissions are introduced in Phase 1. A `worker` role distinction (for workers who should be locked to `/app/` only) is a Phase 2 consideration — not in scope for the initial route group refactor.

---

## 6. Worker App UX Spec

Reference mockup: `.superpowers/brainstorm/28342-1773207282/stow-worker-final.html` (relative to project root; this is a brainstorm artifact served by the local dev companion server — open via `http://localhost:58584` when the server is running)

### Layout
- **Status bar**: System status bar (transparent, dark icons)
- **App header**: Full-width, `--bg-ink` (`#0A0A0A`), contains "Stow" lockup pill left, operator avatar right
- **Content area**: White background, scrollable
- **Bottom nav**: 4 tabs (Home, Dispatch, Receive, Stock), 44px height, active state in `--accent-color`

The worker app gets its **own layout** (`src/app/t/[tenantSlug]/(worker)/app/layout.tsx`) that replaces the existing `MobileBottomNav` + `Sidebar` + `Header` trio with a simpler structure: ink header + worker-specific bottom nav. The existing `MobileBottomNav` component (`src/components/layout/mobile-bottom-nav.tsx`) continues to serve the manager tier unchanged. A new `WorkerBottomNav` component is created for the worker tier.

### Home Screen
- **Greeting**: Hedvig serif greeting — "Good morning, [Name]" — humanises the app for floor workers
- **Quick-action grid**: 2×2 grid of cards
  - New Dispatch — full accent orange (`#F45F00`), white text
  - Receive Goods — off-white card, orange icon
  - New Sale — off-white card, orange icon
  - View Stock — off-white card, orange icon
- **Recent activity**: "My Recent Activity" section — last 5 transactions by this operator. Each row: sequence number (Rethink Sans 800), type pill, commodity name, quantity, timestamp.

### Form Screens
- Single-column, scrollable
- Sticky submit bar at bottom (above bottom nav)
- Item cards for line items: commodity name, quantity input (large, numeric keyboard), unit
- Accordion for optional fields
- Toast confirmation on submit

### Performance Constraints (Low-end Android)
- No heavy animations (no CSS transforms on scroll)
- Touch targets minimum 44px
- Input `inputMode="numeric"` on quantity fields (triggers numeric keyboard)
- Images lazy-loaded, icons inline SVG only
- No client-side data fetching waterfalls — Server Components for initial data

---

## 7. Infrastructure Changes Required

### Phase 1 — Route Groups (No functionality change)
Refactor `src/app/t/[tenantSlug]/...` into three route groups with separate layouts. Existing feature routes move into `(manager)/manage/`. Worker and admin route groups start empty (redirect to existing routes until built out).

**Files to change:**
- `src/app/t/[tenantSlug]/layout.tsx` — keep as root; remove nav chrome (Sidebar, Header, MobileBottomNav); delegate to child layouts
- `src/app/t/[tenantSlug]/(manager)/manage/layout.tsx` — new file; contains Sidebar + Header + MobileBottomNav (current chrome)
- `src/app/t/[tenantSlug]/(worker)/app/layout.tsx` — new file; contains ink header + WorkerBottomNav only
- `src/app/t/[tenantSlug]/(admin)/settings/layout.tsx` — new file; web-first layout (no bottom nav)
- All existing routes under `dispatches/`, `purchases/`, `sales/`, `inventory/`, etc. move into `(manager)/manage/`

**Auth gating across tiers (see also Section 5.1 below):** The root `layout.tsx` retains all auth logic (`getCurrentUser`, `getMembership`, `TenantProvider`). Route group layouts add tier-specific access checks based on the `role` from `TenantContext`.

### Phase 2 — Worker App Bundle Optimization
- Move `@react-pdf/renderer` calls to server-side API routes (removes ~1MB from client bundle)
- Worker layout excludes sidebar, global search, and other manager-only components
- Add `next/font` for Rethink Sans + Hedvig (removes Google Fonts CDN dependency, improves load on slow connections)

### Phase 3 — Offline Capability (Later)
- Add service worker via `next-pwa` or custom SW
- Cache: stock lookup data, pending transaction queue
- Sync queue flushes on reconnect
- Required for worker app in low-connectivity warehouse environments

### Phase 4 — Camera Barcode Scanning (Later)
- Add `@zxing/browser` for camera-based QR/barcode scanning in worker app
- Falls back to manual input if camera unavailable
- Evaluate performance on target devices before committing

---

## 8. Design Token Migration

The following CSS token changes apply across the design system:

| Token / Element | Old Value | New Value | Notes |
|----------------|-----------|-----------|-------|
| `--bg-off` | `#F5F5F3` | `#F7F6F4` | Warmer off-white |
| `--text-muted` | `#575757` | `#666666` | Intentional refresh |
| `--text-dim` | `#A3A3A3` | `#999999` | Intentional refresh |
| `--fs-base` | `14px` | `15px` | +1px for warmth |
| `--fs-sm` | `12px` | `13px` | +1px for warmth |
| `--fs-xs` | `10px` | `12px` | +2px for readability |
| `--bg-ink` | (none) | `#0A0A0A` | New token for dark surfaces |
| `font-family: 'Space Mono'` | Space Mono | (removed) | Replace with Rethink Sans 800 |
| Sequence/badge style | `font-['Space_Mono']` | `font-sans font-extrabold` | Rethink Sans 800 |
| Brand font | (none) | Hedvig Letters Serif | Added for logo wordmark only |
| `--accent-color` | `#F45F00` | `#F45F00` | Unchanged — core brand color |

`--accent` (shadcn 6% tint) and all other existing tokens remain untouched.

---

## 9. Verification

### Logo
- [ ] SVG renders cleanly at 16px, 32px, 64px, 128px
- [ ] On dark background variant reads clearly
- [ ] On orange background variant reads clearly
- [ ] Hedvig Letters Serif loads correctly via `next/font`

### Colors
- [ ] All 4 status colors pass WCAG AA contrast on `--bg-base`
- [ ] `--accent-color` orange passes contrast on `--bg-ink` (dark header)
- [ ] Accent tint cards are visually distinct from `--bg-off` cards

### Typography
- [ ] No `font-family: 'Space Mono'` remains in codebase after migration
- [ ] Sequence numbers (DSP-000001) render with Rethink Sans 800
- [ ] Hedvig serif renders correctly in the logo lockup

### Worker App
- [ ] Home screen renders at 375px width without horizontal scroll
- [ ] Quick-action grid is 2×2 on 375px
- [ ] All touch targets ≥ 44px height
- [ ] Quantity inputs open numeric keyboard on Android
- [ ] Submit bar stays sticky above bottom nav

### Three-Tier Routing
- [ ] Worker routes do not load manager/admin bundles
- [ ] Existing manager routes unchanged after route group refactor
- [ ] Each tier has correct layout (bottom nav / sidebar / minimal)
