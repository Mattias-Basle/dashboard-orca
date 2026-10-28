import type { Column as ColumnModel, Member, Ticket } from '../../types/board'
import { TicketCard } from './TicketCard'

export function Column({
  column,
  tickets,
  members,
  onOpenTicket,
}: {
  column: ColumnModel
  tickets: Ticket[]
  members: Member[]
  onOpenTicket: (id: string) => void
}) {
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

      <div className="flex flex-col gap-2">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            member={members.find((m) => m.id === ticket.assigneeId) ?? null}
            onOpen={() => onOpenTicket(ticket.id)}
          />
        ))}
      </div>
    </section>
  )
}
