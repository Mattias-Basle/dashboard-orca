export function Banner({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <div className="flex items-center justify-between bg-amber-100 px-4 py-2 text-sm text-amber-900">
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss banner"
        className="text-amber-700 hover:text-amber-900"
      >
        ×
      </button>
    </div>
  )
}
