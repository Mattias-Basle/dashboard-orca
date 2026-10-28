import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'
import type { BoardApi } from './BoardApi'
import { createSeed } from './seedData'
import { buildColumn, buildTicket } from '../domain/factories'
import {
  applyAddColumn,
  applyAddTicket,
  applyDeleteColumn,
  applyDeleteTicket,
  applyMoveTicket,
  applyRenameColumn,
  applyReorderColumn,
  applyUpdateTicket,
} from '../domain/boardOperations'

export const STORAGE_KEY = 'orca.board.v1'
export const SCHEMA_VERSION = 1

type Persisted = {
  schemaVersion: number
  ticketCounter: number
  board: BoardSnapshot
}

function isValid(value: unknown): value is Persisted {
  const p = value as Persisted
  return (
    !!p &&
    p.schemaVersion === SCHEMA_VERSION &&
    typeof p.ticketCounter === 'number' &&
    !!p.board &&
    Array.isArray(p.board.columns) &&
    p.board.columns.length > 0 &&
    !!p.board.tickets
  )
}

export class LocalStorageBoardApi implements BoardApi {
  storageMode: 'persistent' | 'memory' = 'persistent'
  wasReset = false

  private state: Persisted
  private storage: Storage | null

  constructor(storage: Storage | null = globalThis.localStorage ?? null) {
    this.storage = storage
    this.state = this.read()
    this.write()
  }

  private read(): Persisted {
    if (!this.storage) {
      this.storageMode = 'memory'
      return this.seed()
    }
    let raw: string | null = null
    try {
      raw = this.storage.getItem(STORAGE_KEY)
    } catch {
      this.storageMode = 'memory'
      return this.seed()
    }
    if (raw === null) return this.seed()
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isValid(parsed)) {
        this.wasReset = true
        return this.seed()
      }
      return parsed
    } catch {
      this.wasReset = true
      return this.seed()
    }
  }

  private seed(): Persisted {
    const { board, ticketCounter } = createSeed()
    return { schemaVersion: SCHEMA_VERSION, ticketCounter, board }
  }

  private write(): void {
    if (!this.storage || this.storageMode === 'memory') return
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      this.storageMode = 'memory'
    }
  }

  private commit(board: BoardSnapshot): void {
    this.state = { ...this.state, board }
    this.write()
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
  }

  async getBoard(): Promise<BoardSnapshot> {
    return this.clone(this.state.board)
  }

  async createTicket(input: TicketInput): Promise<Ticket> {
    const counter = this.state.ticketCounter + 1
    const ticket: Ticket = { ...buildTicket(input), key: `ORC-${counter}` }
    const board = applyAddTicket(this.state.board, ticket, input.columnId)
    if (board === this.state.board) throw new Error(`Unknown column: ${input.columnId}`)
    this.state = { ...this.state, ticketCounter: counter }
    this.commit(board)
    return this.clone(ticket)
  }

  async updateTicket(id: string, patch: Partial<Ticket>): Promise<Ticket> {
    const board = applyUpdateTicket(this.state.board, id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    if (board === this.state.board) throw new Error(`Unknown ticket: ${id}`)
    this.commit(board)
    return this.clone(board.tickets[id])
  }

  async deleteTicket(id: string): Promise<void> {
    const board = applyDeleteTicket(this.state.board, id)
    if (board === this.state.board) throw new Error(`Unknown ticket: ${id}`)
    this.commit(board)
  }

  async moveTicket(id: string, toColumnId: string, toIndex: number): Promise<void> {
    const board = applyMoveTicket(this.state.board, id, toColumnId, toIndex)
    if (board === this.state.board) throw new Error(`Cannot move ${id} to ${toColumnId}`)
    this.commit(board)
  }

  async createColumn(name: string): Promise<Column> {
    const column = buildColumn(name)
    this.commit(applyAddColumn(this.state.board, column))
    return this.clone(column)
  }

  async renameColumn(id: string, name: string): Promise<Column> {
    const board = applyRenameColumn(this.state.board, id, name)
    if (board === this.state.board) throw new Error(`Unknown column: ${id}`)
    this.commit(board)
    return this.clone(board.columns.find((c) => c.id === id)!)
  }

  async deleteColumn(id: string, disposition: Disposition): Promise<void> {
    const board = applyDeleteColumn(this.state.board, id, disposition)
    if (board === this.state.board) throw new Error(`Cannot delete column: ${id}`)
    this.commit(board)
  }

  async reorderColumn(id: string, toIndex: number): Promise<void> {
    const board = applyReorderColumn(this.state.board, id, toIndex)
    if (board === this.state.board) throw new Error(`Unknown column: ${id}`)
    this.commit(board)
  }
}
