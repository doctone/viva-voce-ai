---
name: Viva Voce AI
description: Calm, teacher-facing assessment software with editorial restraint and institutional clarity.
colors:
  archival-paper: "#faf9f5"
  reading-surface: "#f4f4f0"
  panel-surface: "#ffffff"
  rule-line: "#c4c6cf"
  graphite-ink: "#1a1c1a"
  quiet-ink: "#44474e"
  institutional-navy: "#002046"
  reserve-navy: "#1b365d"
  dry-stone: "#74777f"
  burnished-umber: "#321c00"
  error-red: "#ba1a1a"
typography:
  display:
    fontFamily: "Newsreader, serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  page-title:
    fontFamily: "Newsreader, serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Newsreader, serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  subhead:
    fontFamily: "Newsreader, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  lede:
    fontFamily: "Newsreader, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  control: "3px"   # buttons, inputs, chips, badges, panels — every surface

spacing:
  xs: "12px"
  sm: "18px"
  md: "24px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.reserve-navy}"
    textColor: "{colors.panel-surface}"
    typography: "{typography.label}"
    padding: "0 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.label}"
    padding: "0 18px"
    height: "44px"
  text-field:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.body}"
    padding: "12px 12px"
  paper-panel:
    backgroundColor: "{colors.panel-surface}"
    textColor: "{colors.graphite-ink}"
    padding: "32px"
  nav-link-active:
    backgroundColor: "{colors.institutional-navy}"
    textColor: "{colors.panel-surface}"
    typography: "{typography.label}"
    padding: "10px 32px"
---

# Design System: Viva Voce AI

## Overview

**Creative North Star: "Paper & Ink Workspace"**

Viva Voce AI uses product UI patterns, but its emotional center comes from scholarly work rather than startup software. The system is built for teachers reviewing evidence, preparing oral assessments, and keeping defensible records in long, focused sessions. Surfaces feel like paper under clear daylight: warm, matte, and steady. Accent color is reserved for authority, state, and navigation, not decoration.

The aesthetic is editorial without becoming theatrical. Newsreader gives headings a measured academic voice, while Manrope keeps forms, controls, and navigation disciplined. Depth is handled through tonal layering, hairline rules, and a single technical shadow. The interface should feel composed enough for institutional work, but never ornate or ceremonial.

This system explicitly rejects gamified edtech, generic SaaS dashboard polish, and casual consumer-product softness. It should never feel reward-driven, KPI-obsessed, or lifestyle-branded. The teacher stays in control, the content stays legible, and the visual language stays quiet under pressure.

**Key Characteristics:**
- Warm paper neutrals instead of cold app chrome.
- Institutional navy used sparingly for command and active state.
- Serif display paired with efficient sans UI copy.
- Flat layers, crisp controls, and technical shadows only.
- Predictable structure that supports concentrated reading and judgment.

## Colors

The Archival Paper palette uses warm reading surfaces, dark ink tones, and a single authoritative blue so the interface stays calm, professional, and low-noise during long assessment sessions.

### Primary
- **Institutional Navy** (`#002046`): The deepest accent in the system. Use it for active navigation, decisive actions, and high-importance headings when the interface needs to signal authority rather than excitement.
- **Reserve Navy** (`#1b365d`): The softer command color used for resting primary buttons and controlled emphasis before full activation.

### Tertiary
- **Burnished Umber** (`#321c00`): A restrained warm counterpoint available for occasional editorial emphasis or future metadata roles. It should stay rare.

### Neutral
- **Archival Paper** (`#faf9f5`): The main page field and overall atmospheric base. It reduces glare and keeps the product closer to a reading surface than a dashboard canvas.
- **Reading Surface** (`#f4f4f0`): The secondary surface for sidebars, hover fills, and quiet separation between content areas.
- **Panel Surface** (`#ffffff`): The brightest surface, used inside paper panels and focused fields when content needs maximum legibility.
- **Graphite Ink** (`#1a1c1a`): The primary text color. Nearly black, but softened enough to avoid harsh contrast against the warm page.
- **Quiet Ink** (`#44474e`): Supporting copy, labels with less priority, and long-form explanatory text.
- **Dry Stone** (`#74777f`): Structural outlines where a stronger edge is needed without introducing visual weight.
- **Rule Line** (`#c4c6cf`): Hairline dividers, panel borders, and editorial list rules.

**The One Voice Rule.** Blue is used to indicate command, current state, or important emphasis only. It is not a decorative wash and it does not spread across large inactive surfaces.

## Typography

**Display Font:** Newsreader (with serif fallback)
**Body Font:** Manrope (with sans-serif fallback)

**Character:** The pairing combines academic gravity with operational clarity. Newsreader carries headings like a printed title block, while Manrope keeps labels, forms, and navigation efficient and contemporary.

### Hierarchy
- **Display** (600, 48px, 1.2): Reserved for page-defining headings such as auth screens, major workspace intros, and design-forward product moments.
- **Headline** (500, 32px, 1.3): Section headings and substantial content titles inside panels or content views.
- **Page title** (600, 36px, 1.2): The single `h1` of a working page, one step below Display so app surfaces stay quieter than design-forward moments.
- **Title** (500, 30px, 1.2): Brand titles and compact high-importance headings where presence matters but full display scale would be excessive.
- **Subhead** (500, 20px, 1.3): Headings for subordinate panels — sidebars, rails, and utility sections that must read as secondary to the page title. Use this rather than repeating a section-scale heading in every panel, which flattens hierarchy.
- **Lede** (400, 18px, 1.7): Standfirst copy directly under a page title.
- **Body** (400, 16px, 1.6): The default reading size for product copy. Prose should generally stay within 65 to 75 characters per line where possible.
- **Label** (700, 12px, 0.08em tracking, uppercase): Field labels, navigation items, eyebrow text, and compact structural language.

