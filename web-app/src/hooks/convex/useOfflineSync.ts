import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState, useCallback } from 'react'
import { db } from '@/lib/storage/db'
import type { Session } from '@/types/results'
import type { SensorSession } from '@/types/sensor'

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface PendingMutation {
  id: string
  type: 'session' | 'sensorSession' | 'customKart' | 'customEngine' | 'customTyre'
  action: 'create' | 'update' | 'delete'
  data: unknown
  timestamp: number
  retries: number
}

const PENDING_MUTATIONS_KEY = 'kart-code-pending-mutations'
const MAX_RETRIES = 3

/**
 * Hook for managing offline sync between IndexedDB and Convex
 * Queues mutations when offline and syncs when back online
 */
export function useOfflineSync() {
  const { isSignedIn } = useAuth()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [pendingCount, setPendingCount] = useState(0)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load pending mutations count
  useEffect(() => {
    const pending = getPendingMutations()
    setPendingCount(pending.length)
  }, [])

  // Sync when coming online
  useEffect(() => {
    if (isOnline && isSignedIn && pendingCount > 0) {
      syncPendingMutations()
    }
  }, [isOnline, isSignedIn, pendingCount])

  /**
   * Get pending mutations from localStorage
   */
  function getPendingMutations(): PendingMutation[] {
    try {
      const stored = localStorage.getItem(PENDING_MUTATIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * Save pending mutations to localStorage
   */
  function savePendingMutations(mutations: PendingMutation[]) {
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(mutations))
    setPendingCount(mutations.length)
  }

  /**
   * Queue a mutation for later sync
   */
  const queueMutation = useCallback(
    (mutation: Omit<PendingMutation, 'id' | 'timestamp' | 'retries'>) => {
      const pending = getPendingMutations()
      const newMutation: PendingMutation = {
        ...mutation,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        retries: 0,
      }
      pending.push(newMutation)
      savePendingMutations(pending)
    },
    []
  )

  /**
   * Process pending mutations
   */
  async function syncPendingMutations() {
    if (!isOnline || !isSignedIn) return

    setSyncStatus('syncing')
    const pending = getPendingMutations()
    const failed: PendingMutation[] = []

    for (const mutation of pending) {
      try {
        await processMutation(mutation)
      } catch (error) {
        console.error('Sync error:', error)
        if (mutation.retries < MAX_RETRIES) {
          failed.push({ ...mutation, retries: mutation.retries + 1 })
        }
      }
    }

    savePendingMutations(failed)
    setSyncStatus(failed.length > 0 ? 'error' : 'idle')
  }

  /**
   * Process a single mutation (to be implemented with Convex client)
   */
  async function processMutation(_mutation: PendingMutation) {
    // TODO: Implement when Convex is fully set up
    // This will call the appropriate Convex mutation based on type/action
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  /**
   * Save session to local storage with optional cloud sync queue
   */
  const saveSessionLocally = useCallback(
    async (session: Omit<Session, 'id'>, syncToCloud = true) => {
      const id = await db.sessions.add(session as Session)

      if (syncToCloud && !isOnline) {
        queueMutation({
          type: 'session',
          action: 'create',
          data: { ...session, localId: id },
        })
      }

      return id
    },
    [isOnline, queueMutation]
  )

  /**
   * Save sensor session to local storage with optional cloud sync queue
   */
  const saveSensorSessionLocally = useCallback(
    async (session: Omit<SensorSession, 'id'>, syncToCloud = true) => {
      const id = await db.sensorSessions.add(session as SensorSession)

      if (syncToCloud && !isOnline) {
        queueMutation({
          type: 'sensorSession',
          action: 'create',
          data: { ...session, localId: id },
        })
      }

      return id
    },
    [isOnline, queueMutation]
  )

  return {
    isOnline,
    isSignedIn: isSignedIn ?? false,
    syncStatus,
    pendingCount,

    // Force sync
    sync: syncPendingMutations,

    // Local-first operations
    saveSessionLocally,
    saveSensorSessionLocally,

    // Queue mutations when offline
    queueMutation,
  }
}

/**
 * Hook for checking if cloud sync is available
 */
export function useCloudSync() {
  const { isSignedIn } = useAuth()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isAvailable: isOnline && isSignedIn,
    isOnline,
    isSignedIn: isSignedIn ?? false,
  }
}
