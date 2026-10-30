import type { BoardSnapshot } from '../../types/board'

/**
 * Resolves a dnd-kit drop into a move instruction, or null when the drop is a
 * no-op. Dropping on a column id appends; dropping on a ticket takes that
 * ticket's position.
 *
 * The index comes from the ORIGINAL array, not the array with the dragged
 * ticket removed: `applyMoveTicket` strips the id first and then inserts, so
 * the original index is what lands it correctly in both directions. Using the
 * post-removal index silently turns same-column downward drags into no-ops.
 */
export function resolveDrop(
  board: BoardSnapshot,
  activeId: string,
  overId: string,
): { toColumnId: string; toIndex: number } | null {
  if (activeId === overId) return null

  const targetColumn =
    board.columns.find((c) => c.id === overId) ??
    board.columns.find((c) => c.ticketIds.includes(overId))
  if (!targetColumn) return null

  const source = board.columns.find((c) => c.ticketIds.includes(activeId))
  if (!source) return null

  const toIndex =
    targetColumn.id === overId
      ? targetColumn.ticketIds.filter((id) => id !== activeId).length
      : targetColumn.ticketIds.indexOf(overId)

  if (source.id === targetColumn.id && source.ticketIds.indexOf(activeId) === toIndex) {
    return null
  }

  return { toColumnId: targetColumn.id, toIndex }
}
