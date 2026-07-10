import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('joins truthy class names and drops falsy ones', () => {
    expect(cn('a', false, null, undefined, 'b', '')).toBe('a b')
  })

  it('merges conflicting Tailwind utility classes, keeping the last one', () => {
    expect(cn('px-[18px]', 'px-2')).toBe('px-2')
  })

  it('supports conditional object and array syntax from clsx', () => {
    expect(cn(['a', { b: true, c: false }], 'd')).toBe('a b d')
  })
})
