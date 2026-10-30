import type { Column, Ticket, TicketInput } from '../types/board'
import { newId } from '../lib/ids'

/** Builds the optimistic ticket shown before the API responds. */
export function buildTicket(input: TicketInput): Ticket {
  const now = new Date().toISOString()
  const { columnId: _columnId, ...fields } = input
  return {
    ...fields,
    id: newId(),
    key: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function buildColumn(name: string): Column {
  return { id: newId(), name, ticketIds: [] }
}
