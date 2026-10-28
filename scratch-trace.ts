import { makeSnapshot } from './src/domain/testFixtures'
import { applyMoveTicket } from './src/domain/boardOperations'

const s = makeSnapshot()
console.log('Initial todo:', s.columns[0].ticketIds)

// Same-column reorder: move t1 to index 1
// Expected: ['t2', 't1']
const next = applyMoveTicket(s, 't1', 'todo', 1)
console.log('After moving t1 to index 1:', next.columns[0].ticketIds)

// Cross-column: move t1 from todo to doing at index 0
const s2 = makeSnapshot()
const cross = applyMoveTicket(s2, 't1', 'doing', 0)
console.log('After moving t1 to doing[0]:')
console.log('  todo:', cross.columns[0].ticketIds)
console.log('  doing:', cross.columns[1].ticketIds)

// Negative clamp: move t3 to todo at index -5
const s3 = makeSnapshot()
const neg = applyMoveTicket(s3, 't3', 'todo', -5)
console.log('After moving t3 to todo[-5]:', neg.columns[0].ticketIds)

// Check immutability
const s4 = makeSnapshot()
const result = applyMoveTicket(s4, 't1', 'doing', 0)
console.log('Input still same?', s4.columns[0].ticketIds)
console.log('Input reference changed?', result !== s4)

// Check no-op reference identity
const s5 = makeSnapshot()
const noOp = applyMoveTicket(s5, 'nope', 'todo', 0)
console.log('No-op returns original reference?', noOp === s5)
