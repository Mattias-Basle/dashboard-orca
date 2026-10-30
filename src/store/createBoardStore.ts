import { create } from 'zustand'
import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'
import type { BoardApi } from '../api/BoardApi'
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
  addTicket(input: TicketInput): Promise<boolean>
  updateTicket(id: string, patch: Partial<Ticket>): Promise<boolean>
  deleteTicket(id: string): Promise<boolean>
  moveTicket(id: string, toColumnId: string, toIndex: number): Promise<boolean>
  addColumn(name: string): Promise<boolean>
  renameColumn(id: string, name: string): Promise<boolean>
  deleteColumn(id: string, disposition: Disposition): Promise<boolean>
  reorderColumn(id: string, toIndex: number): Promise<boolean>
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
    ): Promise<boolean> {
      const snapshot = get().board
      if (!snapshot) return false
      set({ board: apply(snapshot), error: null })
      try {
        const result = await call()
        if (commit) {
          set((s) => ({ board: commit(s.board!, result as never) }))
        }
        return true
      } catch {
        set({ board: snapshot, error: fallbackMessage })
        return false
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
        return runOptimistic(
          (s) => applyAddTicket(s, optimistic, input.columnId),
          () => api.createTicket(input),
          'Could not create the ticket.',
          (s, saved: Ticket) => applyReplaceTicket(s, optimistic.id, saved),
        )
      },

      async updateTicket(id, patch) {
        return runOptimistic(
          (s) => applyUpdateTicket(s, id, patch),
          () => api.updateTicket(id, patch),
          'Could not save your changes.',
        )
      },

      async deleteTicket(id) {
        return runOptimistic(
          (s) => applyDeleteTicket(s, id),
          () => api.deleteTicket(id),
          'Could not delete the ticket.',
        )
      },

      async moveTicket(id, toColumnId, toIndex) {
        return runOptimistic(
          (s) => applyMoveTicket(s, id, toColumnId, toIndex),
          () => api.moveTicket(id, toColumnId, toIndex),
          'Could not move the ticket.',
        )
      },

      async addColumn(name) {
        const optimistic = buildColumn(name)
        return runOptimistic(
          (s) => applyAddColumn(s, optimistic),
          () => api.createColumn(name),
          'Could not create the column.',
          (s, saved: Column) => applyReplaceColumn(s, optimistic.id, saved),
        )
      },

      async renameColumn(id, name) {
        return runOptimistic(
          (s) => applyRenameColumn(s, id, name),
          () => api.renameColumn(id, name),
          'Could not rename the column.',
        )
      },

      async deleteColumn(id, disposition) {
        return runOptimistic(
          (s) => applyDeleteColumn(s, id, disposition),
          () => api.deleteColumn(id, disposition),
          'Could not delete the column.',
        )
      },

      async reorderColumn(id, toIndex) {
        return runOptimistic(
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
