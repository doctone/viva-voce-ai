export function cn(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

export const pageShellClassName = 'min-h-screen'

export const pageFrameClassName = 'mx-auto w-full max-w-[1328px] px-6 pb-16 pt-8'

export const paperPanelClassName =
  'border border-outline-variant bg-surface-container-lowest shadow-technical'

export const sectionCardClassName = 'grid gap-4 p-8'

export const eyebrowClassName =
  'font-sans text-[12px] font-bold leading-none tracking-[0.08em] text-on-surface-variant uppercase'

export const brandTitleClassName =
  'font-display text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-primary'

export const headingOneClassName =
  'font-display text-[40px] font-semibold leading-[1.2] tracking-[-0.02em] text-primary'

export const headingTwoClassName =
  'font-display text-[32px] font-medium leading-[1.3] tracking-[-0.01em] text-primary'

export const mutedTextClassName = 'font-sans text-on-surface-variant'

export const ledeClassName =
  'font-display text-[18px] leading-[1.7] tracking-[-0.01em] text-on-surface'

export const editorialListClassName =
  'm-0 grid list-none divide-y divide-outline-variant p-0'

export const editorialRowClassName = 'block py-[18px] font-sans'
