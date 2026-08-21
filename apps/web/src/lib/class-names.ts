/**
 * One focus treatment for every interactive control, hand-built or shared:
 * a crisp outline mixed from the primary blue, never a glow.
 */
export const focusRingClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:color-mix(in_srgb,var(--color-primary)_55%,white)]"

export const pageShellClassName = "min-h-screen";

export const pageFrameClassName =
  "mx-auto w-full max-w-[1328px] px-6 pb-16 pt-8";

/**
 * One radius for every control and surface. Buttons rounded on their own would
 * read as a mistake beside square inputs, chips and panels, so this is the only
 * place the value is set.
 */
export const controlRadiusClassName = "rounded-[var(--radius)]"

export const paperPanelClassName =
  "rounded-[var(--radius)] border border-outline-variant bg-surface-container-lowest shadow-technical";

export const sectionCardClassName = "grid gap-4 p-8";

export const eyebrowClassName =
  "font-sans text-[12px] font-bold leading-none tracking-[0.08em] text-on-surface-variant uppercase";

export const brandTitleClassName =
  "font-display text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-primary";

/**
 * The largest step, and the only one above `page-title`. DESIGN.md reserves it
 * for design-forward moments — the landing hero, auth screens — never for a
 * working page's `h1`, which stays at `headingOneClassName` so app surfaces read
 * quieter than the marketing ones.
 */
export const displayClassName =
  "font-display text-[36px] font-semibold leading-[1.15] tracking-[-0.02em] text-primary sm:text-[48px] sm:leading-[1.2]";

export const headingOneClassName =
  "font-display text-[36px] font-semibold leading-[1.2] tracking-[-0.02em] text-primary";

export const headingTwoClassName =
  "font-display text-[32px] font-medium leading-[1.3] tracking-[-0.01em] text-primary";

// Subordinate panel headings: rail and utility panels that must not compete with
// the page title. Documented in DESIGN.md as the `subhead` typography step.
export const subheadClassName =
  "font-display text-[20px] font-medium leading-[1.3] tracking-[-0.01em] text-primary";

export const mutedTextClassName = "font-sans text-on-surface-variant";

export const ledeClassName =
  "font-display text-[18px] leading-[1.7] tracking-[-0.01em] text-on-surface";

/**
 * Sustained reading rather than glancing: the student's submission text and any
 * future surface presenting long-form writing for judgement. Pair it with a
 * measure in the 65-75 character band — the size only works with the line
 * length. `font-display` is deliberate: `font-serif` has no token behind it and
 * falls back to the browser's serif rather than Newsreader.
 */
export const readingClassName =
  "font-display text-[19px] leading-[1.75] text-on-surface";

export const editorialListClassName =
  "m-0 grid list-none divide-y divide-outline-variant p-0";

export const editorialRowClassName = "block py-[18px] font-sans";

export const mobileNavFooterLinkClassName =
  "inline-flex min-h-10 items-center justify-center rounded-[var(--radius)] border border-outline-variant px-[18px] text-sm font-bold uppercase tracking-[0.08em] text-on-surface transition-[background-color,border-color] duration-150 ease-out hover:border-on-surface-variant hover:bg-surface-container-low";
