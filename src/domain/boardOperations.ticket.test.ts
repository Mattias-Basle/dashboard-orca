import { describe, expect, it } from 'vitest'
import { makeSnapshot, makeTicket } from './testFixtures'
import {
  applyAddTicket,
  applyDeleteTicket,
  applyMoveTicket,
  applyReplaceTicket,
  applyUpdateTicket,
} from './boardOperations'

const ids = (s: ReturnType<typeof makeSnapshot>, col: string) =>
  s.columns.find((c) => c.id === col)!.ticketIds

describe('applyAddTicket', () => {
  it('appends the ticket to the target column', () => {
    const next = applyAddTicket(makeSnapshot(), makeTicket('t9'), 'todo')
    expect(ids(next, 'todo')).toEqual(['t1', 't2', 't9'])
    expect(next.tickets.t9).toBeDefined()
  })

  it('returns the snapshot unchanged for an unknown column', () => {
    const s = makeSnapshot()
    expect(applyAddTicket(s, makeTicket('t9'), 'nope')).toBe(s)
  })

  it('does not mutate the input', () => {
    const s = makeSnapshot()
    applyAddTicket(s, makeTicket('t9'), 'todo')
    expect(ids(s, 'todo')).toEqual(['t1', 't2'])
    expect(s.tickets.t9).toBeUndefined()
  })
})

describe('applyReplaceTicket', () => {
  it('swaps the temp id for the saved one, preserving position', () => {
    const withTemp = applyAddTicket(makeSnapshot(), makeTicket('tmp'), 'todo')
    const moved = applyMoveTicket(withTemp, 'tmp', 'todo', 0)
    const next = applyReplaceTicket(moved, 'tmp', makeTicket('real', { key: 'ORC-9' }))

    expect(ids(next, 'todo')).toEqual(['real', 't1', 't2'])
    expect(next.tickets.tmp).toBeUndefined()
    expect(next.tickets.real.key).toBe('ORC-9')
  })

  it('returns the snapshot unchanged for an unknown temp id', () => {
    const s = makeSnapshot()
    expect(applyReplaceTicket(s, 'nope', makeTicket('real'))).toBe(s)
  })
})

describe('applyUpdateTicket', () => {
  it('merges the patch into the ticket', () => {
    const next = applyUpdateTicket(makeSnapshot(), 't1', {
      title: 'Renamed',
      priority: 'highest',
    })
    expect(next.tickets.t1.title).toBe('Renamed')
    expect(next.tickets.t1.priority).toBe('highest')
    expect(next.tickets.t1.type).toBe('task')
  })

  it('ignores an id in the patch', () => {
    const next = applyUpdateTicket(makeSnapshot(), 't1', { id: 'hacked' } as never)
    expect(next.tickets.t1.id).toBe('t1')
    expect(next.tickets.hacked).toBeUndefined()
  })

  it('returns the snapshot unchanged for an unknown ticket', () => {
    const s = makeSnapshot()
    expect(applyUpdateTicket(s, 'nope', { title: 'x' })).toBe(s)
  })
})

describe('applyDeleteTicket', () => {
  it('removes the ticket from the map and its column', () => {
    const next = applyDeleteTicket(makeSnapshot(), 't1')
    expect(next.tickets.t1).toBeUndefined()
    expect(ids(next, 'todo')).toEqual(['t2'])
  })

  it('returns the snapshot unchanged for an unknown ticket', () => {
    const s = makeSnapshot()
    expect(applyDeleteTicket(s, 'nope')).toBe(s)
  })
})

describe('applyMoveTicket', () => {
  it('moves a ticket to another column at the given index', () => {
    const next = applyMoveTicket(makeSnapshot(), 't1', 'doing', 0)
    expect(ids(next, 'todo')).toEqual(['t2'])
    expect(ids(next, 'doing')).toEqual(['t1', 't3'])
  })

  it('reorders within the same column using remove-then-insert semantics', () => {
    const next = applyMoveTicket(makeSnapshot(), 't1', 'todo', 1)
    expect(ids(next, 'todo')).toEqual(['t2', 't1'])
  })

  it('clamps an index past the end', () => {
    const next = applyMoveTicket(makeSnapshot(), 't1', 'done', 99)
    expect(ids(next, 'done')).toEqual(['t1'])
  })

  it('clamps a negative index to the start', () => {
    const next = applyMoveTicket(makeSnapshot(), 't3', 'todo', -5)
    expect(ids(next, 'todo')).toEqual(['t3', 't1', 't2'])
  })

  it('returns the snapshot unchanged for an unknown ticket or column', () => {
    const s = makeSnapshot()
    expect(applyMoveTicket(s, 'nope', 'todo', 0)).toBe(s)
    expect(applyMoveTicket(s, 't1', 'nope', 0)).toBe(s)
  })

  it('does not mutate the input', () => {
    const s = makeSnapshot()
    applyMoveTicket(s, 't1', 'doing', 0)
    expect(ids(s, 'todo')).toEqual(['t1', 't2'])
    expect(ids(s, 'doing')).toEqual(['t3'])
  })
})
