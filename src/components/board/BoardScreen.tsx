import { useEffect, useState } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { BoardHeader } from './BoardHeader'
import { Board } from './Board'
import { Toast } from '../ui/Toast'
import { Banner } from '../ui/Banner'
import { TicketModal, type TicketModalMode } from '../ticket/TicketModal'

export function BoardScreen() {
  const status = useBoardStore((s) => s.status)
  const storageMode = useBoardStore((s) => s.storageMode)
  const error = useBoardStore((s) => s.error)
  const load = useBoardStore((s) => s.load)
  const dismissError = useBoardStore((s) => s.dismissError)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [modalMode, setModalMode] = useState<TicketModalMode>(null)

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
      />
      <TicketModal mode={modalMode} onClose={() => setModalMode(null)} />
      <Toast message={error} onDismiss={dismissError} />
    </div>
  )
}