**The Scholarly Contrast Rule.** Serif type may lead sections and establish tone, but all controls, labels, and repetitive UI language stay in the sans system so the tool remains legible and familiar.

## Elevation

This system is flat by default. Depth comes from warm tonal separation, visible rules, and crisp boundaries rather than decorative lift. A single technical shadow exists for panels, but it behaves like a drafting aid, not an atmospheric glow.

### Shadow Vocabulary
- **Technical Edge** (`box-shadow: 0 0 0 1px rgb(26 28 26 / 0.06)`): Use on paper panels where a subtle edge definition helps the surface sit above the page without reading as a floating card.

**The Flat Layers Rule.** If a surface can be separated with tone and a hairline rule, do that first. Reach for shadow only when the boundary would otherwise disappear.

## Components

### Buttons
- **Shape:** A single hairline radius of `3px`, taken from the `--radius` token. Enough to take the hard edge off a control without reading as a soft consumer app — the radius is felt, not seen. Never round one kind of control on its own: buttons, inputs, chips, badges and panels all share this value.
- **Primary:** Reserve Navy background with white text, 16px horizontal padding, uppercase label styling.
- **Hover / Focus:** Hover deepens to Institutional Navy. Focus uses a visible outline mixed from the primary blue — the shared `focusRingClassName` token, so hand-built controls match the shared button. Active state moves by a single pixel to feel mechanical rather than playful.
- **Secondary / Ghost / Tertiary:** Secondary buttons stay transparent with a structural border and pick up a quiet paper fill on hover.
- **Destructive:** System red fill with white text, darkening on hover. Reserved for the action that ends or removes something — stopping a recording, deleting evidence. Never more than one in a group, and it takes the trailing position beside a secondary escape.
- **Sizes:** Three steps, all sharing one label vocabulary so a pair of buttons always lines up.
  - `sm` — 32px, 11px label. Dense rows: toolbars, table rows, panel headers, chip groups.
  - `md` — 40px, 13px label. The default for page-level actions.
  - `lg` — 44px, 14px label. Reserved for touch-first controls (mobile nav) and the single hero action on a page, where the comfortable touch target is worth the extra weight.

  Controls are sized to the content they act on, not inflated to feel important — a button that outweighs its own row reads as louder, not more usable. 32px is the floor; nothing interactive goes below it.
- **Icons and loading:** Icons sit inside the button and inherit its colour at 16px; the button owns the gap. A loading button shows a spinner before its label, keeps the label readable, and is disabled with `aria-busy`. Icon-only buttons keep equal width and height, and must carry an `aria-label`.

### Cards / Containers
- **Corner Style:** The shared `3px` control radius, matching buttons and fields.
- **Background:** Panel Surface on top of Archival Paper or Reading Surface.
- **Shadow Strategy:** Technical Edge only. No ambient blur by default.
- **Border:** Rule Line or structural outline, always visible enough to separate reading zones.
- **Internal Padding:** Most canonical panels use 32px, with 24px acceptable for denser utility areas.

### Inputs / Fields
- **Style:** Transparent field body with a bottom-led edge vocabulary, then a brighter paper fill on focus.
- **Focus:** Border shifts to primary and an inset underline appears in the primary color. Focus is crisp, not glowing.
- **Error / Disabled:** Error text uses the system red. Disabled controls rely on opacity reduction and cursor feedback rather than heavy restyling.

### Navigation
- **Style:** Uppercase label typography, full-width rows, hairline boundaries, and a restrained inactive state.
- **Default / Hover / Active:** Default links sit on a pale surface with quiet ink text. Hover preserves the structural feel. Active links invert into Institutional Navy with white text.
- **Mobile Treatment:** Navigation should collapse structurally, not aesthetically. Preserve the same type, color, and state vocabulary when the sidebar becomes a drawer or stacked menu.

### Auth Split Panel
- **Description:** The authentication layout pairs a disciplined form panel with a photographic reassurance panel.
- **Behavior:** The right-side image is only present at larger breakpoints. Its overlay should remain readable and muted, never cinematic.

## Do's and Don'ts

### Do:
- **Do** keep the page atmosphere on warm neutrals like `#faf9f5` and `#f4f4f0`, with `#ffffff` reserved for focused content panels and fields.
- **Do** use `#002046` and `#1b365d` for command, active state, and high-importance emphasis only.
- **Do** keep controls label-driven and mechanically precise, with the one shared `3px` radius applied consistently — precision comes from the hairline structure and the uppercase labels, not from hard corners.
- **Do** preserve visible structure through hairline rules, borders, and tonal layers before adding any extra depth.
- **Do** let serif typography establish tone in headings while keeping UI controls, labels, and utility copy in Manrope.

### Don't:
- **Don't** make this feel like gamified edtech with bright rewards, playful microcopy, or student-app energy.
- **Don't** slip into generic SaaS dashboard tropes with KPI hero blocks, startup gradients, or decorative metrics.
- **Don't** soften the product into a casual consumer-product aesthetic with oversized pills, friendly blob shapes, or lifestyle-brand warmth.
- **Don't** use border-left or border-right accents greater than 1px as decorative stripes on panels, alerts, or list items.
- **Don't** use gradient text, decorative glassmorphism, or heavy inactive accent fills.
