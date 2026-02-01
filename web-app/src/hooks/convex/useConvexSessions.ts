import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

/**
 * Hook for managing analysis sessions with Convex
 * Provides real-time updates when sessions change
 */
export function useConvexSessions() {
  const sessions = useQuery(api.sessions.list)
  const createSession = useMutation(api.sessions.create)
  const renameSession = useMutation(api.sessions.rename)
  const removeSession = useMutation(api.sessions.remove)

  return {
    // Session list (undefined while loading)
    sessions,
    isLoading: sessions === undefined,

    // Create a new session
    create: createSession,

    // Rename a session
    rename: async (sessionId: Id<'sessions'>, name: string) => {
      await renameSession({ sessionId, name })
    },

    // Delete a session
    remove: async (sessionId: Id<'sessions'>) => {
      await removeSession({ sessionId })
    },
  }
}

/**
 * Hook for getting a single session with full data
 */
export function useConvexSession(sessionId: Id<'sessions'> | null) {
  const session = useQuery(
    api.sessions.getWithData,
    sessionId ? { sessionId } : 'skip'
  )

  return {
    session,
    isLoading: sessionId !== null && session === undefined,
  }
}

/**
 * Type for session list item (metadata only)
 */
export type SessionListItem = NonNullable<
  ReturnType<typeof useConvexSessions>['sessions']
>[number]

/**
 * Type for full session with data
 */
export type SessionWithData = NonNullable<
  ReturnType<typeof useConvexSession>['session']
>
