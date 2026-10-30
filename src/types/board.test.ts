import { describe, expect, it } from 'vitest'
import { STORY_POINT_SCALE } from './board'

describe('STORY_POINT_SCALE', () => {
  it('is the Fibonacci scale in ascending order', () => {
    expect(STORY_POINT_SCALE).toEqual([1, 2, 3, 5, 8, 13])
  })
})
