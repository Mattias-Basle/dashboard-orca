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

  it('keeps focus in place when the parent re-renders with a fresh onClose', () => {
    // Mirrors the real call sites (BoardScreen), which pass a fresh inline
    // arrow as `onClose` on every render.
    function Wrapper({ counter }: { counter: number }) {
      return (
        <>
          <span>{counter}</span>
          <Modal open labelledBy="t" onClose={() => {}}>
            <h2 id="t">Shown</h2>
            <input aria-label="field" />
          </Modal>
        </>
      )
    }

    const { rerender } = render(<Wrapper counter={0} />)
    const field = screen.getByLabelText('field')
    field.focus()
    expect(field).toHaveFocus()

    rerender(<Wrapper counter={1} />)

    expect(field).toHaveFocus()
  })

  it('focuses the first meaningful control, not a Close button', () => {
    render(
      <Modal open labelledBy="t" onClose={() => {}}>
        <h2 id="t">Shown</h2>
        <button type="button" aria-label="Close">
          ×
        </button>
        <input aria-label="field" />
      </Modal>,
    )
    expect(screen.getByLabelText('field')).toHaveFocus()
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
