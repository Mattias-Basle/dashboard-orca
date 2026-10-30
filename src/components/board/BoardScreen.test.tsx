import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BoardScreen } from './BoardScreen'
import { __resetBoardStoreForTests } from '../../store/boardStore'

beforeEach(() => __resetBoardStoreForTests())

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

  it('opens the ticket dialog when a focused card receives Enter', async () => {
    render(<BoardScreen />)
    const card = await screen.findByTestId('ticket-seed-1')
    card.focus()
    expect(card).toHaveFocus()

    await userEvent.keyboard('{Enter}')

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
