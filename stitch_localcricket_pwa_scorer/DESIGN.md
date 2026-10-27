---
name: Broadcast Telemetry Cricket
colors:
  surface: '#f7f9ff'
  surface-dim: '#c6dcf4'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e2efff'
  surface-container-high: '#d8eaff'
  surface-container-highest: '#cfe5fd'
  on-surface: '#051d2f'
  on-surface-variant: '#434652'
  inverse-surface: '#1d3245'
  inverse-on-surface: '#e8f2ff'
  outline: '#737783'
  outline-variant: '#c3c6d4'
  surface-tint: '#2b5bb5'
  primary: '#003178'
  on-primary: '#ffffff'
  primary-container: '#0d47a1'
  on-primary-container: '#a1bbff'
  inverse-primary: '#b0c6ff'
  secondary: '#005db7'
  on-secondary: '#ffffff'
  secondary-container: '#64a1ff'
  on-secondary-container: '#003670'
  tertiary: '#00385c'
  on-tertiary: '#ffffff'
  tertiary-container: '#004f80'
  on-tertiary-container: '#83c1ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#00429c'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#a9c7ff'
  on-secondary-fixed: '#001b3d'
  on-secondary-fixed-variant: '#00468c'
  tertiary-fixed: '#cfe5ff'
  tertiary-fixed-dim: '#99cbff'
  on-tertiary-fixed: '#001d34'
  on-tertiary-fixed-variant: '#004a78'
  background: '#f7f9ff'
  on-background: '#051d2f'
  surface-variant: '#cfe5fd'
typography:
  display-score:
    fontFamily: Manrope
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 60px
    letterSpacing: -0.04em
  display-score-mobile:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-numeric:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: -0.01em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for an authoritative, broadcast-grade cricket scoring progressive web application. It bridges the gap between grassroots cricket and elite sports broadcasting, providing scorers, umpires, players, and spectators with high-density statistical clarity and tactical immediacy. 

The aesthetic marries high-performance technical precision with crisp, airy sports minimalism. It eschews generic soft gamification in favor of structured geometric telemetry: crisp contours, intentional boundary markers, legible tabular metrics, and decisive state transitions. 

Key attributes:
- **Authoritative & Tactical:** Evokes the precision of stadium scoreboards and international telemetry overlays.
- **Focus & Field-Optimized:** Built for outdoor daylight readability with calibrated contrast, deliberate optical weighting, and direct tap targets that eliminate entry errors during rapid play.
- **Modern Performance:** Sleek, rapid, and utility-driven, utilizing deep navy anchors and bright atmospheric whites to frame vivid match-event signals (wickets, boundaries, extras).

## Colors

The palette is engineered around an architectural daylight hierarchy. Deep navy anchors the visual structure, creating resolute contrast against sunlit glare, while specialized athletic pigments signal ball outcomes instantly across the field.

### Role Mapping
- **Primary (`#0D47A1`):** The structural core. Used for active match state containers, scoreboard headers, dominant navigation bars, primary scoring toggles, and high-impact totals.
- **Secondary (`#1565C0`):** Operative telemetry. Powers action-driven buttons, active tab indicators, batsman run-rate badges, and interactive scoring controls.
- **Tertiary (`#42A5F5`):** Dynamic accents. Highlights active bowler indicators, live ball-tracking focus rings, current batsman markers, and subtle telemetry glows.
- **Surface & Canvas:**
  - **Canvas (`#F5F9FF`):** An airy, tinted ice-blue backing that prevents eye fatigue under outdoor sunlight while preserving sharp edge contrast.
  - **Surface Container (`#FFFFFF`):** Pure crystalline white surfaces for scorecards, innings breakdown sheets, and modular statistical panels.
  - **Surface Subdued (`#E3F2FD`):** Tinted foundational plates for ball-by-ball chip trays, inactive scoring buttons, and match header metadata cards.
- **Typography & Structural Lines:**
  - **Primary Text (`#172B4D`):** High-density ink navy for unmatched alphanumeric legibility on runs, wickets, and player stats.
  - **Secondary Text (`#60758A`):** Cool slate for overs, strike rates, economy figures, and labels.
  - **Divider / Outlines (`#DCE7F5`):** Crisp structural hairline dividers that organize dense metric tables without visual noise.
- **Match State Semantics:**
  - **Boundary / Success (`#16803C`):** 4s, 6s, maiden overs, target achievements, and positive milestone indicators.
  - **Wicket / Critical Alert (`#DC2626`):** Wickets, dismissals, run-outs, and review statuses.
  - **Extras / Tactical (`#F59E0B`):** Wides, no-balls, leg byes, penalty runs, and rain delays.

