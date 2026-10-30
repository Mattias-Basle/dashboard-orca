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
import { resolveDrop } from './resolveDrop'

export function Board({
  onOpenTicket,
  onCreate,
  onRequestDeleteColumn,
}: {
  onOpenTicket: (id: string) => void
  onCreate: (columnId: string) => void
  onRequestDeleteColumn: (columnId: string) => void
}) {
  const board = useBoardStore((s) => s.board)
  const moveTicket = useBoardStore((s) => s.moveTicket)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!board) return null

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || !board) return
    const move = resolveDrop(board, String(active.id), String(over.id))
    if (!move) return
    void moveTicket(String(active.id), move.toColumnId, move.toIndex)
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
            onCreate={() => onCreate(column.id)}
            canDelete={board.columns.length > 1}
            onRequestDelete={() => onRequestDeleteColumn(column.id)}
          />
        ))}
      </div>
    </DndContext>
  )
}
