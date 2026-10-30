import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column as ColumnModel, Member, Ticket } from '../../types/board'
import { SortableTicket } from './SortableTicket'

export function Column({
  column,
  tickets,
  members,
  onOpenTicket,
  onCreate,
}: {
  column: ColumnModel
  tickets: Ticket[]
  members: Member[]
  onOpenTicket: (id: string) => void
  onCreate: () => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'column' } })

  return (
    <section
      data-testid={`column-${column.id}`}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100 p-2"
    >
      <header className="flex items-center gap-2 px-1 py-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {column.name}
        </h2>
        <span className="rounded-full bg-slate-200 px-1.5 text-[11px] text-slate-600">
          {tickets.length}
        </span>
      </header>

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
