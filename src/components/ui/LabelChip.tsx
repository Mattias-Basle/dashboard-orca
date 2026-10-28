export function LabelChip({
  label,
  onRemove,
}: {
  label: string
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove label ${label}`}
          className="text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      )}
    </span>
  )
}
