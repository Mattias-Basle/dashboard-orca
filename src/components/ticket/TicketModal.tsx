import { useBoardStore } from '../../store/boardStore'
import { Modal } from '../ui/Modal'
import { TicketForm, type TicketFormValues } from './TicketForm'

export type TicketModalMode =
  | { kind: 'create'; columnId: string }
  | { kind: 'edit'; ticketId: string }
  | null

export function TicketModal({
  mode,
  onClose,
}: {
  mode: TicketModalMode
  onClose: () => void
}) {
  const board = useBoardStore((s) => s.board)
  const addTicket = useBoardStore((s) => s.addTicket)
  const updateTicket = useBoardStore((s) => s.updateTicket)
  const deleteTicket = useBoardStore((s) => s.deleteTicket)
  const moveTicket = useBoardStore((s) => s.moveTicket)

  if (!board || !mode) return null

  const existing = mode.kind === 'edit' ? board.tickets[mode.ticketId] : null
  if (mode.kind === 'edit' && !existing) return null

  const currentColumnId =
    mode.kind === 'create'
      ? mode.columnId
      : (board.columns.find((c) => c.ticketIds.includes(mode.ticketId))?.id ??
        board.columns[0].id)

  const initial: TicketFormValues = existing
    ? {
        title: existing.title,
        description: existing.description,
        type: existing.type,
        priority: existing.priority,
        assigneeId: existing.assigneeId,
        labels: existing.labels,
        storyPoints: existing.storyPoints,
        columnId: currentColumnId,
      }
    : {
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        assigneeId: null,
        labels: [],
        storyPoints: null,
        columnId: currentColumnId,
      }

  async function handleSubmit(values: TicketFormValues) {
    let succeeded = true
    if (mode?.kind === 'create') {
      succeeded = await addTicket(values)
    } else if (mode?.kind === 'edit') {
      const { columnId, ...fields } = values
      succeeded = await updateTicket(mode.ticketId, fields)
      if (columnId !== currentColumnId) {
        const target = board!.columns.find((c) => c.id === columnId)
        const moved = await moveTicket(mode.ticketId, columnId, target ? target.ticketIds.length : 0)
        succeeded = succeeded && moved
      }
    }
    if (succeeded) onClose()
  }

  async function handleDelete() {
    if (mode?.kind !== 'edit') return
    const succeeded = await deleteTicket(mode.ticketId)
    if (succeeded) onClose()
  }

  return (
    <Modal open labelledBy="ticket-modal-title" onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 id="ticket-modal-title" className="font-mono text-sm text-slate-500">
          {existing ? existing.key || '…' : 'New ticket'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      </div>
      <TicketForm
        board={board}
        initial={initial}
        onSubmit={handleSubmit}
        onDelete={existing ? handleDelete : undefined}
      />
    </Modal>
  )
}
