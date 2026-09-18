---
name: ParkSmart System
colors:
  surface: '#f6fafb'
  surface-dim: '#d6dbdc'
  surface-bright: '#f6fafb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4f5'
  surface-container: '#eaeef0'
  surface-container-high: '#e5e9ea'
  surface-container-highest: '#dfe3e4'
  on-surface: '#181c1d'
  on-surface-variant: '#3d4948'
  inverse-surface: '#2c3132'
  inverse-on-surface: '#edf1f2'
  outline: '#6d7a78'
  outline-variant: '#bcc9c7'
  surface-tint: '#006a66'
  primary: '#006764'
  on-primary: '#ffffff'
  primary-container: '#00827e'
  on-primary-container: '#f3fffd'
  inverse-primary: '#62d9d3'
  secondary: '#4e5f7b'
  on-secondary: '#ffffff'
  secondary-container: '#ccdeff'
  on-secondary-container: '#51627e'
  tertiary: '#545d63'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c767c'
  on-tertiary-container: '#fbfdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#81f5ef'
  primary-fixed-dim: '#62d9d3'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#00504d'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#b6c7e8'
  on-secondary-fixed: '#091c34'
  on-secondary-fixed-variant: '#374762'
  tertiary-fixed: '#dae4eb'
  tertiary-fixed-dim: '#bec8ce'
  on-tertiary-fixed: '#131d22'
  on-tertiary-fixed-variant: '#3e484e'
  background: '#f6fafb'
  on-background: '#181c1d'
  surface-variant: '#dfe3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.75rem
    letterSpacing: -0.03em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.04em
  numeric-metric:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers an executive, calm, and precision-driven spatial intelligence experience for enterprise parking operators, airports, commercial real estate developers, and municipal logistics teams. 

The aesthetic is Modern Enterprise Precision, pairing clean European software architecture with tactile, luminous environmental data visualization. It avoids hyper-dense dark command-center clichés in favor of an airy, cool-toned daylight palette that reduces visual fatigue across 10-hour operations desks.

The emotional goal is absolute operational clarity, premium engineering fidelity, and situational tranquility. Interface surfaces feel architectural, crisp, and elevated, drawing direct inspiration from high-end airport terminal displays, premium automotive instrument clusters, and bespoke cartography suites.

## Colors

The system uses a luminous, cool ambient base with deep architectural contrast and refined semantic status indicators:

- **Primary Teal (`#0A9F9A`)**: The kinetic driver of the interface. Applied to active navigation indicators, key primary actions, live path routing, and active bay selections. A deeper pressed state is achieved at `#087F7B`.
- **Deep Navy (`#12243D`)**: The structural anchor. Used for primary typography, authoritative data points, top-level headings, structural borders in high-contrast contexts, and key icon fills. Secondary navy tone (`#172B46`) serves table headers and sub-headers.
- **Cool Neutral Background (`#EEF2F3`)**: Canvas backdrop with a slightly cooler variant (`#E9EFF1`) for inset wells, map backgrounds, and table row zebraing.
- **Surface Pure White (`#FFFFFF`)**: High-elevation card surfaces, floating utility docks, and active modals.
- **Muted Structural Slate (`#7B858B`)**: Secondary metadata, timestamps, subtle dividers, and inactive icons.
- **Borders & Separators (`#E2E7E9`)**: Fine-line boundary definition ensuring cards separate gracefully from the canvas.

### Spatial Semantic Palette (Bay Status Engine)
- **Available (`#10B981` / light tint `#ECFDF5`)**: Soft emerald green signaling immediate availability.
- **Reserved (`#0284C7` / light tint `#F0F9FF`)**: Coordinated maritime blue for advance bookings and VIP allotments.
- **Occupied (`#EF4444` / light tint `#FEF2F2`)**: Soft coral-crimson denoting occupied spaces without alarming visual vibration.
- **Maintenance (`#F59E0B` / light tint `#FFFBEB`)**: Warm amber for offline sensors, EV charger faults, or cleaning.
- **Disabled / Permit Restricted (`#94A3B8` / light tint `#F1F5F9`)**: Neutral cool gray for deactivated or restricted zones.

## Typography

Typography relies on **Plus Jakarta Sans** across all levels to project modern, high-precision geometry while maintaining natural humanist warmth. 

- **Display & Headings**: Rendered in Deep Navy (`#12243D`) with tight negative tracking (`-0.02em` to `-0.03em`) for a sculpted architectural feel.
- **Data & Numeric Displays**: Occupancy rates, bay turnover metrics, revenue counters, and sensor readouts use tabular numbers (`font-variant-numeric: tabular-nums`) to prevent horizontal jitter during real-time telemetry streaming.
- **Labels & Micro-Indicators**: Scaled down to `0.75rem` with uppercase styling and slight positive letter tracking (`0.04em`) to maintain legibility on telemetry tags, floor-level selectors, and bay coordinates.

## Layout & Spacing

The platform is constructed on a 12-column adaptive fluid grid designed for dynamic split-screen workflows: a full-bleed interactive map or multi-level parking deck canvas paired with floating or docked contextual operational sidebars.

