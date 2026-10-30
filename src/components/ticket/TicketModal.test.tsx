import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from '../board/BoardScreen'
import { useBoardStore, __resetBoardStoreForTests } from '../../store/boardStore'

beforeEach(() => {
  __resetBoardStoreForTests()
})

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

    const modal = screen.getByRole('dialog')
    const title = within(modal).getByLabelText(/title/i)
    await userEvent.clear(title)
    await userEvent.type(title, 'Renamed ticket')
    await userEvent.selectOptions(within(modal).getByLabelText(/priority/i), 'highest')
    await userEvent.click(within(modal).getByRole('button', { name: /^save$/i }))

    const ticket = useBoardStore.getState().board!.tickets['seed-1']
    expect(ticket.title).toBe('Renamed ticket')
    expect(ticket.priority).toBe('highest')
  })

  it('routes a status change through moveTicket, not updateTicket', async () => {
    render(<BoardScreen />)
    await userEvent.click(await screen.findByTestId('ticket-seed-1'))

    const modal = screen.getByRole('dialog')
    await userEvent.selectOptions(within(modal).getByLabelText(/status/i), 'col-done')
    await userEvent.click(within(modal).getByRole('button', { name: /^save$/i }))

    const board = useBoardStore.getState().board!
    expect(board.columns.find((c) => c.id === 'col-todo')!.ticketIds).not.toContain('seed-1')
    expect(board.columns.find((c) => c.id === 'col-done')!.ticketIds).toContain('seed-1')
  })

  it('deletes the ticket', async () => {
    render(<BoardScreen />)
    await userEvent.click(await screen.findByTestId('ticket-seed-1'))
    const modal = screen.getByRole('dialog')
    await userEvent.click(within(modal).getByRole('button', { name: /delete/i }))

    expect(useBoardStore.getState().board!.tickets['seed-1']).toBeUndefined()
  })
})