## Typography

The typographical engine leverages **Manrope** for authoritative structural displays and **Hanken Grotesk** for hyper-legible numerical tables and match telemetry.

- **Manrope:** Chosen for headlines and high-priority scoreboard numbers. Its geometric construction, balanced kerning, and muscular presence provide broadcast-level visual authority. Tabular figures (`font-variant-numeric: tabular-nums`) must be enabled on all numerical score headers (`display-score`, `label-numeric`) to prevent horizontal jitter during rapid live increments.
- **Hanken Grotesk:** Deployed across analytical tables, ball outcome badges, player rosters, and scoring keypad legends. Its open counters and sharp terminals maintain clarity even at tiny point sizes (`label-sm`, 11px) on condensed mobile score strips.
- **Uppercase Tracking:** All minor metadata badges (e.g., "OVERS", "CRITICAL OVER", "PARTNERSHIP", "RR", "EXTRAS") utilize `label-sm` set to uppercase with wide letter-spacing (`+0.06em`) for immediate peripheral identification.

## Layout & Spacing

The layout is built mobile-first, addressing the operational realities of field scoring: one-handed thumb interaction, high-frequency entry, and rapid screen transitions between balls.

### Grid Rhythm & Adapters
- **Mobile (< 768px):** Single-column dynamic dashboard with a permanent pinned bottom scoring pad or fixed telemetry bar. Canvas padding adheres to `margin: 1rem`. Scorecards, current over ribbons, and live batter/bowler cards nest with `space-sm` to `space-md` gaps to prioritize vertical space for the touch pad.
- **Tablet (768px - 1024px):** 8-column layout. Split-view mode: Left 5 columns dedicated to the primary match card, over-by-over log, and player wagon wheel/partnership bars; Right 3 columns house the persistent ergonomic scoring input panel.
- **Desktop (> 1024px):** 12-column layout capped at 1280px max-width. Enables broadcast-scale tabular views: Full live score matrix, pitch map visualization, ball-by-ball commentary streams, and side-docked scoring telemetry.

### Spacing Principles
- Gaps between numeric score metrics and metric labels are restricted to `space-xs` (4px) to retain immediate contextual pairing.
- Ball-by-ball horizontal outcome ribbons maintain a constant `space-sm` (8px) gap between badges to allow fluid horizontal swiping.
- Grid gutters on touch-heavy entry panels strictly employ `space-sm` (8px) to optimize keypad surface area without risking fat-finger miss-taps.

## Elevation & Depth

Elevation strictly reflects information criticality. Rather than heavy, floating drop shadows, this design system relies on calibrated surface tints, structural micro-borders, and crisp ambient floor shadows. This preserves high-contrast clarity even when viewing screens outdoors in full sunlight.

### Layer Tiers
- **Tier 0 (Canvas Base):** Ground color `#F5F9FF`. Completely flat, non-elevated context plane.
- **Tier 1 (Metric Cards & Containers):** Pure white (`#FFFFFF`) with a 1px structural boundary: `border: 1px solid #DCE7F5`. Subtle anchor shadow: `box-shadow: 0 1px 3px rgba(13, 71, 161, 0.04), 0 1px 2px rgba(23, 43, 77, 0.03)`. Used for innings cards, player performance rows, and over summary bands.
- **Tier 2 (Interactive Floating Telemetry & Keypads):** Elevated scoring pads, active bottom sheets, and sticky header bars. Supported by a 1px tint border and diffuse elevation: `box-shadow: 0 4px 14px -2px rgba(13, 71, 161, 0.08), 0 2px 6px -1px rgba(23, 43, 77, 0.04)`.
- **Tier 3 (Modals, Wicket Dialogs & Quick Sheets):** Modals, dismissal dialogs, and bowler selection sheets. Supported by deep navy backdrop occlusion (`rgba(13, 71, 161, 0.45)` with `backdrop-filter: blur(4px)`) and punchy ambient drop: `box-shadow: 0 12px 32px -4px rgba(13, 71, 161, 0.16), 0 4px 12px -2px rgba(23, 43, 77, 0.08)`.

## Shapes

The design system employs a **Soft (`1`)** shape language, applying a standardized 4px (`0.25rem`) base corner curve across inputs, standard buttons, and telemetry slots.

