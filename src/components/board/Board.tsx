import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import { Column } from './Column'

export function Board({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const board = useBoardStore((s) => s.board)
  const moveTicket = useBoardStore((s) => s.moveTicket)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!board) return null

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || !board) return
    const ticketId = String(active.id)
    const overId = String(over.id)
    if (ticketId === overId) return

    const targetColumn =
      board.columns.find((c) => c.id === overId) ??
      board.columns.find((c) => c.ticketIds.includes(overId))
    if (!targetColumn) return

    const source = board.columns.find((c) => c.ticketIds.includes(ticketId))
    if (!source) return

    const withoutTicket = targetColumn.ticketIds.filter((id) => id !== ticketId)
    const index =
      targetColumn.id === overId
        ? withoutTicket.length
        : withoutTicket.indexOf(overId)

    if (source.id === targetColumn.id && source.ticketIds.indexOf(ticketId) === index) {
      return
    }
    void moveTicket(ticketId, targetColumn.id, index)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tickets={column.ticketIds.map((id) => board.tickets[id]).filter(Boolean)}
            members={board.members}
            onOpenTicket={onOpenTicket}
          />
        ))}
      </div>
    </DndContext>
  )
}
