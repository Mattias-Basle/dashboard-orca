import { useEffect, useState } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { BoardHeader } from './BoardHeader'
import { Board } from './Board'
import { Toast } from '../ui/Toast'
import { Banner } from '../ui/Banner'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { TicketModal, type TicketModalMode } from '../ticket/TicketModal'

export function BoardScreen() {
  const status = useBoardStore((s) => s.status)
  const storageMode = useBoardStore((s) => s.storageMode)
  const error = useBoardStore((s) => s.error)
  const load = useBoardStore((s) => s.load)
  const dismissError = useBoardStore((s) => s.dismissError)
  const board = useBoardStore((s) => s.board)
  const deleteColumn = useBoardStore((s) => s.deleteColumn)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [modalMode, setModalMode] = useState<TicketModalMode>(null)
  const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<string>('')

  const deletingColumn = board?.columns.find((c) => c.id === deletingColumnId) ?? null
  const otherColumns = board?.columns.filter((c) => c.id !== deletingColumnId) ?? []

  function requestDeleteColumn(columnId: string) {
    const column = board?.columns.find((c) => c.id === columnId)
    if (!column) return
    if (column.ticketIds.length === 0) {
      void deleteColumn(columnId, { kind: 'delete' })
      return
    }
    const target = board?.columns.find((c) => c.id !== columnId)
    if (!target) return
    setMoveTarget(target.id)
    setDeletingColumnId(columnId)
  }

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'loading') {
    return <p className="p-8 text-sm text-slate-500">Loading board…</p>
  }
  if (status === 'error') {
    return <p className="p-8 text-sm text-rose-600">Could not load the board.</p>
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {storageMode === 'memory' && !bannerDismissed && (
        <Banner
          message="Changes won't be saved — this browser is blocking local storage."
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      <BoardHeader />
      <Board
        onOpenTicket={(ticketId) => setModalMode({ kind: 'edit', ticketId })}
        onCreate={(columnId) => setModalMode({ kind: 'create', columnId })}
        onRequestDeleteColumn={requestDeleteColumn}
      />
      <Modal
        open={deletingColumn !== null}
        labelledBy="delete-column-title"
        onClose={() => setDeletingColumnId(null)}
      >
        <div className="p-5">
          <h2 id="delete-column-title" className="text-sm font-semibold text-slate-800">
            Delete "{deletingColumn?.name}"?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            It holds {deletingColumn?.ticketIds.length} ticket(s).
          </p>
          <div className="mt-4">
            <Select
              label="Move its tickets to"
              value={moveTarget}
              onChange={setMoveTarget}
              options={[
                ...otherColumns.map((c) => ({ value: c.id, label: c.name })),
                { value: '', label: 'Delete them' },
              ]}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingColumnId(null)}
              className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const id = deletingColumnId!
                setDeletingColumnId(null)
                void deleteColumn(
                  id,
                  moveTarget === '' ? { kind: 'delete' } : { kind: 'move', toColumnId: moveTarget },
                )
              }}
              className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
      <TicketModal mode={modalMode} onClose={() => setModalMode(null)} />
      <Toast message={error} onDismiss={dismissError} />
    </div>
  )
}
