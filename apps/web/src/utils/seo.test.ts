import { describe, expect, it } from 'vitest'

import { seo } from './seo'

describe('seo', () => {
  it('includes core tags and image tags when an image is provided', () => {
    const tags = seo({
      title: 'Viva Voce AI',
      description: 'Assessment integrity support',
      keywords: 'assessment, ai',
      image: '/social-card.png',
    })

    expect(tags).toContainEqual({ title: 'Viva Voce AI' })
    expect(tags).toContainEqual({
      name: 'description',
      content: 'Assessment integrity support',
    })
    expect(tags).toContainEqual({
      name: 'twitter:image',
      content: '/social-card.png',
    })
    expect(tags).toContainEqual({
      name: 'og:image',
      content: '/social-card.png',
    })
  })

  it('omits image tags when no image is provided', () => {
    const tags = seo({
      title: 'Viva Voce AI',
    })

    expect(tags).not.toContainEqual({
      name: 'twitter:image',
      content: expect.any(String),
    })
    expect(tags).not.toContainEqual({
      name: 'og:image',
      content: expect.any(String),
    })
  })
})
