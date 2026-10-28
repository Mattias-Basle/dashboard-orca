import { makeSnapshot } from './src/domain/testFixtures'
import { applyAddTicket, applyUpdateTicket, applyDeleteTicket, applyMoveTicket } from './src/domain/boardOperations'
import { makeTicket } from './src/domain/testFixtures'

// Check deep immutability: input snapshot and all nested structures are unchanged
const s = makeSnapshot()
const originalTickets = { ...s.tickets }
const originalCol0Ids = [...s.columns[0].ticketIds]
const originalCol1Ids = [...s.columns[1].ticketIds]

// Apply operations
applyAddTicket(s, makeTicket('new'), 'todo')
applyUpdateTicket(s, 't1', { title: 'Modified' })
applyDeleteTicket(s, 't2')
applyMoveTicket(s, 't3', 'todo', 1)

// Verify input is unchanged
console.log('Tickets unchanged?', JSON.stringify(s.tickets) === JSON.stringify(originalTickets))
console.log('Column 0 IDs unchanged?', JSON.stringify(s.columns[0].ticketIds) === JSON.stringify(originalCol0Ids))
console.log('Column 1 IDs unchanged?', JSON.stringify(s.columns[1].ticketIds) === JSON.stringify(originalCol1Ids))
console.log('Actual col[0]:', s.columns[0].ticketIds)
console.log('Actual col[1]:', s.columns[1].ticketIds)
