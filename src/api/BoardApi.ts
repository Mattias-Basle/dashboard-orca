import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'

/**
 * Operation-shaped and async, mirroring the HTTP calls that will replace it.
 * Deliberately not load()/save() over a blob — no backend persists a whole
 * board on every edit.
 */
export interface BoardApi {
  /**
   * Whether edits survive a reload. An HTTP implementation leaves this
   * undefined, which the store reads as 'persistent'. Declared here so the
   * store never has to know which implementation it holds.
   */
  readonly storageMode?: 'persistent' | 'memory'
  /** True when unreadable saved data was discarded on construction. */
  readonly wasReset?: boolean

  getBoard(): Promise<BoardSnapshot>
  createTicket(input: TicketInput): Promise<Ticket>
  updateTicket(id: string, patch: Partial<Ticket>): Promise<Ticket>
  deleteTicket(id: string): Promise<void>
  moveTicket(id: string, toColumnId: string, toIndex: number): Promise<void>
  createColumn(name: string): Promise<Column>
  renameColumn(id: string, name: string): Promise<Column>
  deleteColumn(id: string, disposition: Disposition): Promise<void>
  reorderColumn(id: string, toIndex: number): Promise<void>
}
