# Kanban Board MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Jira-style kanban board — drag-and-drop tickets across user-defined columns, with rich ticket fields — persisted to localStorage behind an API seam that a real backend can replace later.

**Architecture:** Three layers. Pure domain functions over an immutable `BoardSnapshot` hold every board rule. A Zustand store applies them optimistically, awaits an async `BoardApi`, and rolls back to a pre-action snapshot on failure. `LocalStorageBoardApi` implements that interface today; `HttpBoardApi` replaces it later via a one-line swap in `src/api/index.ts`.

**Tech Stack:** React 18 · TypeScript · Vite · Tailwind CSS v4 · Zustand · @dnd-kit · Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-10-08-kanban-board-design.md`

## Global Constraints

- **Never mutate a `BoardSnapshot`.** Every `apply*` function returns a new object. Tests assert the input is unchanged.
- **Components never generate `id` or `key`.** The API layer owns both. `ticketCounter` lives inside `LocalStorageBoardApi`, never in `BoardSnapshot`.
- **Every `apply*` function returns the input snapshot unchanged when the target entity does not exist.** No throwing on missing ids.
- **Status is not a ticket field.** A ticket's status is the column holding it. Status changes go through `moveTicket`, never `updateTicket`.
- **A board always has at least one column.** `applyDeleteColumn` is a no-op when only one column remains.
- **Every file stays under roughly 150 lines.** A file outgrowing that is doing too much.
- Storage key: `orca.board.v1`. Schema version: `1`. Ticket key prefix: `ORC`.
- Story points are Fibonacci only: `1 | 2 | 3 | 5 | 8 | 13`, or `null`.
- Commit after every task. Use Conventional Commits (`feat:`, `test:`, `chore:`).

---

### Task 1: Project scaffold

Sets up Vite + React + TS + Tailwind v4 + Vitest, and defines the shared types every later task imports. Scaffolded by hand rather than `npm create vite` — the directory already contains `.git`, `.claude`, and `docs`, and the Vite scaffolder prompts interactively when the target is non-empty.

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`
- Create: `src/types/board.ts`
- Test: `src/types/board.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: all types in `src/types/board.ts` — `TicketType`, `Priority`, `StoryPoints`, `Ticket`, `Column`, `Member`, `BoardSnapshot`, `TicketInput`, `Disposition`. Every later task imports from here.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "dashboard-orca",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create the TypeScript configs**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "composite": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

The triple-slash reference is required for the `test` key to typecheck.

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 4: Create `index.html`, `.gitignore`, and the entry files**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Orca Board</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules
dist
.DS_Store
*.local
```

`src/index.css`:

