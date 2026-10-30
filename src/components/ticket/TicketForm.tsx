import { useId, useState, type FormEvent } from 'react'
import type {
  BoardSnapshot,
  Priority,
  StoryPoints,
  TicketType,
} from '../../types/board'
import { PRIORITIES, STORY_POINT_SCALE, TICKET_TYPES } from '../../types/board'
import { Select } from '../ui/Select'
import { LabelChip } from '../ui/LabelChip'

export type TicketFormValues = {
  title: string
  description: string
  type: TicketType
  priority: Priority
  assigneeId: string | null
  labels: string[]
  storyPoints: StoryPoints | null
  columnId: string
}

export function TicketForm({
  board,
  initial,
  onSubmit,
  onDelete,
}: {
  board: BoardSnapshot
  initial: TicketFormValues
  onSubmit: (values: TicketFormValues) => void
  onDelete?: () => void
}) {
  const titleId = useId()
  const [values, setValues] = useState(initial)
  const [labelDraft, setLabelDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (values.title.trim() === '') {
      setError('Title is required')
      return
    }
    onSubmit({ ...values, title: values.title.trim() })
  }

  function addLabel() {
    const label = labelDraft.trim()
    if (label === '' || values.labels.includes(label)) return
    set('labels', [...values.labels, label])
    setLabelDraft('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <label htmlFor={titleId} className="text-xs text-slate-500">
          Title
        </label>
        <input
          id={titleId}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Select
          label="Type"
          value={values.type}
          onChange={(v) => set('type', v as TicketType)}
          options={TICKET_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <Select
          label="Priority"
          value={values.priority}
          onChange={(v) => set('priority', v as Priority)}
          options={PRIORITIES.map((p) => ({ value: p, label: p }))}
        />
        <Select
          label="Story points"
          value={values.storyPoints === null ? '' : String(values.storyPoints)}
          onChange={(v) => set('storyPoints', v === '' ? null : (Number(v) as StoryPoints))}
          options={[
            { value: '', label: '—' },
            ...STORY_POINT_SCALE.map((p) => ({ value: String(p), label: String(p) })),
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Assignee"
          value={values.assigneeId ?? ''}
          onChange={(v) => set('assigneeId', v === '' ? null : v)}
          options={[
            { value: '', label: 'Unassigned' },
            ...board.members.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <Select
          label="Status"
          value={values.columnId}
          onChange={(v) => set('columnId', v)}
          options={board.columns.map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-slate-500">Labels</span>
        <div className="flex flex-wrap items-center gap-1">
          {values.labels.map((label) => (
            <LabelChip
              key={label}
              label={label}
              onRemove={() => set('labels', values.labels.filter((l) => l !== label))}
            />
          ))}
          <input
            aria-label="Add label"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addLabel()
              }
            }}
            placeholder="Add…"
            className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-[11px]"
          />
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs text-slate-500">
        Description
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
        />
      </label>

      <div className="flex justify-end gap-2">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="mr-auto rounded px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        )}
        <button
          type="submit"
          className="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          Save
        </button>
      </div>
    </form>
  )
}
