export type TicketType = 'story' | 'bug' | 'task'
export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'
export type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13

export const STORY_POINT_SCALE: readonly StoryPoints[] = [1, 2, 3, 5, 8, 13]
export const TICKET_TYPES: readonly TicketType[] = ['story', 'bug', 'task']
export const PRIORITIES: readonly Priority[] = [
  'highest',
  'high',
  'medium',
  'low',
  'lowest',
]

export type Ticket = {
  id: string
  /** "ORC-14". Assigned by the API layer. Empty string while a create is in flight. */
  key: string
  title: string
  description: string
  type: TicketType
  priority: Priority
  assigneeId: string | null
  labels: string[]
  storyPoints: StoryPoints | null
  createdAt: string
  updatedAt: string
}

export type Column = {
  id: string
  name: string
  /** Ordered. A ticket id appears in exactly one column. */
  ticketIds: string[]
}

export type Member = {
  id: string
  name: string
  initials: string
  /** Tailwind background class, e.g. "bg-violet-500". */
  color: string
}

export type BoardSnapshot = {
  boardName: string
  columns: Column[]
  tickets: Record<string, Ticket>
  members: Member[]
}

export type TicketInput = Omit<
  Ticket,
  'id' | 'key' | 'createdAt' | 'updatedAt'
> & {
  columnId: string
}

export type Disposition =
  | { kind: 'move'; toColumnId: string }
  | { kind: 'delete' }
