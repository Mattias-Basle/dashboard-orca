import { create } from 'zustand'
import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'
import type { BoardApi } from '../api/BoardApi'
import { createBoardApi } from '../api'
import { buildColumn, buildTicket } from '../domain/factories'
import {
  applyAddColumn,
  applyAddTicket,
  applyDeleteColumn,
  applyDeleteTicket,
  applyMoveTicket,
  applyRenameColumn,
  applyReorderColumn,
  applyReplaceColumn,
  applyReplaceTicket,
  applyUpdateTicket,
} from '../domain/boardOperations'

export type BoardStore = {
  board: BoardSnapshot | null
  status: 'loading' | 'ready' | 'error'
  storageMode: 'persistent' | 'memory'
  error: string | null

  load(): Promise<void>
  addTicket(input: TicketInput): Promise<void>
  updateTicket(id: string, patch: Partial<Ticket>): Promise<void>
  deleteTicket(id: string): Promise<void>
  moveTicket(id: string, toColumnId: string, toIndex: number): Promise<void>
  addColumn(name: string): Promise<void>
  renameColumn(id: string, name: string): Promise<void>
  deleteColumn(id: string, disposition: Disposition): Promise<void>
  reorderColumn(id: string, toIndex: number): Promise<void>
  dismissError(): void
}

export function createBoardStore(api: BoardApi) {
  return create<BoardStore>((set, get) => {
    /**
     * Apply optimistically, await the API, then commit or restore the
     * pre-action snapshot. `fallbackMessage` is what the user sees on failure.
     */
    async function runOptimistic(
      apply: (s: BoardSnapshot) => BoardSnapshot,
      call: () => Promise<unknown>,
      fallbackMessage: string,
      commit?: (s: BoardSnapshot, result: never) => BoardSnapshot,
    ): Promise<void> {
      const snapshot = get().board
      if (!snapshot) return
      set({ board: apply(snapshot), error: null })
      try {
        const result = await call()
        if (commit) {
          set((s) => ({ board: commit(s.board!, result as never) }))
        }
      } catch {
        set({ board: snapshot, error: fallbackMessage })
      }
    }

    return {
      board: null,
      status: 'loading',
      storageMode: 'persistent',
      error: null,

      async load() {
        set({ status: 'loading' })
        try {
          const board = await api.getBoard()
          set({
            board,
            status: 'ready',
            storageMode: api.storageMode ?? 'persistent',
            error: api.wasReset
              ? 'Saved board was unreadable — started a fresh one.'
              : null,
          })
        } catch {
          set({ status: 'error', error: 'Could not load the board.' })
        }
      },

      async addTicket(input) {
        const optimistic = buildTicket(input)
        await runOptimistic(
          (s) => applyAddTicket(s, optimistic, input.columnId),
          () => api.createTicket(input),
          'Could not create the ticket.',
          (s, saved: Ticket) => applyReplaceTicket(s, optimistic.id, saved),
        )
      },

      async updateTicket(id, patch) {
        await runOptimistic(
          (s) => applyUpdateTicket(s, id, patch),
          () => api.updateTicket(id, patch),
          'Could not save your changes.',
        )
      },

      async deleteTicket(id) {
        await runOptimistic(
          (s) => applyDeleteTicket(s, id),
          () => api.deleteTicket(id),
          'Could not delete the ticket.',
        )
      },

      async moveTicket(id, toColumnId, toIndex) {
        await runOptimistic(
          (s) => applyMoveTicket(s, id, toColumnId, toIndex),
          () => api.moveTicket(id, toColumnId, toIndex),
          'Could not move the ticket.',
        )
      },

      async addColumn(name) {
        const optimistic = buildColumn(name)
        await runOptimistic(
          (s) => applyAddColumn(s, optimistic),
          () => api.createColumn(name),
          'Could not create the column.',
          (s, saved: Column) => applyReplaceColumn(s, optimistic.id, saved),
        )
      },

      async renameColumn(id, name) {
        await runOptimistic(
          (s) => applyRenameColumn(s, id, name),
          () => api.renameColumn(id, name),
          'Could not rename the column.',
        )
      },

      async deleteColumn(id, disposition) {
        await runOptimistic(
          (s) => applyDeleteColumn(s, id, disposition),
          () => api.deleteColumn(id, disposition),
          'Could not delete the column.',
        )
      },

      async reorderColumn(id, toIndex) {
        await runOptimistic(
          (s) => applyReorderColumn(s, id, toIndex),
          () => api.reorderColumn(id, toIndex),
          'Could not reorder the columns.',
        )
      },

      dismissError() {
        set({ error: null })
      },
    }
  })
}

/**
 * The live API instance. Held behind a proxy so tests can swap it without
 * the store (or any component) needing a new reference.
 */
let liveApi: BoardApi = createBoardApi()

/**
 * Stable stand-in for `liveApi`. Methods are bound to the current instance
 * because `Reflect.get` returns them unbound; field reads such as
 * `storageMode` and `wasReset` pass straight through.
 */
const apiProxy = new Proxy({} as BoardApi, {
  get(_target, prop) {
    const value = Reflect.get(liveApi as object, prop)
    return typeof value === 'function' ? value.bind(liveApi) : value
  },
})

export const useBoardStore = createBoardStore(apiProxy)

/**
 * Test-only. Clears persisted state and rebuilds the API so each test starts
 * from pristine seed data. Needed because `LocalStorageBoardApi` reads storage
 * in its constructor, so clearing storage alone leaves stale in-memory state.
 */
export function __resetBoardStoreForTests(): void {
  localStorage.clear()
  liveApi = createBoardApi()
  useBoardStore.setState({
    board: null,
    status: 'loading',
    storageMode: 'persistent',
    error: null,
  })
}
