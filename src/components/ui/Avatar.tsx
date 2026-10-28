import type { Member } from '../../types/board'

export function Avatar({ member }: { member: Member | null }) {
  if (!member) {
    return (
      <span
        title="Unassigned"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] text-slate-400"
      >
        ?
      </span>
    )
  }
  return (
    <span
      title={member.name}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${member.color}`}
    >
      {member.initials}
    </span>
  )
}
