import { makeSnapshot } from './src/domain/testFixtures'
import { applyAddTicket, applyMoveTicket } from './src/domain/boardOperations'
import { makeTicket } from './src/domain/testFixtures'

// Test: "reorders within the same column using remove-then-insert semantics"
// This WOULD catch a wrong implementation that does insert-then-remove instead
const s = makeSnapshot()
const next = applyMoveTicket(s, 't1', 'todo', 1)
const ids = s.columns[0].ticketIds

console.log('Test: same-column reorder (t1 to index 1)')
console.log('Result:', next.columns.find(c => c.id === 'todo')!.ticketIds)
console.log('Expected: [t2, t1]')
console.log('Pass?', JSON.stringify(next.columns.find(c => c.id === 'todo')!.ticketIds) === JSON.stringify(['t2', 't1']))

// If implementation was "insert-then-remove":
// Initial: [t1, t2], insert at 1 -> [t1, t1, t2], remove t1 -> [t1, t2] (WRONG)
// Correct "remove-then-insert":
// Initial: [t1, t2], remove t1 -> [t2], insert at 1 -> [t2, t1] (CORRECT)

// Test: no-op returns same reference (not just equal)
const s2 = makeSnapshot()
const noop = applyMoveTicket(s2, 'nope', 'todo', 0)
console.log('\nTest: no-op returns original reference')
console.log('Returns s === result?', noop === s2)
console.log('Would fail if new equal object was returned?', 'yes, because toBe checks reference')

// Test: mutability check - input is inspected AFTER the call
const s3 = makeSnapshot()
applyAddTicket(s3, makeTicket('t9'), 'todo')
console.log('\nTest: does not mutate input')
console.log('Original still [t1, t2]?', JSON.stringify(s3.columns[0].ticketIds) === JSON.stringify(['t1', 't2']))
console.log('Would fail if input was mutated?', 'yes, checks input afterward')
