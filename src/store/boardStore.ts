import type { BoardApi } from '../api/BoardApi'
import { createBoardApi } from '../api'
import { createBoardStore as createStore } from './createBoardStore'

/**
 * The live API instance. Held behind a proxy so tests can swap it without
 * the store (or any component) needing a new reference.
 */
let liveApi: BoardApi = createBoardApi()

/**
 * Stable stand-in for `liveApi`. Methods are bound to the current instance
 * because `Reflect.get` returns them unbound; field reads such as
 * `storageMode` and `wasReset` pass straight through.
 */
const apiProxy = new Proxy({} as BoardApi, {
  get(_target, prop) {
    const value = Reflect.get(liveApi as object, prop)
    return typeof value === 'function' ? value.bind(liveApi) : value
  },
})

export const useBoardStore = createStore(apiProxy)

/**
 * Test-only. Clears persisted state and rebuilds the API so each test starts
 * from pristine seed data. Needed because `LocalStorageBoardApi` reads storage
 * in its constructor, so clearing storage alone leaves stale in-memory state.
 */
export function __resetBoardStoreForTests(): void {
  localStorage.clear()
  liveApi = createBoardApi()
  useBoardStore.setState({
    board: null,
    status: 'loading',
    storageMode: 'persistent',
    error: null,
  })
}

export type { BoardStore } from './createBoardStore'
