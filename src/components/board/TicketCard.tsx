import type { CSSProperties } from 'react'
import type { Member, Ticket } from '../../types/board'
import { TypeIcon } from '../ui/TypeIcon'
import { PriorityIcon } from '../ui/PriorityIcon'
import { Avatar } from '../ui/Avatar'
import { LabelChip } from '../ui/LabelChip'

export function TicketCard({
  ticket,
  member,
  onOpen,
  dragRef,
  dragProps,
  style,
  isDragging,
}: {
  ticket: Ticket
  member: Member | null
  onOpen: () => void
  dragRef?: (node: HTMLElement | null) => void
  dragProps?: Record<string, unknown>
  style?: CSSProperties
  isDragging?: boolean
}) {
  return (
    <button
      type="button"
      ref={dragRef}
      style={style}
      onClick={onOpen}
      data-testid={`ticket-${ticket.id}`}
      className={`w-full rounded border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        isDragging ? 'opacity-40' : ''
      }`}
      {...dragProps}
    >
      <p className="text-sm text-slate-800">{ticket.title}</p>

      {ticket.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ticket.labels.map((label) => (
            <LabelChip key={label} label={label} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <TypeIcon type={ticket.type} />
        <PriorityIcon priority={ticket.priority} />
        <span className="font-mono text-[11px] text-slate-500">
          {ticket.key || '…'}
        </span>
        {ticket.storyPoints !== null && (
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">
            {ticket.storyPoints}
          </span>
        )}
        <span className="ml-auto">
          <Avatar member={member} />
        </span>
      </div>
    </button>
  )
}
