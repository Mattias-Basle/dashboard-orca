import type { BoardSnapshot, Ticket } from '../types/board'

function seedTicket(n: number, over: Partial<Ticket>): Ticket {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `seed-${n}`,
    key: `ORC-${n}`,
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    assigneeId: null,
    labels: [],
    storyPoints: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

export function createSeed(): { board: BoardSnapshot; ticketCounter: number } {
  const tickets = [
    seedTicket(1, {
      title: 'Set up project repository',
      type: 'task',
      priority: 'high',
      assigneeId: 'm1',
      labels: ['infra'],
      storyPoints: 2,
    }),
    seedTicket(2, {
      title: 'Add navigation bar',
      type: 'story',
      priority: 'medium',
      assigneeId: 'm2',
      labels: ['ui'],
      storyPoints: 3,
    }),
    seedTicket(3, {
      title: 'Fix login bug with SSO enabled',
      description: "Users can't log in when SSO is enabled on the workspace.",
      type: 'bug',
      priority: 'highest',
      assigneeId: 'm1',
      labels: ['auth', 'ui'],
      storyPoints: 5,
    }),
    seedTicket(4, {
      title: 'Write onboarding docs',
      type: 'task',
      priority: 'low',
      assigneeId: 'm3',
      labels: ['docs'],
      storyPoints: 1,
    }),
    seedTicket(5, {
      title: 'Deploy v1 to staging',
      type: 'task',
      priority: 'medium',
      assigneeId: 'm2',
      labels: ['infra'],
      storyPoints: 3,
    }),
  ]

  return {
    ticketCounter: 5,
    board: {
      boardName: 'Orca Board',
      columns: [
        { id: 'col-todo', name: 'To Do', ticketIds: ['seed-1', 'seed-2'] },
        { id: 'col-doing', name: 'In Progress', ticketIds: ['seed-3'] },
        { id: 'col-done', name: 'Done', ticketIds: ['seed-4', 'seed-5'] },
      ],
      tickets: Object.fromEntries(tickets.map((t) => [t.id, t])),
      members: [
        { id: 'm1', name: 'Mattias B', initials: 'MB', color: 'bg-violet-500' },
        { id: 'm2', name: 'Alex L', initials: 'AL', color: 'bg-sky-500' },
        { id: 'm3', name: 'Dana K', initials: 'DK', color: 'bg-emerald-500' },
      ],
    },
  }
}
