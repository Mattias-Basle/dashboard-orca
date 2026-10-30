import { useState } from 'react'
import { useBoardStore } from '../../store/boardStore'
import type { Column } from '../../types/board'

export function ColumnHeader({
  column,
  ticketCount,
  canDelete,
  onRequestDelete,
}: {
  column: Column
  ticketCount: number
  canDelete: boolean
  onRequestDelete: () => void
}) {
  const renameColumn = useBoardStore((s) => s.renameColumn)
  const reorderColumn = useBoardStore((s) => s.reorderColumn)
  const columns = useBoardStore((s) => s.board!.columns)

  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const index = columns.findIndex((c) => c.id === column.id)

  function commitRename(value: string) {
    setEditing(false)
    const name = value.trim()
    if (name !== '' && name !== column.name) void renameColumn(column.id, name)
  }

  return (
    <header className="relative flex items-center gap-2 px-1 py-1.5">
      {editing ? (
        <input
          autoFocus
          aria-label="Rename column"
          defaultValue={column.name}
          onBlur={(e) => commitRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full rounded border border-sky-400 px-1 py-0.5 text-xs uppercase"
        />
      ) : (
        <h2
          onDoubleClick={() => setEditing(true)}
          className="cursor-text text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          {column.name}
        </h2>
      )}

      <span className="rounded-full bg-slate-200 px-1.5 text-[11px] text-slate-600">
        {ticketCount}
      </span>

      <button
        type="button"
        aria-label="Column actions"
        onClick={() => setMenuOpen((open) => !open)}
        className="ml-auto rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
      >
        ⋯
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 z-10 w-40 rounded border border-slate-200 bg-white py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              setEditing(true)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100"
          >
            Rename
          </button>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => {
              setMenuOpen(false)
              void reorderColumn(column.id, index - 1)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 disabled:text-slate-300"
          >
            Move left
          </button>
          <button
            type="button"
            disabled={index === columns.length - 1}
            onClick={() => {
              setMenuOpen(false)
              void reorderColumn(column.id, index + 1)
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-slate-100 disabled:text-slate-300"
          >
            Move right
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => {
              setMenuOpen(false)
              onRequestDelete()
            }}
            className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 disabled:text-slate-300"
          >
            Delete column
          </button>
        </div>
      )}
    </header>
  )
}