- **Base Radius (4px / `0.25rem`):** Scoring numeric buttons, table headers, scorecards, metric cards, and text field inputs. The subtle corner softening preserves the rigorous, athletic precision of a stadium scoreboard while eliminating harsh needle-points.
- **Container Radius (8px / `0.5rem` - `rounded-lg`):** Match overview summary cards, team comparison blocks, persistent scoring control sheets, and dialog window casings.
- **Modal Radius (12px / `0.75rem` - `rounded-xl`):** Dismissal detail modals, match completion banners, and full-screen overlay trays.
- **Specialized Circular Elements:** Ball-by-ball outcome chips ("0", "1", "4", "6", "W") are absolute circles (`border-radius: 9999px`) to immediately mirror the physical form of the cricket ball and provide unmistakable visual categorization on the horizontal over-strip.

## Components

### 1. Scoring Keypad & Pad Buttons
- **Touch Ergonomics:** High-frequency numeric scoring buttons (0, 1, 2, 3, 4, 6) must have a minimum hit area of 56px height on mobile.
- **Primary Standard Runs (0, 1, 2, 3):** Background `#FFFFFF`, border `1px solid #DCE7F5`, text `#172B4D` (`headline-md`). Active state shifts to `#E3F2FD`.
- **Boundaries (4 & 6):** Background `#FFFFFF`, border `1.5px solid #16803C`, text `#16803C`. Active press fills with `#16803C` with text shifting to `#FFFFFF`.
- **Wicket Button:** Background `#DC2626`, border `none`, text `#FFFFFF` (`headline-sm`). Dedicated right/bottom anchor position with immediate tactile confirmation.
- **Extras Controls (WD, NB, LB, B):** Tinted utility styling using `#E3F2FD`, border `1px solid #DCE7F5`, text `#1565C0` (`label-md`).

### 2. Ball Outcome Chips & Over Ribbons
- **Dimensions:** Strict 32px × 32px circular badge (`border-radius: 9999px`) for mobile over-strips; 36px × 36px on tablet/desktop.
- **Dot Ball ("0"):** Background `#E3F2FD`, text `#60758A`, border `1px solid transparent`.
- **Singles / Standard Runs ("1", "2", "3"):** Background `#FFFFFF`, text `#172B4D`, border `1px solid #DCE7F5`.
- **Four ("4"):** Background `#EBF7EE`, text `#16803C`, border `1.5px solid #16803C`, font weight `800`.
- **Six ("6"):** Background `#16803C`, text `#FFFFFF`, border `none`, font weight `800`.
- **Wicket ("W"):** Background `#DC2626`, text `#FFFFFF`, border `none`, font weight `800`.
- **Extra ("WD", "NB"):** Background `#FEF3C7`, text `#B45309`, border `1px solid #F59E0B`.

### 3. Cards & Statistical Containers
- Built on `#FFFFFF` surfaces with a 1px border of `#DCE7F5` and 4px base corner radius.
- Header bars within cards utilize `#F5F9FF` with a bottom divider `#DCE7F5` and `label-sm` uppercase text for data columns (R, B, 4s, 6s, SR / O, M, R, W, ECON).
- Active strike batsman row features a vertical 3px indicator line in `#42A5F5` along the left border and a subtle `#E3F2FD` background tint.

### 4. Interactive Tabs & Filter Switchers
- **Segmented Cricket View Control:** Inset pill container using `#E3F2FD` background and 4px radius.
- **Active Segment:** Pure white `#FFFFFF` surface with subtle `0 1px 3px rgba(13,71,161,0.08)` shadow and deep navy `#0D47A1` text (`label-md`).
- **Inactive Segment:** Transparent background, slate `#60758A` text. Tap transition is snappy (150ms ease-out).

### 5. Input Fields & Selectors
- Height 44px for reliable input entry (batter search, bowler change, venue inputs).
- Background `#FFFFFF`, border `1px solid #DCE7F5`, color `#172B4D`.
- Focus state: Border transitions to `#1565C0` with an outer focus halo: `box-shadow: 0 0 0 3px rgba(66, 165, 245, 0.25)`.

### 6. Modals & Quick-Action Trays
- Bottom sheets for dismissal details (Caught, Bowled, LBW, Run Out, Fielder selection) feature an ergonomic top drag bar (32px × 4px `#DCE7F5`).
- Surface `#FFFFFF`, top corners rounded at 12px (`rounded-xl`).
- Confirm and cancel footers span the bottom using primary `#0D47A1` solid action buttons alongside secondary ghost cancellation links.