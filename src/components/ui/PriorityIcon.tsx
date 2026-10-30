import type { Priority } from '../../types/board'

const STYLES: Record<Priority, { glyph: string; className: string }> = {
  highest: { glyph: '⏫', className: 'text-rose-600' },
  high: { glyph: '▲', className: 'text-orange-500' },
  medium: { glyph: '■', className: 'text-amber-500' },
  low: { glyph: '▼', className: 'text-sky-600' },
  lowest: { glyph: '⏬', className: 'text-slate-400' },
}

export function PriorityIcon({ priority }: { priority: Priority }) {
  const { glyph, className } = STYLES[priority]
  return (
    <span aria-label={`Priority: ${priority}`} role="img" className={`text-xs ${className}`}>
      {glyph}
    </span>
  )
}
