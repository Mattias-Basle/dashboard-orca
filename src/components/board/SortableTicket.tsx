import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Member, Ticket } from '../../types/board'
import { TicketCard } from './TicketCard'

export function SortableTicket({
  ticket,
  member,
  onOpen,
}: {
  ticket: Ticket
  member: Member | null
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id, data: { type: 'ticket' } })

  return (
    <TicketCard
      ticket={ticket}
      member={member}
      onOpen={onOpen}
      dragRef={setNodeRef}
      dragProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    />
  )
}
