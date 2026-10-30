import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from './BoardScreen'
import { useBoardStore, __resetBoardStoreForTests } from '../../store/boardStore'

const columnIds = () => useBoardStore.getState().board!.columns.map((c) => c.id)

beforeEach(() => __resetBoardStoreForTests())

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
