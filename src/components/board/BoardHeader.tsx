import { useBoardStore } from '../../store/boardStore'

export function BoardHeader() {
  const board = useBoardStore((s) => s.board)
  if (!board) return null
  const count = Object.keys(board.tickets).length

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <h1 className="text-base font-semibold text-slate-800">{board.boardName}</h1>
      <span className="text-xs text-slate-500">
        {count} {count === 1 ? 'ticket' : 'tickets'}
      </span>
    </header>
  )
}
