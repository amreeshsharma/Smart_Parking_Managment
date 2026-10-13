---
name: ParkSmart System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system targets facility operators, municipal transport managers, and commercial drivers who need real-time clarity, rapid decision-making, and effortless spatial tracking. The brand voice is precise, operational, and reassuringly modern.

The design language balances **Modern SaaS Minimalism** with high-clarity data delivery:
- **Clean surfaces**: Pure white containers grounded against subtle cool slate canvasses.
- **Micro-elevation & crisp dividers**: 1px structural borders paired with ambient diffused drop shadows to convey structural depth without visual noise.
- **Intentional signaling**: Neutral interfaces where deliberate status pigments (emerald, amber, rose, and slate) immediately communicate occupancy, revenue, and sensor states.

## Colors

The palette uses high-contrast typography, quiet backdrops, and unambiguous semantic indicators tailored for real-time monitoring interfaces.

### Core Swatches
- **Primary Indigo**: `#4F46E5` (Active states, key call-to-actions, primary telemetry paths)
- **Primary Hover**: `#4338CA` (Interactive emphasis, pressed triggers)
- **Primary Tint**: `#EEF2FF` (Active selection highlights, subtle badge fills)
- **Base Canvas**: `#FFFFFF` (Card surfaces, active tabs, floating panels)
- **Subtle Surface**: `#F8FAFC` (App background, dashboard section backplates)
- **Hairline Border**: `#E2E8F0` (Structural containers, grid tables, input outlines)

### Semantic & Status Roles
- **Available / Paid / Completed**: `#10B981` (Solid), `#ECFDF5` (Soft Fill), `#A7F3D0` (Border)
- **Reserved / Pending**: `#F59E0B` (Solid), `#FEF3C7` (Soft Fill), `#FDE68A` (Border)
- **Occupied / Failed / Overstay**: `#EF4444` (Solid), `#FEF2F2` (Soft Fill), `#FECACA` (Border)
- **Cancelled / Neutral**: `#64748B` (Solid), `#F1F5F9` (Soft Fill), `#CBD5E1` (Border)

### Neutral Text Hierarchy
- **Primary Slate**: `#0F172A` (Metrics, card titles, table headers)
- **Secondary Slate**: `#334155` (Standard body copy, data cells)
- **Muted Slate**: `#64748B` (Metadata, unit captions, input placeholders)

## Typography

The type scale uses **Inter** throughout all tiers to maintain legibility across dense data tables, interactive parking floor maps, and KPI metrics.

- **Numerics & Metrics**: Use `tabular-nums` (monospaced figures) for dwell times, financial totals, license plates, and bay counts to eliminate layout shifting during live stream updates.
- **Letter Spacing**: Subtle negative tracking (`-0.01em` to `-0.02em`) is applied to headers `headline-md` and above for a cohesive display appearance.
- **Capitalization**: Status tags, sensor state micro-labels, and column sorting headings utilize sentence case or controlled uppercase at `label-xs` with `+0.03em` tracking.

## Layout & Spacing

The layout is built on an **8-point grid rhythm** with an adaptive 12-column layout for dashboard structures:

- **Desktop (1280px+)**: 12-column layout with 24px (`1.5rem`) gutters and a max canvas width of `1440px`. Global margin set to `2rem`.
- **Tablet (768px - 1279px)**: 8-column layout with 20px gutters and `1.5rem` outer page margins. Operational sidebars collapse into drawer navigation or compact icon bars.
- **Mobile (< 768px)**: 4-column layout with 16px (`1rem`) gutters and `1rem` outer canvas padding. Analytical charts and slot matrices reflow into vertically stacked single-column feeds.
- **Component Breathing Room**: Metric values require a minimum of `space-md` separation from their descriptive labels. Cards leverage `space-lg` internal inset padding.

## Elevation & Depth

Visual hierarchy uses flat, neutral layering paired with soft, low-intensity ambient shadows.

