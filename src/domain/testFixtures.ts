import type { BoardSnapshot, Ticket } from '../types/board'

export function makeTicket(id: string, over: Partial<Ticket> = {}): Ticket {
  return {
    id,
    key: `ORC-${id.replace(/\D/g, '') || '0'}`,
    title: `Ticket ${id}`,
    description: '',
    type: 'task',
    priority: 'medium',
    assigneeId: null,
    labels: [],
    storyPoints: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

/** todo: [t1, t2] · doing: [t3] · done: [] */
export function makeSnapshot(): BoardSnapshot {
  return {
    boardName: 'Orca',
    columns: [
      { id: 'todo', name: 'To Do', ticketIds: ['t1', 't2'] },
      { id: 'doing', name: 'In Progress', ticketIds: ['t3'] },
      { id: 'done', name: 'Done', ticketIds: [] },
    ],
    tickets: {
      t1: makeTicket('t1'),
      t2: makeTicket('t2'),
      t3: makeTicket('t3'),
    },
    members: [
      { id: 'm1', name: 'Mattias B', initials: 'MB', color: 'bg-violet-500' },
    ],
  }
}
