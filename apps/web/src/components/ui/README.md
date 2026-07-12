# UI component library

Import from the barrel rather than individual files:

```ts
import { Button, Card, Heading, TextField } from '~/components/ui'
```

## Component API contract

- **Interactive components** (`Button`, `Tabs`, form fields) are built on Radix
  primitives and use `cva` for variants. Variant props are named, typed unions
  (e.g. `variant="primary" | "secondary" | "ghost"`), not raw className flags.
- **Every component accepts a `className` prop** for one-off overrides, merged
  with the component's own classes via `cn` from `~/lib/utils` (backed by
  `tailwind-merge`, so a conflicting utility in `className` wins over the
  component default).
- **Exported `*className` constants** (`buttonClassName`, `fieldControlClassName`)
  exist for cases where the underlying element can't be a component — e.g.
  styling a `<Link>` as a button. They are not a replacement for the component;
  prefer the component when you control the rendered element.
- **Layout primitives** (`Heading`, `Card`, `EditorialList`/`EditorialListItem`)
  wrap the typography/surface tokens from `~/lib/class-names` so pages don't
  need to know which raw className constants to combine. `Card` accepts an
  `as` prop (`div` | `section` | `article` | `form`) to control the rendered
  element while keeping the surface styling consistent.
- `eyebrowClassName` and other single-purpose typography constants in
  `~/lib/class-names` stay as plain classNames — they're simple enough that a
  wrapper component wouldn't add readability.

## Adding a shadcn primitive

`components.json` is already configured (aliases point here). Pull in
Dialog/Sheet/Table when a feature actually needs them rather than ahead of
time — see #43 (hamburger menu) and #47 (submissions table).
