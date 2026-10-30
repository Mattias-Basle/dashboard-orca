import { useState } from 'react'
import { useBoardStore } from '../../store/boardStore'

export function BoardHeader() {
  const board = useBoardStore((s) => s.board)
  const addColumn = useBoardStore((s) => s.addColumn)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  if (!board) return null
  const count = Object.keys(board.tickets).length

  async function submit() {
    const trimmed = name.trim()
    if (trimmed === '') return
    setName('')
    setAdding(false)
    await addColumn(trimmed)
  }

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <h1 className="text-base font-semibold text-slate-800">{board.boardName}</h1>
      <span className="text-xs text-slate-500">
        {count} {count === 1 ? 'ticket' : 'tickets'}
      </span>
      {adding ? (
        <span className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="new-column-name">
            Column name
          </label>
          <input
            id="new-column-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit()
              if (e.key === 'Escape') {
                setAdding(false)
                setName('')
              }
            }}
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => void submit()}
            className="rounded bg-sky-600 px-2.5 py-1 text-sm text-white hover:bg-sky-700"
          >
            Add
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ml-auto rounded px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          + Add column
        </button>
      )}
    </header>
  )
}
