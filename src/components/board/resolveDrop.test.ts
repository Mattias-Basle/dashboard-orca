import { describe, expect, it } from 'vitest'
import { makeSnapshot } from '../../domain/testFixtures'
import { applyMoveTicket } from '../../domain/boardOperations'
import { resolveDrop } from './resolveDrop'

describe('resolveDrop', () => {
  // Use default test snapshot: todo=['t1','t2'], doing=['t3'], done=[]
  const board = makeSnapshot()

  describe('resolution logic', () => {
    it('same-column downward: drag t1 onto t2', () => {
      const move = resolveDrop(board, 't1', 't2')
      expect(move).toEqual({ toColumnId: 'todo', toIndex: 1 })
    })

    it('same-column upward: drag t2 onto t1', () => {
      const move = resolveDrop(board, 't2', 't1')
      expect(move).toEqual({ toColumnId: 'todo', toIndex: 0 })
    })

    it('cross-column onto a ticket: drag t1 onto t3', () => {
      const move = resolveDrop(board, 't1', 't3')
      expect(move).toEqual({ toColumnId: 'doing', toIndex: 0 })
    })

    it('onto an empty column id: drag t1 to done', () => {
      const move = resolveDrop(board, 't1', 'done')
      expect(move).toEqual({ toColumnId: 'done', toIndex: 0 })
    })

    it('onto a non-empty column id (appends): drag t1 to doing', () => {
      const move = resolveDrop(board, 't1', 'doing')
      expect(move).toEqual({ toColumnId: 'doing', toIndex: 1 })
    })

    it('activeId === overId returns null', () => {
      const move = resolveDrop(board, 't1', 't1')
      expect(move).toBeNull()
    })

    it('unknown overId returns null', () => {
      const move = resolveDrop(board, 't1', 'unknown')
      expect(move).toBeNull()
    })

    it('unknown activeId returns null', () => {
      const move = resolveDrop(board, 'unknown', 't2')
      expect(move).toBeNull()
    })

    it('no-op (already in place) returns null', () => {
      const move = resolveDrop(board, 't2', 'todo')
      expect(move).toBeNull()
    })
  })

  describe('composition with applyMoveTicket', () => {
    it('down drag t1→t2 yields todo === [t2,t1]', () => {
      const move = resolveDrop(board, 't1', 't2')
      if (!move) throw new Error('expected move')
      const result = applyMoveTicket(board, 't1', move.toColumnId, move.toIndex)
      const todo = result.columns.find((c) => c.id === 'todo')!
      expect(todo.ticketIds).toEqual(['t2', 't1'])
    })

    it('up drag t2→t1 yields todo === [t2,t1]', () => {
      const move = resolveDrop(board, 't2', 't1')
      if (!move) throw new Error('expected move')
      const result = applyMoveTicket(board, 't2', move.toColumnId, move.toIndex)
      const todo = result.columns.find((c) => c.id === 'todo')!
      expect(todo.ticketIds).toEqual(['t2', 't1'])
    })

    it('cross t1→t3 yields doing === [t1,t3]', () => {
      const move = resolveDrop(board, 't1', 't3')
      if (!move) throw new Error('expected move')
      const result = applyMoveTicket(board, 't1', move.toColumnId, move.toIndex)
      const doing = result.columns.find((c) => c.id === 'doing')!
      expect(doing.ticketIds).toEqual(['t1', 't3'])
    })

    it('t1→done yields done === [t1]', () => {
      const move = resolveDrop(board, 't1', 'done')
      if (!move) throw new Error('expected move')
      const result = applyMoveTicket(board, 't1', move.toColumnId, move.toIndex)
      const done = result.columns.find((c) => c.id === 'done')!
      expect(done.ticketIds).toEqual(['t1'])
    })
  })
})
