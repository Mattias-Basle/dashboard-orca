import { useBoardStore } from '../../store/boardStore'
import { Column } from './Column'

export function Board({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const board = useBoardStore((s) => s.board)
  if (!board) return null

  return (
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
  )
}