- **Desktop (1280px and above)**: Persistent 72px collapsed or 240px expanded navigation rail on the left. The spatial workspace uses dynamic split panels: 60% viewport reserved for the 2D/3D facility floor map, 40% reserved for live telemetry cards, revenue tables, and alert streams. Outer viewport margin is set to `2rem` (32px), with column gutters at `1.5rem` (24px).
- **Tablet Landscape (1024px - 1279px)**: Sidebars collapse into overlay slide-overs with a 16px persistent bottom dock for active level switching and zone filtering.
- **Mobile & Handheld Field App (< 1024px)**: Single column feed view with a switchable map toggle. Floating modal sheets snap to 50% and 90% screen height over the canvas map. Outer margins compress to `1rem` (16px).

## Elevation & Depth

Visual hierarchy uses a refined "floating architectural sheet" paradigm rather than standard drop shadows.

- **Canvas Base Level (z-0)**: Background `#EEF2F3` with subdued map vector veins rendered at `#DCE3E6`.
- **Card Surface Level (z-1)**: `#FFFFFF` panels featuring a soft, ultra-diffused drop shadow: `0 8px 30px rgba(20, 40, 50, 0.06)`, bounded by a crisp 1px border in `#E2E7E9`. This imparts a floating porcelain feel that prevents visual fatigue.
- **Interactive Bay Tooltips & Floating Controls (z-2)**: Controls and HUD overlays floating directly over live map vectors utilize frosted surface glass: `background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(12px); border: 1px solid rgba(226, 231, 233, 0.8); box-shadow: 0 12px 36px rgba(20, 40, 50, 0.10)`.
- **Global Modals & Inspector Drawers (z-3)**: Framed with deep backdrop atmospheric dampening `rgba(18, 36, 61, 0.28)` and elevated shadows: `0 24px 48px -12px rgba(20, 40, 50, 0.16)`.

## Shapes

The interface embraces generous, smooth curvature with tailored radius hierarchies:

- **Primary Cards & Modals**: 18px to 24px corner radii (`rounded-xl` to custom `1.5rem`). This softens complex grid structures and gives enterprise dashboards an approachable, executive product feel.
- **Buttons, Inputs & Dropdowns**: 10px to 12px corner radii for clear touch and click targets that harmonize with outer card geometry.
- **Chips, Pills, & Facility Level Selectors**: Fully pill-shaped (`9999px`) to distinguish interactive filters from structural spatial blocks.
- **Parking Bay Grid Cells**: 6px rounded edges within map viewports to reflect realistic architectural parking slot boundaries.

## Components

### Buttons & Interactive Controls
- **Primary CTA**: Background `#0A9F9A`, text `#FFFFFF`, font weight `600`, padding `10px 20px`, corner radius `10px`. Hover brings subtle brightness shift to `#087F7B` with `box-shadow: 0 4px 14px rgba(10, 159, 154, 0.35)`.
- **Secondary Action**: White surface (`#FFFFFF`), border `1px solid #E2E7E9`, text `#12243D`. Hover applies background `#F8FAFB`.
- **Ghost/Tertiary**: Text `#7B858B`, hover background `#E9EFF1` with text `#12243D`.

### Facility Status Chips & Badges
- Built using pill geometry (`border-radius: 9999px`), padding `4px 12px`, typography `label-sm`.
- Displays a 6px breathing status dot alongside the status text.
  - *Available*: Emerald tint `#ECFDF5`, text `#065F46`, dot `#10B981`.
  - *Reserved*: Blue tint `#F0F9FF`, text `#075985`, dot `#0284C7`.
  - *Occupied*: Red tint `#FEF2F2`, text `#991B1B`, dot `#EF4444`.
  - *Maintenance*: Amber tint `#FFFBEB`, text `#92400E`, dot `#F59E0B`.

### Spatial Parking Bay Tiles (Map & Matrix Views)
- Compact rectangular cards with 6px rounded corners.
- Subtle inner border `1px solid rgba(0,0,0,0.06)` with the background reflecting bay state.
- Hover activates a crisp outer glow corresponding to state color and renders an elevated micro-tooltip with bay ID, vehicle license plate, and parking duration.

### Data Cards & Metric Panels
- Crisp white background (`#FFFFFF`), 20px rounded corners, 1px border (`#E2E7E9`), padding `20px 24px`.
- Contains a top micro-label in `#7B858B`, primary metric in `numeric-metric` (`#12243D`), and trend delta badges (e.g., `+12.4% vs peak`) aligned at the base.

### Form Inputs & Search Filters
- Height `44px`, background `#FFFFFF`, border `1px solid #E2E7E9`, border radius `10px`, typography `body-md`.
- Focus ring: `outline: none; border-color: #0A9F9A; box-shadow: 0 0 0 3px rgba(10, 159, 154, 0.15)`.

### Custom Cartography Overlay Dock
- Floating horizontal dock pinned to the lower center of the map viewport.
- Translucent backdrop blur (`rgba(255, 255, 255, 0.9)`), containing floor level toggles (`B2`, `B1`, `L1`, `L2`, `Roof`) segmented by hairline borders, with the active floor highlighted in solid `#0A9F9A` with pure white typography.