```css
@import "tailwindcss";
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (placeholder — Task 7 replaces the body):

```tsx
export default function App() {
  return <div className="p-8 text-slate-700">Orca Board</div>
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: completes without peer-dependency errors.

- [ ] **Step 6: Write the failing test for the type module**

The types are compile-time only, so this test asserts the one runtime export — the Fibonacci scale that the ticket form and validation both depend on.

`src/types/board.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { STORY_POINT_SCALE } from './board'

describe('STORY_POINT_SCALE', () => {
  it('is the Fibonacci scale in ascending order', () => {
    expect(STORY_POINT_SCALE).toEqual([1, 2, 3, 5, 8, 13])
  })
})
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./board`.

- [ ] **Step 8: Create `src/types/board.ts`**

```ts
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
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 1 test.

- [ ] **Step 10: Verify the dev server and typecheck both work**

Run: `npm run build`
Expected: typecheck passes, `dist/` is produced.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind v4 + Vitest, add board types"
```

---

### Task 2: Pure ticket operations

**Files:**
- Create: `src/lib/ids.ts`, `src/domain/factories.ts`, `src/domain/boardOperations.ts`
- Create: `src/domain/testFixtures.ts`
- Test: `src/domain/boardOperations.ticket.test.ts`

**Interfaces:**
- Consumes: all types from `src/types/board.ts`
- Produces:
  - `newId(): string` from `src/lib/ids.ts`
  - `buildTicket(input: TicketInput): Ticket` from `src/domain/factories.ts`
  - From `src/domain/boardOperations.ts`:
    - `applyAddTicket(s: BoardSnapshot, ticket: Ticket, columnId: string): BoardSnapshot`
    - `applyReplaceTicket(s: BoardSnapshot, tempId: string, saved: Ticket): BoardSnapshot`
    - `applyUpdateTicket(s: BoardSnapshot, id: string, patch: Partial<Ticket>): BoardSnapshot`
    - `applyDeleteTicket(s: BoardSnapshot, id: string): BoardSnapshot`
    - `applyMoveTicket(s: BoardSnapshot, id: string, toColumnId: string, toIndex: number): BoardSnapshot`
  - `makeSnapshot()` from `src/domain/testFixtures.ts`

- [ ] **Step 1: Create `src/lib/ids.ts`**

`crypto.randomUUID` requires a secure context. The fallback keeps localhost-over-plain-HTTP working.

```ts
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}
```

- [ ] **Step 2: Create the shared test fixture**

`src/domain/testFixtures.ts` — a three-column board used by every domain test.

```ts
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
```

- [ ] **Step 3: Write the failing tests**

`src/domain/boardOperations.ticket.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeSnapshot, makeTicket } from './testFixtures'
import {
  applyAddTicket,
  applyDeleteTicket,
  applyMoveTicket,
  applyReplaceTicket,
  applyUpdateTicket,
} from './boardOperations'

const ids = (s: ReturnType<typeof makeSnapshot>, col: string) =>
  s.columns.find((c) => c.id === col)!.ticketIds

describe('applyAddTicket', () => {
  it('appends the ticket to the target column', () => {
    const next = applyAddTicket(makeSnapshot(), makeTicket('t9'), 'todo')
    expect(ids(next, 'todo')).toEqual(['t1', 't2', 't9'])
    expect(next.tickets.t9).toBeDefined()
  })

  it('returns the snapshot unchanged for an unknown column', () => {
    const s = makeSnapshot()
    expect(applyAddTicket(s, makeTicket('t9'), 'nope')).toBe(s)
  })

  it('does not mutate the input', () => {
    const s = makeSnapshot()
    applyAddTicket(s, makeTicket('t9'), 'todo')
    expect(ids(s, 'todo')).toEqual(['t1', 't2'])
    expect(s.tickets.t9).toBeUndefined()
  })
})

describe('applyReplaceTicket', () => {
  it('swaps the temp id for the saved one, preserving position', () => {
    const withTemp = applyAddTicket(makeSnapshot(), makeTicket('tmp'), 'todo')
    const moved = applyMoveTicket(withTemp, 'tmp', 'todo', 0)
    const next = applyReplaceTicket(moved, 'tmp', makeTicket('real', { key: 'ORC-9' }))

    expect(ids(next, 'todo')).toEqual(['real', 't1', 't2'])
    expect(next.tickets.tmp).toBeUndefined()
    expect(next.tickets.real.key).toBe('ORC-9')
  })

  it('returns the snapshot unchanged for an unknown temp id', () => {
    const s = makeSnapshot()
    expect(applyReplaceTicket(s, 'nope', makeTicket('real'))).toBe(s)
  })
})

describe('applyUpdateTicket', () => {
  it('merges the patch into the ticket', () => {
    const next = applyUpdateTicket(makeSnapshot(), 't1', {
      title: 'Renamed',
      priority: 'highest',
    })
    expect(next.tickets.t1.title).toBe('Renamed')
    expect(next.tickets.t1.priority).toBe('highest')
    expect(next.tickets.t1.type).toBe('task')
  })

  it('ignores an id in the patch', () => {
    const next = applyUpdateTicket(makeSnapshot(), 't1', { id: 'hacked' } as never)
    expect(next.tickets.t1.id).toBe('t1')
    expect(next.tickets.hacked).toBeUndefined()
  })

  it('returns the snapshot unchanged for an unknown ticket', () => {
    const s = makeSnapshot()
    expect(applyUpdateTicket(s, 'nope', { title: 'x' })).toBe(s)
  })
})

describe('applyDeleteTicket', () => {
  it('removes the ticket from the map and its column', () => {
    const next = applyDeleteTicket(makeSnapshot(), 't1')
    expect(next.tickets.t1).toBeUndefined()
    expect(ids(next, 'todo')).toEqual(['t2'])
  })

  it('returns the snapshot unchanged for an unknown ticket', () => {
    const s = makeSnapshot()
    expect(applyDeleteTicket(s, 'nope')).toBe(s)
  })
})

describe('applyMoveTicket', () => {
  it('moves a ticket to another column at the given index', () => {
    const next = applyMoveTicket(makeSnapshot(), 't1', 'doing', 0)
    expect(ids(next, 'todo')).toEqual(['t2'])
    expect(ids(next, 'doing')).toEqual(['t1', 't3'])
  })

  it('reorders within the same column using remove-then-insert semantics', () => {
    const next = applyMoveTicket(makeSnapshot(), 't1', 'todo', 1)
    expect(ids(next, 'todo')).toEqual(['t2', 't1'])
  })

  it('clamps an index past the end', () => {
    const next = applyMoveTicket(makeSnapshot(), 't1', 'done', 99)
    expect(ids(next, 'done')).toEqual(['t1'])
  })

  it('clamps a negative index to the start', () => {
    const next = applyMoveTicket(makeSnapshot(), 't3', 'todo', -5)
    expect(ids(next, 'todo')).toEqual(['t3', 't1', 't2'])
  })

  it('returns the snapshot unchanged for an unknown ticket or column', () => {
    const s = makeSnapshot()
    expect(applyMoveTicket(s, 'nope', 'todo', 0)).toBe(s)
    expect(applyMoveTicket(s, 't1', 'nope', 0)).toBe(s)
  })

  it('does not mutate the input', () => {
    const s = makeSnapshot()
    applyMoveTicket(s, 't1', 'doing', 0)
    expect(ids(s, 'todo')).toEqual(['t1', 't2'])
    expect(ids(s, 'doing')).toEqual(['t3'])
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./boardOperations`.

- [ ] **Step 5: Create `src/domain/boardOperations.ts` with the ticket operations**

`applyMoveTicket` removes the id from every column before inserting. For a same-column move this yields `arrayMove` semantics, which is exactly what dnd-kit's sortable reports in `onDragEnd` — so Task 8 can pass dnd-kit's index straight through.

```ts
import type { BoardSnapshot, Ticket } from '../types/board'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function applyAddTicket(
  s: BoardSnapshot,
  ticket: Ticket,
  columnId: string,
): BoardSnapshot {
  if (!s.columns.some((c) => c.id === columnId)) return s
  return {
    ...s,
    tickets: { ...s.tickets, [ticket.id]: ticket },
    columns: s.columns.map((c) =>
      c.id === columnId ? { ...c, ticketIds: [...c.ticketIds, ticket.id] } : c,
    ),
  }
}

export function applyReplaceTicket(
  s: BoardSnapshot,
  tempId: string,
  saved: Ticket,
): BoardSnapshot {
  if (!s.tickets[tempId]) return s
  const { [tempId]: _dropped, ...rest } = s.tickets
  return {
    ...s,
    tickets: { ...rest, [saved.id]: saved },
    columns: s.columns.map((c) =>
      c.ticketIds.includes(tempId)
        ? { ...c, ticketIds: c.ticketIds.map((t) => (t === tempId ? saved.id : t)) }
        : c,
    ),
  }
}

export function applyUpdateTicket(
  s: BoardSnapshot,
  id: string,
  patch: Partial<Ticket>,
): BoardSnapshot {
  const existing = s.tickets[id]
  if (!existing) return s
  return {
    ...s,
    tickets: { ...s.tickets, [id]: { ...existing, ...patch, id: existing.id } },
  }
}

export function applyDeleteTicket(s: BoardSnapshot, id: string): BoardSnapshot {
  if (!s.tickets[id]) return s
  const { [id]: _dropped, ...rest } = s.tickets
  return {
    ...s,
    tickets: rest,
    columns: s.columns.map((c) =>
      c.ticketIds.includes(id)
        ? { ...c, ticketIds: c.ticketIds.filter((t) => t !== id) }
        : c,
    ),
  }
}

export function applyMoveTicket(
  s: BoardSnapshot,
  id: string,
  toColumnId: string,
  toIndex: number,
): BoardSnapshot {
  if (!s.tickets[id]) return s
  if (!s.columns.some((c) => c.id === toColumnId)) return s

  const stripped = s.columns.map((c) =>
    c.ticketIds.includes(id)
      ? { ...c, ticketIds: c.ticketIds.filter((t) => t !== id) }
      : c,
  )

  return {
    ...s,
    columns: stripped.map((c) => {
      if (c.id !== toColumnId) return c
      const next = [...c.ticketIds]
      next.splice(clamp(toIndex, 0, next.length), 0, id)
      return { ...c, ticketIds: next }
    }),
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all ticket operation tests green.

- [ ] **Step 7: Create `src/domain/factories.ts`**

`key` is intentionally empty: the API layer assigns it, and `TicketCard` renders a placeholder until the create resolves.

```ts
import type { Ticket, TicketInput } from '../types/board'
import { newId } from '../lib/ids'

/** Builds the optimistic ticket shown before the API responds. */
export function buildTicket(input: TicketInput): Ticket {
  const now = new Date().toISOString()
  const { columnId: _columnId, ...fields } = input
  return {
    ...fields,
    id: newId(),
    key: '',
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add pure ticket operations over BoardSnapshot"
```

---

### Task 3: Pure column operations

**Files:**
- Modify: `src/domain/boardOperations.ts` (append), `src/domain/factories.ts` (append)
- Test: `src/domain/boardOperations.column.test.ts`

**Interfaces:**
- Consumes: `BoardSnapshot`, `Column`, `Disposition`; `newId` from `src/lib/ids.ts`
- Produces:
  - `buildColumn(name: string): Column` from `src/domain/factories.ts`
  - From `src/domain/boardOperations.ts`:
    - `applyAddColumn(s: BoardSnapshot, column: Column): BoardSnapshot`
    - `applyReplaceColumn(s: BoardSnapshot, tempId: string, saved: Column): BoardSnapshot`
    - `applyRenameColumn(s: BoardSnapshot, id: string, name: string): BoardSnapshot`
    - `applyDeleteColumn(s: BoardSnapshot, id: string, disposition: Disposition): BoardSnapshot`
    - `applyReorderColumn(s: BoardSnapshot, id: string, toIndex: number): BoardSnapshot`

- [ ] **Step 1: Write the failing tests**

`src/domain/boardOperations.column.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { makeSnapshot } from './testFixtures'
import {
  applyAddColumn,
  applyDeleteColumn,
  applyRenameColumn,
  applyReorderColumn,
  applyReplaceColumn,
} from './boardOperations'

const names = (s: ReturnType<typeof makeSnapshot>) => s.columns.map((c) => c.id)

describe('applyAddColumn', () => {
  it('appends the column', () => {
    const next = applyAddColumn(makeSnapshot(), {
      id: 'c9',
      name: 'Review',
      ticketIds: [],
    })
    expect(names(next)).toEqual(['todo', 'doing', 'done', 'c9'])
  })

  it('does not mutate the input', () => {
    const s = makeSnapshot()
    applyAddColumn(s, { id: 'c9', name: 'Review', ticketIds: [] })
    expect(names(s)).toEqual(['todo', 'doing', 'done'])
  })
})

describe('applyReplaceColumn', () => {
  it('swaps the temp id while keeping tickets added meanwhile', () => {
    const withTemp = applyAddColumn(makeSnapshot(), {
      id: 'tmp',
      name: 'Review',
      ticketIds: ['t1'],
    })
    const next = applyReplaceColumn(withTemp, 'tmp', {
      id: 'real',
      name: 'Review',
      ticketIds: [],
    })
    const col = next.columns.find((c) => c.id === 'real')!
    expect(col.ticketIds).toEqual(['t1'])
    expect(names(next)).toEqual(['todo', 'doing', 'done', 'real'])
  })

  it('returns the snapshot unchanged for an unknown temp id', () => {
    const s = makeSnapshot()
    expect(applyReplaceColumn(s, 'nope', { id: 'r', name: 'R', ticketIds: [] })).toBe(s)
  })
})

describe('applyRenameColumn', () => {
  it('renames the column', () => {
    const next = applyRenameColumn(makeSnapshot(), 'todo', 'Backlog')
    expect(next.columns[0].name).toBe('Backlog')
  })

  it('returns the snapshot unchanged for an unknown column', () => {
    const s = makeSnapshot()
    expect(applyRenameColumn(s, 'nope', 'x')).toBe(s)
  })
})

describe('applyDeleteColumn', () => {
  it('moves tickets to the target column when disposition is move', () => {
    const next = applyDeleteColumn(makeSnapshot(), 'todo', {
      kind: 'move',
      toColumnId: 'doing',
    })
    expect(names(next)).toEqual(['doing', 'done'])
    expect(next.columns[0].ticketIds).toEqual(['t3', 't1', 't2'])
    expect(next.tickets.t1).toBeDefined()
  })

  it('deletes the column tickets when disposition is delete', () => {
    const next = applyDeleteColumn(makeSnapshot(), 'todo', { kind: 'delete' })
    expect(names(next)).toEqual(['doing', 'done'])
    expect(next.tickets.t1).toBeUndefined()
    expect(next.tickets.t2).toBeUndefined()
    expect(next.tickets.t3).toBeDefined()
  })

  it('refuses to delete the last remaining column', () => {
    let s = applyDeleteColumn(makeSnapshot(), 'doing', { kind: 'delete' })
    s = applyDeleteColumn(s, 'done', { kind: 'delete' })
    expect(names(s)).toEqual(['todo'])
    expect(applyDeleteColumn(s, 'todo', { kind: 'delete' })).toBe(s)
  })

  it('returns the snapshot unchanged for an unknown column or move target', () => {
    const s = makeSnapshot()
    expect(applyDeleteColumn(s, 'nope', { kind: 'delete' })).toBe(s)
    expect(applyDeleteColumn(s, 'todo', { kind: 'move', toColumnId: 'nope' })).toBe(s)
  })

  it('returns the snapshot unchanged when moving a column into itself', () => {
    const s = makeSnapshot()
    expect(applyDeleteColumn(s, 'todo', { kind: 'move', toColumnId: 'todo' })).toBe(s)
  })
})

describe('applyReorderColumn', () => {
  it('moves a column to the given index', () => {
    const next = applyReorderColumn(makeSnapshot(), 'done', 0)
    expect(names(next)).toEqual(['done', 'todo', 'doing'])
  })

  it('clamps an index past the end', () => {
    const next = applyReorderColumn(makeSnapshot(), 'todo', 99)
    expect(names(next)).toEqual(['doing', 'done', 'todo'])
  })

  it('returns the snapshot unchanged for an unknown column', () => {
    const s = makeSnapshot()
    expect(applyReorderColumn(s, 'nope', 0)).toBe(s)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — the five column exports do not exist.

- [ ] **Step 3: Append the column operations to `src/domain/boardOperations.ts`**

Add `Column` and `Disposition` to the existing type import at the top of the file, then append:

```ts
export function applyAddColumn(s: BoardSnapshot, column: Column): BoardSnapshot {
  return { ...s, columns: [...s.columns, column] }
}

export function applyReplaceColumn(
  s: BoardSnapshot,
  tempId: string,
  saved: Column,
): BoardSnapshot {
  if (!s.columns.some((c) => c.id === tempId)) return s
  return {
    ...s,
    columns: s.columns.map((c) =>
      c.id === tempId ? { ...saved, ticketIds: c.ticketIds } : c,
    ),
  }
}

export function applyRenameColumn(
  s: BoardSnapshot,
  id: string,
  name: string,
): BoardSnapshot {
  if (!s.columns.some((c) => c.id === id)) return s
  return {
    ...s,
    columns: s.columns.map((c) => (c.id === id ? { ...c, name } : c)),
  }
}

export function applyDeleteColumn(
  s: BoardSnapshot,
  id: string,
  disposition: Disposition,
): BoardSnapshot {
  const column = s.columns.find((c) => c.id === id)
  if (!column) return s
  if (s.columns.length <= 1) return s

  if (disposition.kind === 'move') {
    const target = disposition.toColumnId
    if (target === id || !s.columns.some((c) => c.id === target)) return s
    return {
      ...s,
      columns: s.columns
        .filter((c) => c.id !== id)
        .map((c) =>
          c.id === target
            ? { ...c, ticketIds: [...c.ticketIds, ...column.ticketIds] }
            : c,
        ),
    }
  }

  const tickets = { ...s.tickets }
  for (const ticketId of column.ticketIds) delete tickets[ticketId]
  return { ...s, tickets, columns: s.columns.filter((c) => c.id !== id) }
}

export function applyReorderColumn(
  s: BoardSnapshot,
  id: string,
  toIndex: number,
): BoardSnapshot {
  const from = s.columns.findIndex((c) => c.id === id)
  if (from === -1) return s
  const next = [...s.columns]
  const [moved] = next.splice(from, 1)
  next.splice(clamp(toIndex, 0, next.length), 0, moved)
  return { ...s, columns: next }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all domain tests green.

- [ ] **Step 5: Append `buildColumn` to `src/domain/factories.ts`**

```ts
import type { Column } from '../types/board'

export function buildColumn(name: string): Column {
  return { id: newId(), name, ticketIds: [] }
}
```

Merge the `Column` import into the existing type import rather than adding a second line.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add pure column operations over BoardSnapshot"
```

---

### Task 4: BoardApi interface and localStorage implementation

**Files:**
- Create: `src/api/BoardApi.ts`, `src/api/seedData.ts`, `src/api/LocalStorageBoardApi.ts`, `src/api/index.ts`
- Test: `src/api/LocalStorageBoardApi.test.ts`

**Interfaces:**
- Consumes: all domain `apply*` functions, `BoardSnapshot`, `Ticket`, `Column`, `TicketInput`, `Disposition`, `newId`
- Produces:
  - `interface BoardApi` from `src/api/BoardApi.ts` — nine methods plus the optional readonly fields `storageMode` and `wasReset`
  - `class LocalStorageBoardApi implements BoardApi`, which sets `storageMode: 'persistent' | 'memory'` and `wasReset: boolean` concretely
  - `createSeed(): { board: BoardSnapshot; ticketCounter: number }` from `src/api/seedData.ts`
  - `createBoardApi(): BoardApi` from `src/api/index.ts` — **the swap point for the future backend**
  - Exported consts `STORAGE_KEY = 'orca.board.v1'` and `SCHEMA_VERSION = 1`

- [ ] **Step 1: Create `src/api/BoardApi.ts`**

```ts
import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'

/**
 * Operation-shaped and async, mirroring the HTTP calls that will replace it.
 * Deliberately not load()/save() over a blob — no backend persists a whole
 * board on every edit.
 */
export interface BoardApi {
  /**
   * Whether edits survive a reload. An HTTP implementation leaves this
   * undefined, which the store reads as 'persistent'. Declared here so the
   * store never has to know which implementation it holds.
   */
  readonly storageMode?: 'persistent' | 'memory'
  /** True when unreadable saved data was discarded on construction. */
  readonly wasReset?: boolean

  getBoard(): Promise<BoardSnapshot>
  createTicket(input: TicketInput): Promise<Ticket>
  updateTicket(id: string, patch: Partial<Ticket>): Promise<Ticket>
  deleteTicket(id: string): Promise<void>
  moveTicket(id: string, toColumnId: string, toIndex: number): Promise<void>
  createColumn(name: string): Promise<Column>
  renameColumn(id: string, name: string): Promise<Column>
  deleteColumn(id: string, disposition: Disposition): Promise<void>
  reorderColumn(id: string, toIndex: number): Promise<void>
}
```

- [ ] **Step 2: Create `src/api/seedData.ts`**

An empty first screen teaches nothing about what the board does. Deleted when the backend lands.

```ts
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
```

- [ ] **Step 3: Write the failing tests**

`src/api/LocalStorageBoardApi.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageBoardApi, SCHEMA_VERSION, STORAGE_KEY } from './LocalStorageBoardApi'
import type { TicketInput } from '../types/board'

const input = (over: Partial<TicketInput> = {}): TicketInput => ({
  columnId: 'col-todo',
  title: 'New ticket',
  description: '',
  type: 'task',
  priority: 'medium',
  assigneeId: null,
  labels: [],
  storyPoints: null,
  ...over,
})

beforeEach(() => localStorage.clear())

describe('first run', () => {
  it('seeds a board and persists it', async () => {
    const api = new LocalStorageBoardApi()
    const board = await api.getBoard()
    expect(board.columns.map((c) => c.name)).toEqual(['To Do', 'In Progress', 'Done'])
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(api.storageMode).toBe('persistent')
    expect(api.wasReset).toBe(false)
  })
})

describe('persistence', () => {
  it('round-trips changes across instances', async () => {
    const first = new LocalStorageBoardApi()
    await first.getBoard()
    const created = await first.createTicket(input({ title: 'Persisted' }))

    const second = new LocalStorageBoardApi()
    const board = await second.getBoard()
    expect(board.tickets[created.id].title).toBe('Persisted')
  })

  it('assigns sequential keys continuing past the seed', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    const a = await api.createTicket(input())
    const b = await api.createTicket(input())
    expect(a.key).toBe('ORC-6')
    expect(b.key).toBe('ORC-7')
  })

  it('keeps the counter across instances', async () => {
    const first = new LocalStorageBoardApi()
    await first.getBoard()
    await first.createTicket(input())

    const second = new LocalStorageBoardApi()
    await second.getBoard()
    expect((await second.createTicket(input())).key).toBe('ORC-7')
  })
})

describe('recovery', () => {
  it('resets to seed on corrupt JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{ not json')
    const api = new LocalStorageBoardApi()
    const board = await api.getBoard()
    expect(board.columns).toHaveLength(3)
    expect(api.wasReset).toBe(true)
  })

  it('resets to seed on a schema version mismatch', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, ticketCounter: 0, board: {} }),
    )
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    expect(api.wasReset).toBe(true)
  })

  it('falls back to memory mode when storage throws', async () => {
    const api = new LocalStorageBoardApi({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    } as unknown as Storage)
    const board = await api.getBoard()
    expect(board.columns).toHaveLength(3)
    expect(api.storageMode).toBe('memory')
  })
})

describe('operations', () => {
  it('creates a ticket into the requested column', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    const created = await api.createTicket(input({ columnId: 'col-doing' }))
    const board = await api.getBoard()
    expect(board.columns.find((c) => c.id === 'col-doing')!.ticketIds).toContain(created.id)
  })

  it('updates, moves and deletes', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()

    const updated = await api.updateTicket('seed-1', { title: 'Renamed' })
    expect(updated.title).toBe('Renamed')

    await api.moveTicket('seed-1', 'col-done', 0)
    let board = await api.getBoard()
    expect(board.columns.find((c) => c.id === 'col-done')!.ticketIds[0]).toBe('seed-1')

    await api.deleteTicket('seed-1')
    board = await api.getBoard()
    expect(board.tickets['seed-1']).toBeUndefined()
  })

  it('creates, renames, reorders and deletes columns', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()

    const created = await api.createColumn('Review')
    expect(created.name).toBe('Review')

    await api.renameColumn(created.id, 'In Review')
    await api.reorderColumn(created.id, 0)
    let board = await api.getBoard()
    expect(board.columns[0].name).toBe('In Review')

    await api.deleteColumn(created.id, { kind: 'move', toColumnId: 'col-todo' })
    board = await api.getBoard()
    expect(board.columns.map((c) => c.id)).not.toContain(created.id)
  })

  it('rejects an update to an unknown ticket', async () => {
    const api = new LocalStorageBoardApi()
    await api.getBoard()
    await expect(api.updateTicket('nope', { title: 'x' })).rejects.toThrow()
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./LocalStorageBoardApi`.

- [ ] **Step 5: Create `src/api/LocalStorageBoardApi.ts`**

Reads and writes a single JSON blob internally. Nothing above the `BoardApi` interface knows that. It owns `ticketCounter`, because a server would.

```ts
import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'
import type { BoardApi } from './BoardApi'
import { createSeed } from './seedData'
import { buildColumn, buildTicket } from '../domain/factories'
import {
  applyAddColumn,
  applyAddTicket,
  applyDeleteColumn,
  applyDeleteTicket,
  applyMoveTicket,
  applyRenameColumn,
  applyReorderColumn,
  applyUpdateTicket,
} from '../domain/boardOperations'

export const STORAGE_KEY = 'orca.board.v1'
export const SCHEMA_VERSION = 1

type Persisted = {
  schemaVersion: number
  ticketCounter: number
  board: BoardSnapshot
}

function isValid(value: unknown): value is Persisted {
  const p = value as Persisted
  return (
    !!p &&
    p.schemaVersion === SCHEMA_VERSION &&
    typeof p.ticketCounter === 'number' &&
    !!p.board &&
    Array.isArray(p.board.columns) &&
    p.board.columns.length > 0 &&
    !!p.board.tickets
  )
}

export class LocalStorageBoardApi implements BoardApi {
  storageMode: 'persistent' | 'memory' = 'persistent'
  wasReset = false

  private state: Persisted
  private storage: Storage | null

  constructor(storage: Storage | null = globalThis.localStorage ?? null) {
    this.storage = storage
    this.state = this.read()
    this.write()
  }

  private read(): Persisted {
    if (!this.storage) {
      this.storageMode = 'memory'
      return this.seed()
    }
    let raw: string | null = null
    try {
      raw = this.storage.getItem(STORAGE_KEY)
    } catch {
      this.storageMode = 'memory'
      return this.seed()
    }
    if (raw === null) return this.seed()
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isValid(parsed)) {
        this.wasReset = true
        return this.seed()
      }
      return parsed
    } catch {
      this.wasReset = true
      return this.seed()
    }
  }

  private seed(): Persisted {
    const { board, ticketCounter } = createSeed()
    return { schemaVersion: SCHEMA_VERSION, ticketCounter, board }
  }

  private write(): void {
    if (!this.storage || this.storageMode === 'memory') return
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      this.storageMode = 'memory'
    }
  }

  private commit(board: BoardSnapshot): void {
    this.state = { ...this.state, board }
    this.write()
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
  }

  async getBoard(): Promise<BoardSnapshot> {
    return this.clone(this.state.board)
  }

  async createTicket(input: TicketInput): Promise<Ticket> {
    const counter = this.state.ticketCounter + 1
    const ticket: Ticket = { ...buildTicket(input), key: `ORC-${counter}` }
    const board = applyAddTicket(this.state.board, ticket, input.columnId)
    if (board === this.state.board) throw new Error(`Unknown column: ${input.columnId}`)
    this.state = { ...this.state, ticketCounter: counter }
    this.commit(board)
    return this.clone(ticket)
  }

  async updateTicket(id: string, patch: Partial<Ticket>): Promise<Ticket> {
    const board = applyUpdateTicket(this.state.board, id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    })
    if (board === this.state.board) throw new Error(`Unknown ticket: ${id}`)
    this.commit(board)
    return this.clone(board.tickets[id])
  }

  async deleteTicket(id: string): Promise<void> {
    const board = applyDeleteTicket(this.state.board, id)
    if (board === this.state.board) throw new Error(`Unknown ticket: ${id}`)
    this.commit(board)
  }

  async moveTicket(id: string, toColumnId: string, toIndex: number): Promise<void> {
    const board = applyMoveTicket(this.state.board, id, toColumnId, toIndex)
    if (board === this.state.board) throw new Error(`Cannot move ${id} to ${toColumnId}`)
    this.commit(board)
  }

  async createColumn(name: string): Promise<Column> {
    const column = buildColumn(name)
    this.commit(applyAddColumn(this.state.board, column))
    return this.clone(column)
  }

  async renameColumn(id: string, name: string): Promise<Column> {
    const board = applyRenameColumn(this.state.board, id, name)
    if (board === this.state.board) throw new Error(`Unknown column: ${id}`)
    this.commit(board)
    return this.clone(board.columns.find((c) => c.id === id)!)
  }

  async deleteColumn(id: string, disposition: Disposition): Promise<void> {
    const board = applyDeleteColumn(this.state.board, id, disposition)
    if (board === this.state.board) throw new Error(`Cannot delete column: ${id}`)
    this.commit(board)
  }

  async reorderColumn(id: string, toIndex: number): Promise<void> {
    const board = applyReorderColumn(this.state.board, id, toIndex)
    if (board === this.state.board) throw new Error(`Unknown column: ${id}`)
    this.commit(board)
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all API tests green.

- [ ] **Step 7: Create `src/api/index.ts`**

```ts
import type { BoardApi } from './BoardApi'
import { LocalStorageBoardApi } from './LocalStorageBoardApi'

/**
 * The swap point for the backend phase: return an HttpBoardApi here and
 * delete seedData.ts. Nothing above this line changes.
 */
export function createBoardApi(): BoardApi {
  return new LocalStorageBoardApi()
}

export type { BoardApi }
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add async BoardApi seam with localStorage implementation"
```

---

### Task 5: Zustand store with optimistic updates

**Files:**
- Create: `src/store/boardStore.ts`
- Test: `src/store/boardStore.test.ts`

**Interfaces:**
- Consumes: `BoardApi`, all domain `apply*` functions, `buildTicket`, `buildColumn`
- Produces:
  - `createBoardStore(api: BoardApi)` returning a Zustand store hook
  - `useBoardStore` — the app-wide instance, built from `createBoardApi()`
  - `BoardStore` type with: `board`, `status`, `storageMode`, `error`, and actions `load`, `addTicket`, `updateTicket`, `deleteTicket`, `moveTicket`, `addColumn`, `renameColumn`, `deleteColumn`, `reorderColumn`, `dismissError`

- [ ] **Step 1: Write the failing tests**

A fake API makes rollback testable without touching localStorage.

`src/store/boardStore.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBoardStore } from './boardStore'
import { LocalStorageBoardApi } from '../api/LocalStorageBoardApi'
import type { BoardApi } from '../api/BoardApi'

function failingApi(method: keyof BoardApi): BoardApi {
  const real = new LocalStorageBoardApi(null)
  const proxy = Object.create(real) as BoardApi
  // @ts-expect-error — deliberately replacing one method with a rejector
  proxy[method] = () => Promise.reject(new Error('boom'))
  return proxy
}

async function readyStore(api: BoardApi = new LocalStorageBoardApi(null)) {
  const useStore = createBoardStore(api)
  await useStore.getState().load()
  return useStore
}

describe('load', () => {
  it('moves from loading to ready and exposes the board', async () => {
    const useStore = await readyStore()
    expect(useStore.getState().status).toBe('ready')
    expect(useStore.getState().board!.columns).toHaveLength(3)
  })

  it('reports memory storage mode when persistence is unavailable', async () => {
    const useStore = await readyStore(new LocalStorageBoardApi(null))
    expect(useStore.getState().storageMode).toBe('memory')
  })

  it('sets status error when the API rejects', async () => {
    const useStore = createBoardStore(failingApi('getBoard'))
    await useStore.getState().load()
    expect(useStore.getState().status).toBe('error')
  })
})

describe('addTicket', () => {
  it('commits the API-assigned id and key', async () => {
    const useStore = await readyStore()
    await useStore.getState().addTicket({
      columnId: 'col-todo',
      title: 'Fresh',
      description: '',
      type: 'task',
      priority: 'medium',
      assigneeId: null,
      labels: [],
      storyPoints: null,
    })

    const board = useStore.getState().board!
    const todo = board.columns.find((c) => c.id === 'col-todo')!
    const added = board.tickets[todo.ticketIds.at(-1)!]
    expect(added.title).toBe('Fresh')
    expect(added.key).toBe('ORC-6')
    expect(useStore.getState().error).toBeNull()
  })

  it('rolls back and surfaces an error when the API rejects', async () => {
    const useStore = await readyStore(failingApi('createTicket'))
    const before = useStore.getState().board!

    await useStore.getState().addTicket({
      columnId: 'col-todo',
      title: 'Doomed',
      description: '',
      type: 'task',
      priority: 'medium',
      assigneeId: null,
      labels: [],
      storyPoints: null,
    })

    expect(useStore.getState().board).toEqual(before)
    expect(useStore.getState().error).not.toBeNull()
  })
})

describe('moveTicket', () => {
  it('applies the move optimistically and keeps it on success', async () => {
    const useStore = await readyStore()
    await useStore.getState().moveTicket('seed-1', 'col-done', 0)
    const done = useStore.getState().board!.columns.find((c) => c.id === 'col-done')!
    expect(done.ticketIds[0]).toBe('seed-1')
  })

  it('rolls back a failed move exactly', async () => {
    const useStore = await readyStore(failingApi('moveTicket'))
    const before = useStore.getState().board!
    await useStore.getState().moveTicket('seed-1', 'col-done', 0)
    expect(useStore.getState().board).toEqual(before)
  })
})

describe('column actions', () => {
  it('adds a column and commits the real id', async () => {
    const useStore = await readyStore()
    await useStore.getState().addColumn('Review')
    const columns = useStore.getState().board!.columns
    expect(columns.at(-1)!.name).toBe('Review')
    expect(columns).toHaveLength(4)
  })

  it('rolls back a failed delete', async () => {
    const useStore = await readyStore(failingApi('deleteColumn'))
    const before = useStore.getState().board!
    await useStore.getState().deleteColumn('col-todo', { kind: 'delete' })
    expect(useStore.getState().board).toEqual(before)
  })
})

describe('dismissError', () => {
  it('clears the error', async () => {
    const useStore = await readyStore(failingApi('deleteTicket'))
    await useStore.getState().deleteTicket('seed-1')
    expect(useStore.getState().error).not.toBeNull()
    useStore.getState().dismissError()
    expect(useStore.getState().error).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./boardStore`.

- [ ] **Step 3: Create `src/store/boardStore.ts`**

`runOptimistic` snapshots the board, applies the pure operation, awaits the API, then commits or restores. Snapshot-rollback rather than per-action inverses — inverting `moveTicket` correctly is fiddly, and one helper covers all eight actions.

```ts
import { create } from 'zustand'
import type {
  BoardSnapshot,
  Column,
  Disposition,
  Ticket,
  TicketInput,
} from '../types/board'
import type { BoardApi } from '../api/BoardApi'
import { createBoardApi } from '../api'
import { buildColumn, buildTicket } from '../domain/factories'
import {
  applyAddColumn,
  applyAddTicket,
  applyDeleteColumn,
  applyDeleteTicket,
  applyMoveTicket,
  applyRenameColumn,
  applyReorderColumn,
  applyReplaceColumn,
  applyReplaceTicket,
  applyUpdateTicket,
} from '../domain/boardOperations'

export type BoardStore = {
  board: BoardSnapshot | null
  status: 'loading' | 'ready' | 'error'
  storageMode: 'persistent' | 'memory'
  error: string | null

  load(): Promise<void>
  addTicket(input: TicketInput): Promise<void>
  updateTicket(id: string, patch: Partial<Ticket>): Promise<void>
  deleteTicket(id: string): Promise<void>
  moveTicket(id: string, toColumnId: string, toIndex: number): Promise<void>
  addColumn(name: string): Promise<void>
  renameColumn(id: string, name: string): Promise<void>
  deleteColumn(id: string, disposition: Disposition): Promise<void>
  reorderColumn(id: string, toIndex: number): Promise<void>
  dismissError(): void
}

export function createBoardStore(api: BoardApi) {
  return create<BoardStore>((set, get) => {
    /**
     * Apply optimistically, await the API, then commit or restore the
     * pre-action snapshot. `fallbackMessage` is what the user sees on failure.
     */
    async function runOptimistic(
      apply: (s: BoardSnapshot) => BoardSnapshot,
      call: () => Promise<unknown>,
      fallbackMessage: string,
      commit?: (s: BoardSnapshot, result: never) => BoardSnapshot,
    ): Promise<void> {
      const snapshot = get().board
      if (!snapshot) return
      set({ board: apply(snapshot), error: null })
      try {
        const result = await call()
        if (commit) {
          set((s) => ({ board: commit(s.board!, result as never) }))
        }
      } catch {
        set({ board: snapshot, error: fallbackMessage })
      }
    }

    return {
      board: null,
      status: 'loading',
      storageMode: 'persistent',
      error: null,

      async load() {
        set({ status: 'loading' })
        try {
          const board = await api.getBoard()
          set({
            board,
            status: 'ready',
            storageMode: api.storageMode ?? 'persistent',
            error: api.wasReset
              ? 'Saved board was unreadable — started a fresh one.'
              : null,
          })
        } catch {
          set({ status: 'error', error: 'Could not load the board.' })
        }
      },

      async addTicket(input) {
        const optimistic = buildTicket(input)
        await runOptimistic(
          (s) => applyAddTicket(s, optimistic, input.columnId),
          () => api.createTicket(input),
          'Could not create the ticket.',
          (s, saved: Ticket) => applyReplaceTicket(s, optimistic.id, saved),
        )
      },

      async updateTicket(id, patch) {
        await runOptimistic(
          (s) => applyUpdateTicket(s, id, patch),
          () => api.updateTicket(id, patch),
          'Could not save your changes.',
        )
      },

      async deleteTicket(id) {
        await runOptimistic(
          (s) => applyDeleteTicket(s, id),
          () => api.deleteTicket(id),
          'Could not delete the ticket.',
        )
      },

      async moveTicket(id, toColumnId, toIndex) {
        await runOptimistic(
          (s) => applyMoveTicket(s, id, toColumnId, toIndex),
          () => api.moveTicket(id, toColumnId, toIndex),
          'Could not move the ticket.',
        )
      },

      async addColumn(name) {
        const optimistic = buildColumn(name)
        await runOptimistic(
          (s) => applyAddColumn(s, optimistic),
          () => api.createColumn(name),
          'Could not create the column.',
          (s, saved: Column) => applyReplaceColumn(s, optimistic.id, saved),
        )
      },

      async renameColumn(id, name) {
        await runOptimistic(
          (s) => applyRenameColumn(s, id, name),
          () => api.renameColumn(id, name),
          'Could not rename the column.',
        )
      },

      async deleteColumn(id, disposition) {
        await runOptimistic(
          (s) => applyDeleteColumn(s, id, disposition),
          () => api.deleteColumn(id, disposition),
          'Could not delete the column.',
        )
      },

      async reorderColumn(id, toIndex) {
        await runOptimistic(
          (s) => applyReorderColumn(s, id, toIndex),
          () => api.reorderColumn(id, toIndex),
          'Could not reorder the columns.',
        )
      },

      dismissError() {
        set({ error: null })
      },
    }
  })
}

export const useBoardStore = createBoardStore(createBoardApi())
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all store tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Zustand board store with optimistic updates and rollback"
```

---

### Task 6: UI primitives

Small presentational pieces with no store access. Built before the board so Tasks 7–10 can compose them.

**Files:**
- Create: `src/components/ui/TypeIcon.tsx`, `PriorityIcon.tsx`, `Avatar.tsx`, `LabelChip.tsx`, `Modal.tsx`, `Toast.tsx`, `Banner.tsx`
- Test: `src/components/ui/primitives.test.tsx`

**Interfaces:**
- Consumes: `TicketType`, `Priority`, `Member`
- Produces:
  - `<TypeIcon type={TicketType} />`, `<PriorityIcon priority={Priority} />`
  - `<Avatar member={Member | null} />`, `<LabelChip label={string} onRemove?={() => void} />`
  - `<Modal open labelledBy onClose>{children}</Modal>`
  - `<Toast message={string | null} onDismiss={() => void} />`
  - `<Banner message={string} onDismiss={() => void} />`

- [ ] **Step 1: Write the failing tests**

`src/components/ui/primitives.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TypeIcon } from './TypeIcon'
import { PriorityIcon } from './PriorityIcon'
import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { Toast } from './Toast'

describe('TypeIcon', () => {
  it('labels the type as text, not colour alone', () => {
    render(<TypeIcon type="bug" />)
    expect(screen.getByLabelText('Type: bug')).toBeInTheDocument()
  })
})

describe('PriorityIcon', () => {
  it('labels the priority as text', () => {
    render(<PriorityIcon priority="highest" />)
    expect(screen.getByLabelText('Priority: highest')).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('shows initials for a member', () => {
    render(
      <Avatar member={{ id: 'm1', name: 'Mattias B', initials: 'MB', color: 'bg-violet-500' }} />,
    )
    expect(screen.getByTitle('Mattias B')).toHaveTextContent('MB')
  })

  it('shows an unassigned placeholder for null', () => {
    render(<Avatar member={null} />)
    expect(screen.getByTitle('Unassigned')).toBeInTheDocument()
  })
})

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} labelledBy="t" onClose={() => {}}>
        <h2 id="t">Hidden</h2>
      </Modal>,
    )
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open labelledBy="t" onClose={onClose}>
        <h2 id="t">Shown</h2>
      </Modal>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on a backdrop click but not a content click', async () => {
    const onClose = vi.fn()
    render(
      <Modal open labelledBy="t" onClose={onClose}>
        <h2 id="t">Shown</h2>
      </Modal>,
    )
    await userEvent.click(screen.getByText('Shown'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('Toast', () => {
  it('renders an alert and dismisses', async () => {
    const onDismiss = vi.fn()
    render(<Toast message="Something failed" onDismiss={onDismiss} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something failed')
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('renders nothing for a null message', () => {
    render(<Toast message={null} onDismiss={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — none of the primitive modules resolve.

- [ ] **Step 3: Create the icon, avatar and chip primitives**

`src/components/ui/TypeIcon.tsx`:

```tsx
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
```

`src/components/ui/PriorityIcon.tsx`:

```tsx
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
```

`src/components/ui/Avatar.tsx`:

```tsx
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
```

`src/components/ui/LabelChip.tsx`:

```tsx
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
```

- [ ] **Step 4: Create `src/components/ui/Modal.tsx`**

Portal-rendered, focus-trapped, Escape and backdrop both close, focus restored on close.

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  labelledBy,
  onClose,
  children,
}: {
  open: boolean
  labelledBy: string
  onClose: () => void
  children: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      data-testid="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-8"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
```

- [ ] **Step 5: Create `Toast.tsx` and `Banner.tsx`**

`src/components/ui/Toast.tsx` — auto-dismisses after 5s:

```tsx
import { useEffect } from 'react'

export function Toast({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md bg-slate-800 px-4 py-2 text-sm text-white shadow-lg"
    >
      {message}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-slate-300 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
```

`src/components/ui/Banner.tsx`:

```tsx
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all primitive tests green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add UI primitives — icons, avatar, modal, toast, banner"
```

---

### Task 7: Static board rendering

Renders the board from the store. No drag-and-drop yet — Task 8 adds it.

**Files:**
- Create: `src/components/board/TicketCard.tsx`, `Column.tsx`, `Board.tsx`, `BoardHeader.tsx`, `BoardScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/board/BoardScreen.test.tsx`

**Interfaces:**
- Consumes: `useBoardStore`, all UI primitives
- Produces:
  - `<TicketCard ticket={Ticket} member={Member | null} onOpen={() => void} />`
  - `<Column column={Column} tickets={Ticket[]} members={Member[]} onOpenTicket={(id: string) => void} />`
  - `<Board onOpenTicket={(id: string) => void} />`
  - `<BoardHeader />`
  - `<BoardScreen />` — the root, mounted by `App`

- [ ] **Step 1: Write the failing test**

`src/components/board/BoardScreen.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardScreen } from './BoardScreen'

beforeEach(() => localStorage.clear())

describe('BoardScreen', () => {
  it('renders the seeded columns once loaded', async () => {
    render(<BoardScreen />)
    expect(await screen.findByRole('heading', { name: /to do/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /in progress/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /done/i })).toBeInTheDocument()
  })

  it('renders seeded tickets with their keys', async () => {
    render(<BoardScreen />)
    expect(await screen.findByText('Set up project repository')).toBeInTheDocument()
    expect(screen.getByText('ORC-1')).toBeInTheDocument()
  })

  it('shows a per-column ticket count', async () => {
    render(<BoardScreen />)
    const todo = await screen.findByTestId('column-col-todo')
    expect(todo).toHaveTextContent('2')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./BoardScreen`.

- [ ] **Step 3: Create `src/components/board/TicketCard.tsx`**

An in-flight ticket has an empty `key`; render a placeholder rather than blank.

```tsx
import type { Member, Ticket } from '../../types/board'
import { TypeIcon } from '../ui/TypeIcon'
import { PriorityIcon } from '../ui/PriorityIcon'
import { Avatar } from '../ui/Avatar'
import { LabelChip } from '../ui/LabelChip'

export function TicketCard({
  ticket,
  member,
  onOpen,
}: {
  ticket: Ticket
  member: Member | null
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`ticket-${ticket.id}`}
      className="w-full rounded border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      <p className="text-sm text-slate-800">{ticket.title}</p>

      {ticket.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {ticket.labels.map((label) => (
            <LabelChip key={label} label={label} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <TypeIcon type={ticket.type} />
        <PriorityIcon priority={ticket.priority} />
        <span className="font-mono text-[11px] text-slate-500">
          {ticket.key || '…'}
        </span>
        {ticket.storyPoints !== null && (
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] text-slate-600">
            {ticket.storyPoints}
          </span>
        )}
        <span className="ml-auto">
          <Avatar member={member} />
        </span>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Create `src/components/board/Column.tsx`**

```tsx
import type { Column as ColumnModel, Member, Ticket } from '../../types/board'
import { TicketCard } from './TicketCard'

export function Column({
  column,
  tickets,
  members,
  onOpenTicket,
}: {
  column: ColumnModel
  tickets: Ticket[]
  members: Member[]
  onOpenTicket: (id: string) => void
}) {
  return (
    <section
      data-testid={`column-${column.id}`}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-slate-100 p-2"
    >
      <header className="flex items-center gap-2 px-1 py-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {column.name}
        </h2>
        <span className="rounded-full bg-slate-200 px-1.5 text-[11px] text-slate-600">
          {tickets.length}
        </span>
      </header>

      <div className="flex flex-col gap-2">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            member={members.find((m) => m.id === ticket.assigneeId) ?? null}
            onOpen={() => onOpenTicket(ticket.id)}
          />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Create `Board.tsx`, `BoardHeader.tsx` and `BoardScreen.tsx`**

`src/components/board/Board.tsx`:

```tsx
import { useBoardStore } from '../../store/boardStore'
import { Column } from './Column'

export function Board({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const board = useBoardStore((s) => s.board)
  if (!board) return null

  return (
    <div className="flex flex-1 gap-3 overflow-x-auto p-4">
      {board.columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          tickets={column.ticketIds.map((id) => board.tickets[id]).filter(Boolean)}
          members={board.members}
          onOpenTicket={onOpenTicket}
        />
      ))}
    </div>
  )
}
```

`src/components/board/BoardHeader.tsx`:

```tsx
import { useBoardStore } from '../../store/boardStore'

export function BoardHeader() {
  const board = useBoardStore((s) => s.board)
  if (!board) return null
  const count = Object.keys(board.tickets).length

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <h1 className="text-base font-semibold text-slate-800">{board.boardName}</h1>
      <span className="text-xs text-slate-500">
        {count} {count === 1 ? 'ticket' : 'tickets'}
      </span>
    </header>
  )
}
```

`src/components/board/BoardScreen.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { BoardHeader } from './BoardHeader'
import { Board } from './Board'
import { Toast } from '../ui/Toast'
import { Banner } from '../ui/Banner'

export function BoardScreen() {
  const status = useBoardStore((s) => s.status)
  const storageMode = useBoardStore((s) => s.storageMode)
  const error = useBoardStore((s) => s.error)
  const load = useBoardStore((s) => s.load)
  const dismissError = useBoardStore((s) => s.dismissError)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  if (status === 'loading') {
    return <p className="p-8 text-sm text-slate-500">Loading board…</p>
  }
  if (status === 'error') {
    return <p className="p-8 text-sm text-rose-600">Could not load the board.</p>
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {storageMode === 'memory' && !bannerDismissed && (
        <Banner
          message="Changes won't be saved — this browser is blocking local storage."
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      <BoardHeader />
      <Board onOpenTicket={() => {}} />
      <Toast message={error} onDismiss={dismissError} />
    </div>
  )
}
```

Replace the body of `src/App.tsx`:

```tsx
import { BoardScreen } from './components/board/BoardScreen'

export default function App() {
  return <BoardScreen />
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all board rendering tests green.

- [ ] **Step 7: Verify visually**

Run: `npm run dev`
Expected: three columns with five seeded tickets, Jira-like compact cards.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: render the board from the store"
```

---

### Task 8: Drag and drop

**Files:**
- Modify: `src/components/board/Board.tsx`, `Column.tsx`, `TicketCard.tsx`
- Create: `src/components/board/SortableTicket.tsx`
- Test: `src/components/board/dragAndDrop.test.tsx`

**Interfaces:**
- Consumes: `useBoardStore().moveTicket`, `@dnd-kit/core`, `@dnd-kit/sortable`
- Produces: `<SortableTicket ticket member onOpen />` — a `useSortable` wrapper around `TicketCard`. `Column` becomes a droppable `SortableContext`; `Board` owns the `DndContext`.

- [ ] **Step 1: Write the failing test**

Drives the keyboard sensor rather than simulating pointer physics — it is the accessible path and it is deterministic.

`src/components/board/dragAndDrop.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from './BoardScreen'
import { useBoardStore } from '../../store/boardStore'

beforeEach(() => localStorage.clear())

describe('keyboard drag', () => {
  it('reorders a ticket within its column', async () => {
    render(<BoardScreen />)
    await screen.findByText('Set up project repository')

    const handle = screen.getByTestId('ticket-seed-1')
    handle.focus()
    await userEvent.keyboard('{ }')          // pick up
    await userEvent.keyboard('{ArrowDown}')  // move down one slot
    await userEvent.keyboard('{ }')          // drop

    const todo = useBoardStore
      .getState()
      .board!.columns.find((c) => c.id === 'col-todo')!
    expect(todo.ticketIds).toEqual(['seed-2', 'seed-1'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — the card is not draggable, so the order is unchanged.

- [ ] **Step 3: Make `TicketCard` forward drag props, and create `SortableTicket`**

Change the `TicketCard` signature to accept and spread drag wiring:

```tsx
export function TicketCard({
  ticket,
  member,
  onOpen,
  dragRef,
  dragProps,
  style,
  isDragging,
}: {
  ticket: Ticket
  member: Member | null
  onOpen: () => void
  dragRef?: (node: HTMLElement | null) => void
  dragProps?: Record<string, unknown>
  style?: CSSProperties
  isDragging?: boolean
}) {
  return (
    <button
      type="button"
      ref={dragRef}
      style={style}
      onClick={onOpen}
      data-testid={`ticket-${ticket.id}`}
      className={`w-full rounded border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
        isDragging ? 'opacity-40' : ''
      }`}
      {...dragProps}
    >
      {/* body unchanged */}
    </button>
  )
}
```

Add `import type { CSSProperties } from 'react'` at the top.

`src/components/board/SortableTicket.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Member, Ticket } from '../../types/board'
import { TicketCard } from './TicketCard'

export function SortableTicket({
  ticket,
  member,
  onOpen,
}: {
  ticket: Ticket
  member: Member | null
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id, data: { type: 'ticket' } })

  return (
    <TicketCard
      ticket={ticket}
      member={member}
      onOpen={onOpen}
      dragRef={setNodeRef}
      dragProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    />
  )
}
```

- [ ] **Step 4: Make `Column` a droppable sortable context**

In `src/components/board/Column.tsx`, replace the `TicketCard` usage:

```tsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableTicket } from './SortableTicket'
```

Inside the component, before the return:

```tsx
const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'column' } })
```

Then the list becomes:

```tsx
<SortableContext items={column.ticketIds} strategy={verticalListSortingStrategy}>
  <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
    {tickets.map((ticket) => (
      <SortableTicket
        key={ticket.id}
        ticket={ticket}
        member={members.find((m) => m.id === ticket.assigneeId) ?? null}
        onOpen={() => onOpenTicket(ticket.id)}
      />
    ))}
  </div>
</SortableContext>
```

The `min-h-16` matters — an empty column needs a drop target with height.

- [ ] **Step 5: Own the `DndContext` in `Board`**

A drop can land on a ticket (reorder relative to it) or on an empty column (append). Both cases resolve to a column id and an index, which is exactly `moveTicket`'s shape.

`src/components/board/Board.tsx`:

```tsx
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import { Column } from './Column'

export function Board({ onOpenTicket }: { onOpenTicket: (id: string) => void }) {
  const board = useBoardStore((s) => s.board)
  const moveTicket = useBoardStore((s) => s.moveTicket)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!board) return null

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || !board) return
    const ticketId = String(active.id)
    const overId = String(over.id)
    if (ticketId === overId) return

    const targetColumn =
      board.columns.find((c) => c.id === overId) ??
      board.columns.find((c) => c.ticketIds.includes(overId))
    if (!targetColumn) return

    const source = board.columns.find((c) => c.ticketIds.includes(ticketId))
    if (!source) return

    const withoutTicket = targetColumn.ticketIds.filter((id) => id !== ticketId)
    const index =
      targetColumn.id === overId
        ? withoutTicket.length
        : withoutTicket.indexOf(overId)

    if (source.id === targetColumn.id && source.ticketIds.indexOf(ticketId) === index) {
      return
    }
    void moveTicket(ticketId, targetColumn.id, index)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tickets={column.ticketIds.map((id) => board.tickets[id]).filter(Boolean)}
            members={board.members}
            onOpenTicket={onOpenTicket}
          />
        ))}
      </div>
    </DndContext>
  )
}
```

The index calculation strips the dragged ticket first, matching `applyMoveTicket`'s remove-then-insert semantics from Task 2.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — the keyboard drag test reorders `col-todo`.

- [ ] **Step 7: Verify pointer dragging by hand**

Run: `npm run dev`
Expected: dragging a card between columns and within a column both work; dropping on an empty column appends.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add drag-and-drop for tickets via dnd-kit"
```

---

### Task 9: Ticket modal — create, edit, delete

**Files:**
- Create: `src/components/ui/Select.tsx`, `src/components/ticket/TicketForm.tsx`, `src/components/ticket/TicketModal.tsx`
- Modify: `src/components/board/BoardScreen.tsx`, `Column.tsx`
- Test: `src/components/ticket/TicketModal.test.tsx`

**Interfaces:**
- Consumes: `useBoardStore` actions `addTicket`, `updateTicket`, `deleteTicket`, `moveTicket`; `Modal`, `LabelChip`
- Produces:
  - `<Select label options value onChange />` where `options: { value: string; label: string }[]`
  - `<TicketModal mode onClose />` with `mode: { kind: 'create'; columnId: string } | { kind: 'edit'; ticketId: string } | null`
  - `Column` gains an `onCreate: () => void` prop and renders a "+ Create" button

- [ ] **Step 1: Write the failing tests**

`src/components/ticket/TicketModal.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from '../board/BoardScreen'
import { useBoardStore } from '../../store/boardStore'

beforeEach(() => localStorage.clear())

describe('creating a ticket', () => {
  it('adds it to the column the create button belongs to', async () => {
    render(<BoardScreen />)
    const todo = await screen.findByTestId('column-col-todo')
    await userEvent.click(within(todo).getByRole('button', { name: /create/i }))

    await userEvent.type(screen.getByLabelText(/title/i), 'Brand new ticket')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const board = useBoardStore.getState().board!
    const column = board.columns.find((c) => c.id === 'col-todo')!
    const created = board.tickets[column.ticketIds.at(-1)!]
    expect(created.title).toBe('Brand new ticket')
    expect(created.key).toBe('ORC-6')
  })

  it('refuses to save an empty title', async () => {
    render(<BoardScreen />)
    const todo = await screen.findByTestId('column-col-todo')
    await userEvent.click(within(todo).getByRole('button', { name: /create/i }))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    expect(useBoardStore.getState().board!.columns[0].ticketIds).toHaveLength(2)
  })
})

describe('editing a ticket', () => {
  it('saves field changes', async () => {
    render(<BoardScreen />)
    await userEvent.click(await screen.findByTestId('ticket-seed-1'))

    const title = screen.getByLabelText(/title/i)
    await userEvent.clear(title)
    await userEvent.type(title, 'Renamed ticket')
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'highest')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const ticket = useBoardStore.getState().board!.tickets['seed-1']
    expect(ticket.title).toBe('Renamed ticket')
    expect(ticket.priority).toBe('highest')
  })

  it('routes a status change through moveTicket, not updateTicket', async () => {
    render(<BoardScreen />)
    await userEvent.click(await screen.findByTestId('ticket-seed-1'))

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'col-done')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    const board = useBoardStore.getState().board!
    expect(board.columns.find((c) => c.id === 'col-todo')!.ticketIds).not.toContain('seed-1')
    expect(board.columns.find((c) => c.id === 'col-done')!.ticketIds).toContain('seed-1')
  })

  it('deletes the ticket', async () => {
    render(<BoardScreen />)
    await userEvent.click(await screen.findByTestId('ticket-seed-1'))
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(useBoardStore.getState().board!.tickets['seed-1']).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — no create button, and cards open nothing.

- [ ] **Step 3: Create `src/components/ui/Select.tsx`**

```tsx
import { useId } from 'react'

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 4: Create `src/components/ticket/TicketForm.tsx`**

Owns the form state and validation only. It reports a result; the modal performs the store calls.

```tsx
import { useId, useState, type FormEvent } from 'react'
import type {
  BoardSnapshot,
  Priority,
  StoryPoints,
  Ticket,
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
```

- [ ] **Step 5: Create `src/components/ticket/TicketModal.tsx`**

A status change is a move, not a field update — so editing can issue up to two store calls.

```tsx
import { useBoardStore } from '../../store/boardStore'
import { Modal } from '../ui/Modal'
import { TicketForm, type TicketFormValues } from './TicketForm'

export type TicketModalMode =
  | { kind: 'create'; columnId: string }
  | { kind: 'edit'; ticketId: string }
  | null

export function TicketModal({
  mode,
  onClose,
}: {
  mode: TicketModalMode
  onClose: () => void
}) {
  const board = useBoardStore((s) => s.board)
  const addTicket = useBoardStore((s) => s.addTicket)
  const updateTicket = useBoardStore((s) => s.updateTicket)
  const deleteTicket = useBoardStore((s) => s.deleteTicket)
  const moveTicket = useBoardStore((s) => s.moveTicket)

  if (!board || !mode) return null

  const existing = mode.kind === 'edit' ? board.tickets[mode.ticketId] : null
  if (mode.kind === 'edit' && !existing) return null

  const currentColumnId =
    mode.kind === 'create'
      ? mode.columnId
      : (board.columns.find((c) => c.ticketIds.includes(mode.ticketId))?.id ??
        board.columns[0].id)

  const initial: TicketFormValues = existing
    ? {
        title: existing.title,
        description: existing.description,
        type: existing.type,
        priority: existing.priority,
        assigneeId: existing.assigneeId,
        labels: existing.labels,
        storyPoints: existing.storyPoints,
        columnId: currentColumnId,
      }
    : {
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        assigneeId: null,
        labels: [],
        storyPoints: null,
        columnId: currentColumnId,
      }

  async function handleSubmit(values: TicketFormValues) {
    if (mode?.kind === 'create') {
      await addTicket(values)
    } else if (mode?.kind === 'edit') {
      const { columnId, ...fields } = values
      await updateTicket(mode.ticketId, fields)
      if (columnId !== currentColumnId) {
        const target = board!.columns.find((c) => c.id === columnId)
        await moveTicket(mode.ticketId, columnId, target ? target.ticketIds.length : 0)
      }
    }
    onClose()
  }

  async function handleDelete() {
    if (mode?.kind !== 'edit') return
    await deleteTicket(mode.ticketId)
    onClose()
  }

  return (
    <Modal open labelledBy="ticket-modal-title" onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 id="ticket-modal-title" className="font-mono text-sm text-slate-500">
          {existing ? existing.key || '…' : 'New ticket'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      </div>
      <TicketForm
        board={board}
        initial={initial}
        onSubmit={handleSubmit}
        onDelete={existing ? handleDelete : undefined}
      />
    </Modal>
  )
}
```

- [ ] **Step 6: Wire the modal into `BoardScreen` and add the create button to `Column`**

In `Column.tsx`, add `onCreate: () => void` to the props and render after the sortable list:

```tsx
<button
  type="button"
  onClick={onCreate}
  className="mt-2 rounded px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-200"
>
  + Create
</button>
```

In `Board.tsx`, add an `onCreate: (columnId: string) => void` prop and pass
`onCreate={() => onCreate(column.id)}` to each `Column`.

In `BoardScreen.tsx`, hold the modal state:

```tsx
const [modalMode, setModalMode] = useState<TicketModalMode>(null)
```

and render:

```tsx
<Board
  onOpenTicket={(ticketId) => setModalMode({ kind: 'edit', ticketId })}
  onCreate={(columnId) => setModalMode({ kind: 'create', columnId })}
/>
<TicketModal mode={modalMode} onClose={() => setModalMode(null)} />
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all ticket modal tests green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add ticket modal for create, edit and delete"
```

---

### Task 10: Column CRUD UI

**Files:**
- Create: `src/components/board/ColumnHeader.tsx`
- Modify: `src/components/board/Column.tsx`, `BoardHeader.tsx`, `BoardScreen.tsx`
- Test: `src/components/board/columnCrud.test.tsx`

**Interfaces:**
- Consumes: `useBoardStore` actions `addColumn`, `renameColumn`, `deleteColumn`, `reorderColumn`; `Modal`, `Select`
- Produces: `<ColumnHeader column={Column} ticketCount={number} canDelete={boolean} onRequestDelete={() => void} />` — inline rename on double-click, a menu with Move left / Move right / Delete

- [ ] **Step 1: Write the failing tests**

`src/components/board/columnCrud.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from './BoardScreen'
import { useBoardStore } from '../../store/boardStore'

const columnIds = () => useBoardStore.getState().board!.columns.map((c) => c.id)

beforeEach(() => localStorage.clear())

describe('adding a column', () => {
  it('appends a column with the typed name', async () => {
    render(<BoardScreen />)
    await screen.findByTestId('column-col-todo')

    await userEvent.click(screen.getByRole('button', { name: /add column/i }))
    await userEvent.type(screen.getByLabelText(/column name/i), 'Review')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    const columns = useBoardStore.getState().board!.columns
    expect(columns.at(-1)!.name).toBe('Review')
  })
})

describe('renaming a column', () => {
  it('commits the new name on blur', async () => {
    render(<BoardScreen />)
    const todo = await screen.findByTestId('column-col-todo')

    await userEvent.dblClick(within(todo).getByRole('heading', { name: /to do/i }))
    const input = within(todo).getByLabelText(/rename column/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'Backlog')
    await userEvent.tab()

    expect(useBoardStore.getState().board!.columns[0].name).toBe('Backlog')
  })
})

describe('reordering columns', () => {
  it('moves a column right', async () => {
    render(<BoardScreen />)
    const todo = await screen.findByTestId('column-col-todo')

    await userEvent.click(within(todo).getByRole('button', { name: /column actions/i }))
    await userEvent.click(screen.getByRole('button', { name: /move right/i }))

    expect(columnIds()).toEqual(['col-doing', 'col-todo', 'col-done'])
  })
})

describe('deleting a column', () => {
  it('asks what to do with its tickets and moves them', async () => {
    render(<BoardScreen />)
    const todo = await screen.findByTestId('column-col-todo')

    await userEvent.click(within(todo).getByRole('button', { name: /column actions/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete column/i }))

    await userEvent.selectOptions(screen.getByLabelText(/move its tickets to/i), 'col-done')
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }))

    const board = useBoardStore.getState().board!
    expect(columnIds()).toEqual(['col-doing', 'col-done'])
    expect(board.columns.find((c) => c.id === 'col-done')!.ticketIds).toContain('seed-1')
  })

  it('deletes without prompting when the column is empty', async () => {
    render(<BoardScreen />)
    await screen.findByTestId('column-col-todo')
    await useBoardStore.getState().addColumn('Empty')
    const emptyId = useBoardStore.getState().board!.columns.at(-1)!.id

    const column = await screen.findByTestId(`column-${emptyId}`)
    await userEvent.click(within(column).getByRole('button', { name: /column actions/i }))
    await userEvent.click(screen.getByRole('button', { name: /delete column/i }))

    expect(columnIds()).not.toContain(emptyId)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — no add-column control and no column actions menu.

- [ ] **Step 3: Create `src/components/board/ColumnHeader.tsx`**

```tsx
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
```

- [ ] **Step 4: Use `ColumnHeader` in `Column.tsx`**

Replace the inline `<header>` block with:

```tsx
<ColumnHeader
  column={column}
  ticketCount={tickets.length}
  canDelete={canDelete}
  onRequestDelete={onRequestDelete}
/>
```

Add `canDelete: boolean` and `onRequestDelete: () => void` to `Column`'s props, and in `Board.tsx` pass
`canDelete={board.columns.length > 1}` and `onRequestDelete={() => onRequestDeleteColumn(column.id)}`,
threading a new `onRequestDeleteColumn: (columnId: string) => void` prop through `Board`.

- [ ] **Step 5: Add the "Add column" control to `BoardHeader.tsx`**

```tsx
const [adding, setAdding] = useState(false)
const [name, setName] = useState('')
const addColumn = useBoardStore((s) => s.addColumn)

async function submit() {
  const trimmed = name.trim()
  if (trimmed === '') return
  setName('')
  setAdding(false)
  await addColumn(trimmed)
}
```

Rendered after the ticket count:

```tsx
{adding ? (
  <span className="ml-auto flex items-center gap-2">
    <label className="sr-only" htmlFor="new-column-name">
      Column name
    </label>
    <input
      id="new-column-name"
      autoFocus
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') void submit()
        if (e.key === 'Escape') setAdding(false)
      }}
      className="rounded border border-slate-300 px-2 py-1 text-sm"
    />
    <button
      type="button"
      onClick={() => void submit()}
      className="rounded bg-sky-600 px-2.5 py-1 text-sm text-white hover:bg-sky-700"
    >
      Add
    </button>
  </span>
) : (
  <button
    type="button"
    onClick={() => setAdding(true)}
    className="ml-auto rounded px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-100"
  >
    + Add column
  </button>
)}
```

- [ ] **Step 6: Add the delete-column flow to `BoardScreen.tsx`**

An empty column deletes immediately; a populated one asks where its tickets should go.

```tsx
const [deletingColumnId, setDeletingColumnId] = useState<string | null>(null)
const [moveTarget, setMoveTarget] = useState<string>('')
const board = useBoardStore((s) => s.board)
const deleteColumn = useBoardStore((s) => s.deleteColumn)

const deletingColumn = board?.columns.find((c) => c.id === deletingColumnId) ?? null
const otherColumns = board?.columns.filter((c) => c.id !== deletingColumnId) ?? []

function requestDeleteColumn(columnId: string) {
  const column = board!.columns.find((c) => c.id === columnId)!
  if (column.ticketIds.length === 0) {
    void deleteColumn(columnId, { kind: 'delete' })
    return
  }
  setMoveTarget(board!.columns.find((c) => c.id !== columnId)!.id)
  setDeletingColumnId(columnId)
}
```

Rendered alongside the board. This uses `Modal` directly rather than a generic confirm dialog, because the choice needs a select (where do the tickets go?) rather than a yes/no:

```tsx
<Modal
  open={deletingColumn !== null}
  labelledBy="delete-column-title"
  onClose={() => setDeletingColumnId(null)}
>
  <div className="p-5">
    <h2 id="delete-column-title" className="text-sm font-semibold text-slate-800">
      Delete “{deletingColumn?.name}”?
    </h2>
    <p className="mt-2 text-sm text-slate-600">
      It holds {deletingColumn?.ticketIds.length} ticket(s).
    </p>
    <div className="mt-4">
      <Select
        label="Move its tickets to"
        value={moveTarget}
        onChange={setMoveTarget}
        options={[
          ...otherColumns.map((c) => ({ value: c.id, label: c.name })),
          { value: '', label: 'Delete them' },
        ]}
      />
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onClick={() => setDeletingColumnId(null)}
        className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => {
          const id = deletingColumnId!
          setDeletingColumnId(null)
          void deleteColumn(
            id,
            moveTarget === '' ? { kind: 'delete' } : { kind: 'move', toColumnId: moveTarget },
          )
        }}
        className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
      >
        Delete
      </button>
    </div>
  </div>
</Modal>
```

Pass `onRequestDeleteColumn={requestDeleteColumn}` to `<Board />`.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — every test across all tasks.

- [ ] **Step 8: Typecheck and build**

Run: `npm run build`
Expected: no TypeScript errors, `dist/` produced.

- [ ] **Step 9: Verify the whole board by hand**

Run: `npm run dev`
Check: create / edit / delete a ticket; drag between and within columns; add, rename, reorder and delete a column; reload the page and confirm everything persisted.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add column create, rename, reorder and delete"
```

---

## Done

The board is feature-complete for the MVP.

When the backend phase starts: write `HttpBoardApi` against `src/api/BoardApi.ts`, return it from `createBoardApi()` in `src/api/index.ts`, and delete `src/api/seedData.ts`. Nothing above that line should need to change.
