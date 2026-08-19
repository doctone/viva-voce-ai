import { describe, expect, it } from 'vitest'
import {
  appendLevel,
  computeInputLevel,
  scaleLevelToBarHeight,
  shouldWarnAboutSilence,
  SILENCE_WARNING_MS,
} from './audioLevelMeter'

function silentFrame(length = 64) {
  return new Uint8Array(length).fill(128)
}

function loudFrame(length = 64) {
  return Uint8Array.from({ length }, (_, index) => (index % 2 === 0 ? 0 : 255))
}

describe('computeInputLevel', () => {
  it('reads a silent room as no level', () => {
    expect(computeInputLevel(silentFrame())).toBe(0)
  })

  it('reads a loud frame as a full level', () => {
    expect(computeInputLevel(loudFrame())).toBeCloseTo(1, 2)
  })

  it('places ordinary speech between the two', () => {
    const speech = Uint8Array.from({ length: 64 }, (_, index) =>
      index % 2 === 0 ? 108 : 148,
    )

    const level = computeInputLevel(speech)

    expect(level).toBeGreaterThan(0)
    expect(level).toBeLessThan(0.5)
  })

  it('returns no level rather than dividing by zero on an empty frame', () => {
    expect(computeInputLevel(new Uint8Array())).toBe(0)
  })
})

describe('appendLevel', () => {
  it('keeps the newest level last', () => {
    expect(appendLevel([0.1, 0.2], 0.3)).toEqual([0.1, 0.2, 0.3])
  })

  it('drops the oldest level once the window is full', () => {
    const full = Array.from({ length: 4 }, (_, index) => index / 10)

    expect(appendLevel(full, 0.9, 4)).toEqual([0.1, 0.2, 0.3, 0.9])
  })
})

describe('scaleLevelToBarHeight', () => {
  it('leaves a visible bar at silence so the meter reads as working', () => {
    expect(scaleLevelToBarHeight(0)).toBe(8)
  })

  it('fills the meter at full level', () => {
    expect(scaleLevelToBarHeight(1)).toBe(100)
  })

  it('lifts quiet speech clear of the floor', () => {
    // A linear mapping would leave this at 12%, nearly indistinguishable
    // from silence.
    expect(scaleLevelToBarHeight(0.04)).toBeGreaterThan(20)
  })

  it('clamps a level outside the expected range', () => {
    expect(scaleLevelToBarHeight(-1)).toBe(8)
    expect(scaleLevelToBarHeight(4)).toBe(100)
  })
})

describe('shouldWarnAboutSilence', () => {
  it('says nothing while a silent microphone is still within the grace period', () => {
    expect(
      shouldWarnAboutSilence({ elapsedMs: 2_000, hasHeardSound: false }),
    ).toBe(false)
  })

  it('warns once a take has run without hearing anything at all', () => {
    expect(
      shouldWarnAboutSilence({
        elapsedMs: SILENCE_WARNING_MS,
        hasHeardSound: false,
      }),
    ).toBe(true)
  })

  it('never warns about a pause in a viva that has already been heard', () => {
    // A student thinking for half a minute is not a broken microphone.
    expect(
      shouldWarnAboutSilence({ elapsedMs: 30_000, hasHeardSound: true }),
    ).toBe(false)
  })
})
