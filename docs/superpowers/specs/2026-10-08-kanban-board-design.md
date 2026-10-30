# Kanban Board — Design Spec

**Date:** 2026-10-08
**Status:** Approved
**Scope:** Frontend MVP, localStorage persistence, backend to follow in a later phase

## 1. Purpose

A Jira-style kanban board for the `dashboard-orca` project. Tickets live in user-defined
columns and move between them by drag and drop. Each ticket carries the fields a real
tracker needs — type, priority, assignee, labels, story points, description.

This phase is an **MVP**, not a finished product. A backend will be added later. Every
architectural decision below is justified by one of those two facts: keep it small now,
and make the backend phase cheap.

### Success criterion for the architecture

When the backend lands, the work should be: write `HttpBoardApi`, change one line where
the API is constructed, delete `seedData.ts`. Components, store, and domain layer stay
untouched. **Any future change to this plan that breaks that property is the wrong change.**

## 2. Scope

### In

- Columns: create, rename, delete, reorder
- Tickets: create, edit, delete
- Drag and drop: between columns and reordering within a column
- Ticket fields: title, description, type, priority, assignee, labels, story points
- localStorage persistence behind an async, operation-shaped API seam
- Seed data on first run

### Out (deferred, deliberately)

Search and filtering · multiple boards · comments · activity history · epics, sprints,
backlog · authentication · dark mode · member management (members are a seeded constant)
· schema migrations · real-time sync.

## 3. Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Typed ticket models; best drag-drop ecosystem |
| Build | Vite | Fast dev loop, minimal config |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Jira-like compact UI, quick iteration |
| State | Zustand | ~1KB; async-shaped actions from day one |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Multi-container sorting, keyboard sensor, React 18 safe |
| Tests | Vitest + React Testing Library + jsdom | Shares Vite config |

`react-beautiful-dnd` is explicitly rejected: unmaintained, and it fights React 18
StrictMode.

## 4. Data model

Normalized. Tickets live in a map; columns own an ordered array of ticket ids. Reordering
is then an array splice rather than rebalancing fractional `order` values.

```ts
type TicketType = 'story' | 'bug' | 'task'
type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'
type StoryPoints = 1 | 2 | 3 | 5 | 8 | 13

type Ticket = {
  id: string                  // uuid; temporary until the API returns the real one
  key: string                 // "ORC-14" — assigned by the API layer, never by a component
  title: string
  description: string
  type: TicketType
  priority: Priority
  assigneeId: string | null
  labels: string[]
  storyPoints: StoryPoints | null
  createdAt: string           // ISO 8601
  updatedAt: string           // ISO 8601
}

type Column = {
  id: string
  name: string
  ticketIds: string[]         // ordered
}

type Member = {
  id: string
  name: string
  initials: string
  color: string               // Tailwind class suffix for the avatar
}

type BoardSnapshot = {
  boardName: string
  columns: Column[]           // ordered
  tickets: Record<string, Ticket>
  members: Member[]
}
```

`ticketCounter` is **not** in `BoardSnapshot`. It lives inside `LocalStorageBoardApi`,
because a server would own key assignment. This is the single most important detail for
the backend migration.

## 5. The API seam

Operation-shaped and async — mirroring the HTTP calls that will replace it. Not
`load()`/`save()` over a blob, because no backend persists a whole board on every
keystroke.

