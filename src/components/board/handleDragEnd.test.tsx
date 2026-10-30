import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { Board } from './Board'
import { useBoardStore, __resetBoardStoreForTests } from '../../store/boardStore'

/**
 * `Board.handleDragEnd` is otherwise untested end to end: `resolveDrop` is
 * tested in isolation, and `moveTicket` is tested in isolation, but nothing
 * asserts dnd-kit's `onDragEnd` is actually wired to drive them together.
 * Rendering a full drag with dnd-kit's layout engine is not worth it here —
 * instead we stub `DndContext` so we can call its `onDragEnd` prop directly,
 * the same callback a real drop would invoke.
 */
let capturedOnDragEnd: ((event: DragEndEvent) => void) | null = null

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...actual,
    DndContext: ({
      children,
      onDragEnd,
    }: {
      children: React.ReactNode
      onDragEnd: (event: DragEndEvent) => void
    }) => {
      capturedOnDragEnd = onDragEnd
      return children
    },
  }
})

beforeEach(async () => {
  capturedOnDragEnd = null
  __resetBoardStoreForTests()
  await useBoardStore.getState().load()
})

describe('Board handleDragEnd wiring', () => {
  it('moves the dragged ticket via resolveDrop -> moveTicket on drop', async () => {
    render(
      <Board onOpenTicket={() => {}} onCreate={() => {}} onRequestDeleteColumn={() => {}} />,
    )

    expect(capturedOnDragEnd).toBeTypeOf('function')

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 'seed-1' },
        over: { id: 'seed-2' },
      } as DragEndEvent)
    })

    const board = useBoardStore.getState().board!
    expect(board.columns.find((c) => c.id === 'col-todo')!.ticketIds).toEqual([
      'seed-2',
      'seed-1',
    ])
  })

  it('does nothing when the drop target does not change position', async () => {
    render(
      <Board onOpenTicket={() => {}} onCreate={() => {}} onRequestDeleteColumn={() => {}} />,
    )

    await act(async () => {
      capturedOnDragEnd!({
        active: { id: 'seed-1' },
        over: { id: 'seed-1' },
      } as DragEndEvent)
    })

    const board = useBoardStore.getState().board!
    expect(board.columns.find((c) => c.id === 'col-todo')!.ticketIds).toEqual([
      'seed-1',
      'seed-2',
    ])
  })
})
