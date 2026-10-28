import { describe, expect, it } from 'vitest'
import { createBoardStore } from './boardStore'
import { LocalStorageBoardApi } from '../api/LocalStorageBoardApi'
import type { BoardApi } from '../api/BoardApi'

function failingApi(method: keyof BoardApi): BoardApi {
  const real = new LocalStorageBoardApi(null)
  const proxy = Object.create(real) as BoardApi
  // @ts-expect-error — deliberately replacing one method with a rejector
  proxy[method] = () => Promise.reject(new Error('boom'))
  return proxy
}

async function readyStore(api: BoardApi = new LocalStorageBoardApi(null)) {
  const useStore = createBoardStore(api)
  await useStore.getState().load()
  return useStore
}

describe('load', () => {
  it('moves from loading to ready and exposes the board', async () => {
    const useStore = await readyStore()
    expect(useStore.getState().status).toBe('ready')
    expect(useStore.getState().board!.columns).toHaveLength(3)
  })

  it('reports memory storage mode when persistence is unavailable', async () => {
    const useStore = await readyStore(new LocalStorageBoardApi(null))
    expect(useStore.getState().storageMode).toBe('memory')
  })

  it('sets status error when the API rejects', async () => {
    const useStore = createBoardStore(failingApi('getBoard'))
    await useStore.getState().load()
    expect(useStore.getState().status).toBe('error')
  })
})

describe('addTicket', () => {
  it('commits the API-assigned id and key', async () => {
    const useStore = await readyStore()
    await useStore.getState().addTicket({
      columnId: 'col-todo',
      title: 'Fresh',
      description: '',
      type: 'task',
      priority: 'medium',
      assigneeId: null,
      labels: [],
      storyPoints: null,
    })

    const board = useStore.getState().board!
    const todo = board.columns.find((c) => c.id === 'col-todo')!
    const added = board.tickets[todo.ticketIds.at(-1)!]
    expect(added.title).toBe('Fresh')
    expect(added.key).toBe('ORC-6')
    expect(useStore.getState().error).toBeNull()
  })

  it('rolls back and surfaces an error when the API rejects', async () => {
    const useStore = await readyStore(failingApi('createTicket'))
    const before = useStore.getState().board!

    await useStore.getState().addTicket({
      columnId: 'col-todo',
      title: 'Doomed',
      description: '',
      type: 'task',
      priority: 'medium',
      assigneeId: null,
      labels: [],
      storyPoints: null,
    })

    expect(useStore.getState().board).toEqual(before)
    expect(useStore.getState().error).not.toBeNull()
  })
})

describe('moveTicket', () => {
  it('applies the move optimistically and keeps it on success', async () => {
    const useStore = await readyStore()
    await useStore.getState().moveTicket('seed-1', 'col-done', 0)
    const done = useStore.getState().board!.columns.find((c) => c.id === 'col-done')!
    expect(done.ticketIds[0]).toBe('seed-1')
  })

  it('rolls back a failed move exactly', async () => {
    const useStore = await readyStore(failingApi('moveTicket'))
    const before = useStore.getState().board!
    await useStore.getState().moveTicket('seed-1', 'col-done', 0)
    expect(useStore.getState().board).toEqual(before)
  })
})

describe('column actions', () => {
  it('adds a column and commits the real id', async () => {
    const useStore = await readyStore()
    await useStore.getState().addColumn('Review')
    const columns = useStore.getState().board!.columns
    expect(columns.at(-1)!.name).toBe('Review')
    expect(columns).toHaveLength(4)
  })

  it('rolls back a failed delete', async () => {
    const useStore = await readyStore(failingApi('deleteColumn'))
    const before = useStore.getState().board!
    await useStore.getState().deleteColumn('col-todo', { kind: 'delete' })
    expect(useStore.getState().board).toEqual(before)
  })
})

describe('dismissError', () => {
  it('clears the error', async () => {
    const useStore = await readyStore(failingApi('deleteTicket'))
    await useStore.getState().deleteTicket('seed-1')
    expect(useStore.getState().error).not.toBeNull()
    useStore.getState().dismissError()
    expect(useStore.getState().error).toBeNull()
  })
})
