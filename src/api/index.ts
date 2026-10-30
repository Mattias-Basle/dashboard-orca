import type { BoardApi } from './BoardApi'
import { LocalStorageBoardApi } from './LocalStorageBoardApi'

/**
 * The swap point for the backend phase: return an HttpBoardApi here and
 * delete seedData.ts. Nothing above this line changes.
 */
export function createBoardApi(): BoardApi {
  return new LocalStorageBoardApi()
}

export type { BoardApi }
