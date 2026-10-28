import { describe, expect, it } from 'vitest'
import { makeSnapshot } from './testFixtures'
import {
  applyAddColumn,
  applyDeleteColumn,
  applyRenameColumn,
  applyReorderColumn,
  applyReplaceColumn,
} from './boardOperations'

const names = (s: ReturnType<typeof makeSnapshot>) => s.columns.map((c) => c.id)

describe('applyAddColumn', () => {
  it('appends the column', () => {
    const next = applyAddColumn(makeSnapshot(), {
      id: 'c9',
      name: 'Review',
      ticketIds: [],
    })
    expect(names(next)).toEqual(['todo', 'doing', 'done', 'c9'])
  })

  it('does not mutate the input', () => {
    const s = makeSnapshot()
    applyAddColumn(s, { id: 'c9', name: 'Review', ticketIds: [] })
    expect(names(s)).toEqual(['todo', 'doing', 'done'])
  })
})

describe('applyReplaceColumn', () => {
  it('swaps the temp id while keeping tickets added meanwhile', () => {
    const withTemp = applyAddColumn(makeSnapshot(), {
      id: 'tmp',
      name: 'Review',
      ticketIds: ['t1'],
    })
    const next = applyReplaceColumn(withTemp, 'tmp', {
      id: 'real',
      name: 'Review',
      ticketIds: [],
    })
    const col = next.columns.find((c) => c.id === 'real')!
    expect(col.ticketIds).toEqual(['t1'])
    expect(names(next)).toEqual(['todo', 'doing', 'done', 'real'])
  })

  it('returns the snapshot unchanged for an unknown temp id', () => {
    const s = makeSnapshot()
    expect(applyReplaceColumn(s, 'nope', { id: 'r', name: 'R', ticketIds: [] })).toBe(s)
  })
})

describe('applyRenameColumn', () => {
  it('renames the column', () => {
    const next = applyRenameColumn(makeSnapshot(), 'todo', 'Backlog')
    expect(next.columns[0].name).toBe('Backlog')
  })

  it('returns the snapshot unchanged for an unknown column', () => {
    const s = makeSnapshot()
    expect(applyRenameColumn(s, 'nope', 'x')).toBe(s)
  })
})

describe('applyDeleteColumn', () => {
  it('moves tickets to the target column when disposition is move', () => {
    const next = applyDeleteColumn(makeSnapshot(), 'todo', {
      kind: 'move',
      toColumnId: 'doing',
    })
    expect(names(next)).toEqual(['doing', 'done'])
    expect(next.columns[0].ticketIds).toEqual(['t3', 't1', 't2'])
    expect(next.tickets.t1).toBeDefined()
  })

  it('deletes the column tickets when disposition is delete', () => {
    const next = applyDeleteColumn(makeSnapshot(), 'todo', { kind: 'delete' })
    expect(names(next)).toEqual(['doing', 'done'])
    expect(next.tickets.t1).toBeUndefined()
    expect(next.tickets.t2).toBeUndefined()
    expect(next.tickets.t3).toBeDefined()
  })

  it('refuses to delete the last remaining column', () => {
    let s = applyDeleteColumn(makeSnapshot(), 'doing', { kind: 'delete' })
    s = applyDeleteColumn(s, 'done', { kind: 'delete' })
    expect(names(s)).toEqual(['todo'])
    expect(applyDeleteColumn(s, 'todo', { kind: 'delete' })).toBe(s)
  })

  it('returns the snapshot unchanged for an unknown column or move target', () => {
    const s = makeSnapshot()
    expect(applyDeleteColumn(s, 'nope', { kind: 'delete' })).toBe(s)
    expect(applyDeleteColumn(s, 'todo', { kind: 'move', toColumnId: 'nope' })).toBe(s)
  })

  it('returns the snapshot unchanged when moving a column into itself', () => {
    const s = makeSnapshot()
    expect(applyDeleteColumn(s, 'todo', { kind: 'move', toColumnId: 'todo' })).toBe(s)
  })
})

describe('applyReorderColumn', () => {
  it('moves a column to the given index', () => {
    const next = applyReorderColumn(makeSnapshot(), 'done', 0)
    expect(names(next)).toEqual(['done', 'todo', 'doing'])
  })

  it('clamps an index past the end', () => {
    const next = applyReorderColumn(makeSnapshot(), 'todo', 99)
    expect(names(next)).toEqual(['doing', 'done', 'todo'])
  })

  it('returns the snapshot unchanged for an unknown column', () => {
    const s = makeSnapshot()
    expect(applyReorderColumn(s, 'nope', 0)).toBe(s)
  })
})
