import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column as ColumnModel, Member, Ticket } from '../../types/board'
import { SortableTicket } from './SortableTicket'
import { ColumnHeader } from './ColumnHeader'

export function Column({
  column,
  tickets,
  members,
  onOpenTicket,
  onCreate,
  canDelete,
  onRequestDelete,
}: {
  column: ColumnModel
  tickets: Ticket[]
  members: Member[]
  onOpenTicket: (id: string) => void
  onCreate: () => void
  canDelete: boolean
  onRequestDelete: () => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'column' } })

  return (
    <section
      data-testid={`column-${column.id}`}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100 p-2"
    >
      <ColumnHeader
        column={column}
        ticketCount={tickets.length}
        canDelete={canDelete}
        onRequestDelete={onRequestDelete}
      />

      <SortableContext items={column.ticketIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
          {tickets.map((ticket) => (
            <SortableTicket
              key={ticket.id}
              ticket={ticket}
              member={members.find((m) => m.id === ticket.assigneeId) ?? null}
              onOpen={() => onOpenTicket(ticket.id)}
            />
          ))}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={onCreate}
        className="mt-2 rounded px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-200"
      >
        + Create
      </button>
    </section>
  )
}
