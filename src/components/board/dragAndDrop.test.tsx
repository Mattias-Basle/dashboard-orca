import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from './BoardScreen'
import { useBoardStore, __resetBoardStoreForTests } from '../../store/boardStore'

beforeEach(() => __resetBoardStoreForTests())

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