```ts
type TicketInput = Omit<Ticket, 'id' | 'key' | 'createdAt' | 'updatedAt'> & {
  columnId: string
}

type Disposition =
  | { kind: 'move'; toColumnId: string }
  | { kind: 'delete' }

interface BoardApi {
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

### LocalStorageBoardApi

Implements the interface synchronously and wraps results in resolved promises. Internally
it reads/writes a single JSON blob under key `orca.board.v1`, shaped
`{ schemaVersion: 1, ticketCounter: number, board: BoardSnapshot }`. Nothing above the
interface knows that.

It owns id generation (`crypto.randomUUID()`) and key generation (`ORC-${++ticketCounter}`).

### Later: HttpBoardApi

Same interface, `fetch` bodies. Constructed in one place (`src/api/index.ts`), so the swap
is a one-line change.

## 6. State architecture

Two layers, split on purpose.

```
domain/boardOperations.ts   pure functions over BoardSnapshot — no React, no async
store/boardStore.ts         Zustand; optimistic apply → await api → commit or roll back
```

The pure layer holds every board rule and is testable with plain function calls. The store
is thin glue. The split is what allows swapping Zustand for TanStack Query later without
touching a single domain rule.

### Pure operations

All have signature `(snapshot, ...args) => BoardSnapshot` and never mutate their input.

`applyAddTicket` · `applyReplaceTicket` · `applyUpdateTicket` · `applyDeleteTicket` ·
`applyMoveTicket` · `applyAddColumn` · `applyReplaceColumn` · `applyRenameColumn` ·
`applyDeleteColumn` · `applyReorderColumn`

`applyReplaceTicket(snapshot, tempId, saved)` swaps an optimistic ticket for the
API-returned one, preserving its position in the owning column.

### Store shape

```ts
type BoardStore = {
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
```

### Optimistic updates via snapshot rollback

Rather than hand-writing an inverse for each of the eight operations — `moveTicket` in
particular is fiddly to invert correctly — the store snapshots the board before applying
and restores it on failure. One shared helper covers every action:

```ts
async function runOptimistic(apply, call, commit?) {
  const snapshot = get().board
  set({ board: apply(snapshot) })
  try {
    const result = await call()
    if (commit) set(s => ({ board: commit(s.board, result) }))
  } catch (err) {
    set({ board: snapshot, error: messageFor(err) })
  }
}
```

`addTicket` and `addColumn` pass a `commit` to swap the temp id for the real one. The rest
pass none.

The implementation uses one fixed message per action (`'Could not create the ticket.'`,
etc.) rather than a `messageFor(err)` helper that differentiates failure causes. Deferred
to the backend phase — against `LocalStorageBoardApi`, the only real failure modes are
indistinguishable to the user, and differentiating HTTP failures (network vs. 4xx vs. 5xx)
is only meaningful once there is an actual HTTP layer.

Components call `await addTicket({...})`. That call signature is identical before and
after the backend exists.

## 7. Components

```
App
└─ BoardScreen                     reads status; renders skeleton / error / board
   ├─ StorageBanner                shown only when storageMode === 'memory'
   ├─ BoardHeader                  board name · ticket count · "+ Add column"
   ├─ Board                        DndContext; horizontal scrolling column list
   │  └─ Column                    SortableContext; header menu; "+ Create"
   │     └─ TicketCard             key · title · type icon · priority · labels · points · avatar
   ├─ TicketModal                  centered dialog, focus-trapped, Esc to close
   └─ Toast                        renders store.error, auto-dismiss after 5s
```

### Ticket detail — centered modal

Clicking a card opens a centered dialog over a dimmed board. Contains: key and close
button in the header; title; a row of selects for type, priority, story points; assignee
and status selects; label chips with inline add; description textarea; Delete and Save
in the footer.

Rendered in a portal. Focus trapped, focus restored to the originating card on close.
Esc and backdrop click both close. Unsaved-changes handling is out of scope for the MVP —
Save commits, close discards.

**Status is not a ticket field.** A ticket's status *is* the column holding it, so the
modal's Status select does not go through `updateTicket`. Changing it calls
`moveTicket(id, toColumnId, <end of target column>)`. Saving the modal therefore issues up
to two calls: `updateTicket` for the field edits, and `moveTicket` if the status changed.
Each rolls back independently.

### Files

```
src/
  main.tsx
  App.tsx
  index.css
  types/board.ts
  domain/boardOperations.ts
  domain/factories.ts                 buildTicket, buildColumn (temp ids)
  api/BoardApi.ts                     interface + input types
  api/LocalStorageBoardApi.ts
  api/seedData.ts
  api/index.ts                        constructs the active API — the swap point
  store/boardStore.ts
  components/board/{BoardScreen,Board,BoardHeader,Column,ColumnHeader,TicketCard}.tsx
  components/ticket/{TicketModal,TicketForm}.tsx
  components/ui/{Modal,Toast,Banner,Avatar,LabelChip,TypeIcon,PriorityIcon,Select}.tsx
  lib/ids.ts
```

`components/ui/ConfirmDialog.tsx` was deliberately dropped before implementation: the
delete-column flow needs a dropdown (which column should inherit its tickets), not a
yes/no choice, so that confirmation inlines `Modal` + `Select` directly in `BoardScreen`
instead of going through a generic confirm component.

Each file stays focused and roughly 175 lines, and the real test is whether the file has
one job. A file outgrowing that line count is a signal worth checking, not a hard limit —
during implementation, four files settled at 163-171 lines, each still a single cohesive
concern, while the one file that genuinely did two jobs was split up. The guideline caught
the real case; the round number was generating false positives.

## 8. Data flow

On mount, `BoardScreen` calls `store.load()`, which awaits `api.getBoard()` and sets
`status: 'ready'`. While loading, a `Loading board…` line renders — a skeleton board isn't
worth building at this stage.

A user action calls a store action. The action applies the pure operation optimistically,
awaits the API, then commits or rolls back. React re-renders from the store.

Drag end dispatches `moveTicket(id, toColumnId, toIndex)`. dnd-kit owns the drag visuals;
the store is the source of truth once the drop lands.

## 9. Seed data

On first run — no `orca.board.v1` key present — seed three columns (To Do, In Progress,
Done), five sample tickets spread across them, and three members. An empty first screen
teaches nothing about what the board does.

`seedData.ts` is deleted when the backend lands.

## 10. Error handling

| Case | Behavior |
|---|---|
| Any API operation fails | Roll back to the pre-action snapshot, show a toast. One mechanism covers all eight operations. |
| localStorage unavailable (private mode, quota exceeded) | Catch at construction, run in-memory, set `storageMode: 'memory'`, show a dismissible banner: "Changes won't be saved" |
| Corrupt JSON, or `schemaVersion` mismatch | Reset to seed data, toast the reset. No migration machinery — local data is disposable at MVP stage. |
| Deleting a column that holds tickets | Confirm dialog offering to move its tickets to another column or delete them, passed as `Disposition` |
| Deleting the last remaining column | Blocked; the menu item is disabled. A board needs at least one column. |

## 11. Accessibility

dnd-kit's keyboard sensor is enabled, so tickets are movable without a pointer. The modal
traps focus and restores it on close. Icon-only buttons carry `aria-label`. Type and
priority are conveyed by text in the ticket modal, not by color alone.

## 12. Testing

Weighted toward where bugs actually live and where tests are cheapest.

**`domain/boardOperations.test.ts` — thorough.** Every operation. Cross-column moves,
within-column reordering, index clamping at both ends, column deletion under both
dispositions, `applyReplaceTicket` preserving position, immutability of inputs. No
mocking required.

**`api/LocalStorageBoardApi.test.ts`.** Round-trip persistence; sequential key assignment
(`ORC-1`, `ORC-2`); corrupt-JSON reset path; schema-version-mismatch reset path; quota
error surfacing.

**`components/board/BoardScreen.test.tsx` — one smoke test.** Board renders seeded columns
and tickets; the modal creates a ticket end to end.

Deferred: drag-and-drop interaction tests. dnd-kit's own behavior isn't the likely failure
point, and simulating pointer physics is poor value at MVP stage.

## 13. Open risks

- **Tailwind v4** is a notable departure from v3 config conventions. If its Vite plugin
  causes friction during setup, falling back to v3 is acceptable and affects no other
  part of this design.
- **`crypto.randomUUID()`** requires a secure context. Fine for localhost and HTTPS; if a
  plain-HTTP deployment target appears, `lib/ids.ts` needs a fallback.
