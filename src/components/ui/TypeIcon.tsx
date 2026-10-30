import type { TicketType } from '../../types/board'

const STYLES: Record<TicketType, { glyph: string; className: string }> = {
  story: { glyph: '▪', className: 'bg-emerald-500 text-white' },
  bug: { glyph: '●', className: 'bg-rose-500 text-white' },
  task: { glyph: '✓', className: 'bg-sky-500 text-white' },
}

export function TypeIcon({ type }: { type: TicketType }) {
  const { glyph, className } = STYLES[type]
  return (
    <span
      aria-label={`Type: ${type}`}
      role="img"
      className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] leading-none ${className}`}
    >
      {glyph}
    </span>
  )
}
