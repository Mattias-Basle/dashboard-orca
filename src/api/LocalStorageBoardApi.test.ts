import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageBoardApi, SCHEMA_VERSION, STORAGE_KEY } from './LocalStorageBoardApi'
import type { TicketInput } from '../types/board'

const input = (over: Partial<TicketInput> = {}): TicketInput => ({
  columnId: 'col-todo',
  title: 'New ticket',
  description: '',
  type: 'task',
  priority: 'medium',
  assigneeId: null,
  labels: [],
  storyPoints: null,
  ...over,
})

beforeEach(() => localStorage.clear())

describe('first run', () => {
  it('seeds a board and persists it', async () => {
    const api = new LocalStorageBoardApi()
    const board = await api.getBoard()
    expect(board.columns.map((c) => c.name)).toEqual(['To Do', 'In Progress', 'Done'])
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(api.storageMode).toBe('persistent')
    expect(api.wasReset).toBe(false)
  })
})

describe('persistence', () => {
  it('round-trips changes across instances', async () => {
    const first = new LocalStorageBoardApi()
    await first.getBoard()
    const created = await first.createTicket(input({ title: 'Persisted' }))

    const second = new LocalStorageBoardApi()
    const board = await second.getBoard()
    expect(board.tickets[created.id].title).toBe('Persisted')
  })

  it('assigns sequential keys continuing past the seed', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    const a = await api.createTicket(input())
    const b = await api.createTicket(input())
    expect(a.key).toBe('ORC-6')
    expect(b.key).toBe('ORC-7')
  })

  it('keeps the counter across instances', async () => {
    const first = new LocalStorageBoardApi()
    await first.getBoard()
    await first.createTicket(input())

    const second = new LocalStorageBoardApi()
    await second.getBoard()
    expect((await second.createTicket(input())).key).toBe('ORC-7')
  })
})

describe('recovery', () => {
  it('resets to seed on corrupt JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{ not json')
    const api = new LocalStorageBoardApi()
    const board = await api.getBoard()
    expect(board.columns).toHaveLength(3)
    expect(api.wasReset).toBe(true)
  })

  it('resets to seed on a schema version mismatch', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, ticketCounter: 0, board: {} }),
    )
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    expect(api.wasReset).toBe(true)
  })

  it('falls back to memory mode when storage throws', async () => {
    const api = new LocalStorageBoardApi({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    } as unknown as Storage)
    const board = await api.getBoard()
    expect(board.columns).toHaveLength(3)
    expect(api.storageMode).toBe('memory')
  })
})

describe('operations', () => {
  it('creates a ticket into the requested column', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    const created = await api.createTicket(input({ columnId: 'col-doing' }))
    const board = await api.getBoard()
    expect(board.columns.find((c) => c.id === 'col-doing')!.ticketIds).toContain(created.id)
  })

  it('updates, moves and deletes', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()

    const updated = await api.updateTicket('seed-1', { title: 'Renamed' })
    expect(updated.title).toBe('Renamed')

    await api.moveTicket('seed-1', 'col-done', 0)
    let board = await api.getBoard()
    expect(board.columns.find((c) => c.id === 'col-done')!.ticketIds[0]).toBe('seed-1')

    await api.deleteTicket('seed-1')
    board = await api.getBoard()
    expect(board.tickets['seed-1']).toBeUndefined()
  })

  it('creates, renames, reorders and deletes columns', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()

    const created = await api.createColumn('Review')
    expect(created.name).toBe('Review')

    await api.renameColumn(created.id, 'In Review')
    await api.reorderColumn(created.id, 0)
    let board = await api.getBoard()
    expect(board.columns[0].name).toBe('In Review')

    await api.deleteColumn(created.id, { kind: 'move', toColumnId: 'col-todo' })
    board = await api.getBoard()
    expect(board.columns.map((c) => c.id)).not.toContain(created.id)
  })

  it('rejects an update to an unknown ticket', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    await expect(api.updateTicket('nope', { title: 'x' })).rejects.toThrow()
  })
})
