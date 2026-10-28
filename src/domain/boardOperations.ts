import type { BoardSnapshot, Column, Disposition, Ticket } from '../types/board'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function applyAddTicket(
  s: BoardSnapshot,
  ticket: Ticket,
  columnId: string,
): BoardSnapshot {
  if (!s.columns.some((c) => c.id === columnId)) return s
  return {
    ...s,
    tickets: { ...s.tickets, [ticket.id]: ticket },
    columns: s.columns.map((c) =>
      c.id === columnId ? { ...c, ticketIds: [...c.ticketIds, ticket.id] } : c,
    ),
  }
}

export function applyReplaceTicket(
  s: BoardSnapshot,
  tempId: string,
  saved: Ticket,
): BoardSnapshot {
  if (!s.tickets[tempId]) return s
  const { [tempId]: _dropped, ...rest } = s.tickets
  return {
    ...s,
    tickets: { ...rest, [saved.id]: saved },
    columns: s.columns.map((c) =>
      c.ticketIds.includes(tempId)
        ? { ...c, ticketIds: c.ticketIds.map((t) => (t === tempId ? saved.id : t)) }
        : c,
    ),
  }
}

export function applyUpdateTicket(
  s: BoardSnapshot,
  id: string,
  patch: Partial<Ticket>,
): BoardSnapshot {
  const existing = s.tickets[id]
  if (!existing) return s
  return {
    ...s,
    tickets: { ...s.tickets, [id]: { ...existing, ...patch, id: existing.id } },
  }
}

export function applyDeleteTicket(s: BoardSnapshot, id: string): BoardSnapshot {
  if (!s.tickets[id]) return s
  const { [id]: _dropped, ...rest } = s.tickets
  return {
    ...s,
    tickets: rest,
    columns: s.columns.map((c) =>
      c.ticketIds.includes(id)
        ? { ...c, ticketIds: c.ticketIds.filter((t) => t !== id) }
        : c,
    ),
  }
}

export function applyMoveTicket(
  s: BoardSnapshot,
  id: string,
  toColumnId: string,
  toIndex: number,
): BoardSnapshot {
  if (!s.tickets[id]) return s
  if (!s.columns.some((c) => c.id === toColumnId)) return s

  const stripped = s.columns.map((c) =>
    c.ticketIds.includes(id)
      ? { ...c, ticketIds: c.ticketIds.filter((t) => t !== id) }
      : c,
  )

  return {
    ...s,
    columns: stripped.map((c) => {
      if (c.id !== toColumnId) return c
      const next = [...c.ticketIds]
      next.splice(clamp(toIndex, 0, next.length), 0, id)
      return { ...c, ticketIds: next }
    }),
  }
}

export function applyAddColumn(s: BoardSnapshot, column: Column): BoardSnapshot {
  return { ...s, columns: [...s.columns, column] }
}

export function applyReplaceColumn(
  s: BoardSnapshot,
  tempId: string,
  saved: Column,
): BoardSnapshot {
  if (!s.columns.some((c) => c.id === tempId)) return s
  return {
    ...s,
    columns: s.columns.map((c) =>
      c.id === tempId ? { ...saved, ticketIds: c.ticketIds } : c,
    ),
  }
}

export function applyRenameColumn(
  s: BoardSnapshot,
  id: string,
  name: string,
): BoardSnapshot {
  if (!s.columns.some((c) => c.id === id)) return s
  return {
    ...s,
    columns: s.columns.map((c) => (c.id === id ? { ...c, name } : c)),
  }
}

export function applyDeleteColumn(
  s: BoardSnapshot,
  id: string,
  disposition: Disposition,
): BoardSnapshot {
  const column = s.columns.find((c) => c.id === id)
  if (!column) return s
  if (s.columns.length <= 1) return s

  if (disposition.kind === 'move') {
    const target = disposition.toColumnId
    if (target === id || !s.columns.some((c) => c.id === target)) return s
    return {
      ...s,
      columns: s.columns
        .filter((c) => c.id !== id)
        .map((c) =>
          c.id === target
            ? { ...c, ticketIds: [...c.ticketIds, ...column.ticketIds] }
            : c,
        ),
    }
  }

  const tickets = { ...s.tickets }
  for (const ticketId of column.ticketIds) delete tickets[ticketId]
  return { ...s, tickets, columns: s.columns.filter((c) => c.id !== id) }
}

export function applyReorderColumn(
  s: BoardSnapshot,
  id: string,
  toIndex: number,
): BoardSnapshot {
  const from = s.columns.findIndex((c) => c.id === id)
  if (from === -1) return s
  const next = [...s.columns]
  const [moved] = next.splice(from, 1)
  next.splice(clamp(toIndex, 0, next.length), 0, moved)
  return { ...s, columns: next }
}
