import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import type { SensorSample } from '@/types/sensor'

const CHUNK_SIZE = 1000

/**
 * Hook for managing sensor recording sessions with Convex
 * Provides real-time updates when sessions change
 */
export function useConvexSensorSessions() {
  const sessions = useQuery(api.sensorSessions.list)
  const createSession = useMutation(api.sensorSessions.create)
  const renameSession = useMutation(api.sensorSessions.rename)
  const removeSession = useMutation(api.sensorSessions.remove)
  const deleteRawSamples = useMutation(api.sensorSessions.deleteRawSamples)
  const uploadChunk = useMutation(api.sensorSamples.uploadChunk)

  /**
   * Create a new sensor session and optionally upload raw samples
   */
  async function create(
    session: Parameters<typeof createSession>[0],
    samples?: SensorSample[]
  ) {
    const sessionId = await createSession(session)

    // Upload samples in chunks if provided
    if (samples && samples.length > 0 && session.storeRawSamples) {
      const totalChunks = Math.ceil(samples.length / CHUNK_SIZE)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, samples.length)
        const chunkSamples = samples.slice(start, end)

        await uploadChunk({
          sensorSessionId: sessionId,
          chunkIndex: i,
          samples: chunkSamples,
        })
      }
    }

    return sessionId
  }

  return {
    // Session list (undefined while loading)
    sessions,
    isLoading: sessions === undefined,

    // Create a new session with optional sample upload
    create,

    // Rename a session
    rename: async (sessionId: Id<'sensorSessions'>, name: string) => {
      await renameSession({ sessionId, name })
    },

    // Delete a session and all its data
    remove: async (sessionId: Id<'sensorSessions'>) => {
      await removeSession({ sessionId })
    },

    // Delete raw samples to save storage (keep processed curve)
    deleteRawSamples: async (sessionId: Id<'sensorSessions'>) => {
      await deleteRawSamples({ sessionId })
    },
  }
}

/**
 * Hook for getting a single sensor session
 */
export function useConvexSensorSession(sessionId: Id<'sensorSessions'> | null) {
  const session = useQuery(
    api.sensorSessions.get,
    sessionId ? { sessionId } : 'skip'
  )

  return {
    session,
    isLoading: sessionId !== null && session === undefined,
  }
}

/**
 * Hook for getting a sensor session with raw samples
 */
export function useConvexSensorSessionWithSamples(
  sessionId: Id<'sensorSessions'> | null
) {
  const session = useQuery(
    api.sensorSessions.getWithSamples,
    sessionId ? { sessionId } : 'skip'
  )

  return {
    session,
    isLoading: sessionId !== null && session === undefined,
  }
}

/**
 * Type for sensor session list item
 */
export type SensorSessionListItem = NonNullable<
  ReturnType<typeof useConvexSensorSessions>['sessions']
>[number]

/**
 * Type for sensor session with samples
 */
export type SensorSessionWithSamples = NonNullable<
  ReturnType<typeof useConvexSensorSessionWithSamples>['session']
>