- **Level 0 (Flat Surface)**: The default background (`#F8FAFC`). No shadow, no outline.
- **Level 1 (Card & Slot Grids)**: Crisp white (`#FFFFFF`) background with a 1px solid `#E2E8F0` border and `shadow-sm` (`0 1px 2px 0 rgba(15, 23, 42, 0.05)`).
- **Level 2 (Popovers, Tooltips & Filter Menus)**: `#FFFFFF` surface, 1px `#E2E8F0` border, with `shadow-md` (`0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`).
- **Level 3 (Modals & Bay Reservation Sheets)**: `#FFFFFF` surface with `shadow-xl` (`0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`). Backdrop layer: `rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`.

## Shapes

The design uses a clean geometry that combines 12px structural boundaries with fully rounded interactive and semantic items:

- **Structural Cards, Panels & Modal Shells**: `12px` (`0.75rem`, `rounded-xl`).
- **Form Controls & Inputs**: `12px` (`0.75rem`, `rounded-xl`) for consistent alignment when placed alongside or inside card modules.
- **Primary Buttons & Action Triggers**: Fully rounded pill geometry (`9999px`) to create clear tactile contrast against square panels.
- **Status Badges & Bay Indicators**: Fully rounded pill geometry (`9999px`) ensuring operational states stand out from container borders.

## Components

### Buttons
- **Primary Button**: Full pill radius (`9999px`), background `#4F46E5`, text `#FFFFFF`, font `label-md`. Height 40px, horizontal padding `1.25rem`. Hover state transitions to `#4338CA`. Active state scales subtly (`scale(0.98)`).
- **Secondary Button**: Full pill radius, background `#FFFFFF`, text `#334155`, 1px border `#E2E8F0`. Hover uses `#F8FAFC` with border `#CBD5E1`.
- **Ghost/Tertiary**: No border, text `#4F46E5`, transparent background, hover background `#EEF2FF`.

### Status Badges & Chips
- **Geometry**: Height 24px, pill-shaped (`9999px`), padding: 0 10px. Typographic rule: `label-xs`.
- **Variants**:
  - *Available*: Background `#ECFDF5`, text `#10B981`, border 1px `#A7F3D0`. Includes a 6px solid `#10B981` leading status dot.
  - *Reserved*: Background `#FEF3C7`, text `#D97706`, border 1px `#FDE68A`.
  - *Occupied*: Background `#FEF2F2`, text `#EF4444`, border 1px `#FECACA`.
  - *Overstay / Failed*: Background `#FEF2F2`, text `#B91C1C`, border 1px `#FECACA` with warning icon prefix.
  - *Cancelled*: Background `#F1F5F9`, text `#64748B`, border 1px `#CBD5E1`.

### Input Fields & Selects
- **Base Input**: Height 44px, border radius 12px (`rounded-xl`), background `#FFFFFF`, border 1px solid `#E2E8F0`, typography `body-md`, placeholder color `#64748B`.
- **Focus State**: Border color `#4F46E5`, box-shadow `0 0 0 3px rgba(79, 70, 229, 0.12)`.
- **Input with Add-on**: Icon prefix set to `#64748B` with 12px horizontal inset.

### Checkboxes & Radio Buttons
- **Checkbox**: Size 18px by 18px, rounded 4px. Unchecked: 1px border `#CBD5E1`, background `#FFFFFF`. Checked: background `#4F46E5`, border `#4F46E5`, with white check icon.
- **Radio**: Size 18px by 18px, fully round. Checked displays a solid `#4F46E5` center circle (8px) within a white field and `#4F46E5` outer ring.

### Cards & Container Panels
- **Standard Card**: Background `#FFFFFF`, 1px border `#E2E8F0`, border-radius 12px (`rounded-xl`), shadow `shadow-sm`, padding `1.5rem`.
- **Interactive Bay Slot Card**: Background `#FFFFFF`, border 1px solid `#E2E8F0`, rounded 12px. Includes subtle hover transition to 1px border `#4F46E5` and `shadow-md`. Top-right anchor accommodates the status badge.

### Parking Bay Grid Indicator
- Specialized micro-component displaying real-time space status (e.g., "A-12"). Shows slot ID in `label-sm` font, centered, with semantic light tint backgrounds and matching 1px solid borders reflecting occupancy status.