import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

/**
 * Hook for managing custom configurations with Convex
 * Provides real-time updates when configs change
 */
export function useConvexCustomConfigs() {
  const allConfigs = useQuery(api.customConfigs.getAllCustomConfigs)

  // Kart mutations
  const createKart = useMutation(api.customConfigs.createKart)
  const updateKart = useMutation(api.customConfigs.updateKart)
  const deleteKart = useMutation(api.customConfigs.deleteKart)

  // Engine mutations
  const createEngine = useMutation(api.customConfigs.createEngine)
  const updateEngine = useMutation(api.customConfigs.updateEngine)
  const deleteEngine = useMutation(api.customConfigs.deleteEngine)

  // Tyre mutations
  const createTyre = useMutation(api.customConfigs.createTyre)
  const updateTyre = useMutation(api.customConfigs.updateTyre)
  const deleteTyre = useMutation(api.customConfigs.deleteTyre)

  return {
    // All configs (undefined while loading)
    karts: allConfigs?.karts ?? [],
    engines: allConfigs?.engines ?? [],
    tyres: allConfigs?.tyres ?? [],
    isLoading: allConfigs === undefined,

    // Kart operations
    createKart,
    updateKart: async (
      kartId: Id<'customKarts'>,
      updates: Omit<Parameters<typeof updateKart>[0], 'kartId'>
    ) => {
      await updateKart({ kartId, ...updates })
    },
    deleteKart: async (kartId: Id<'customKarts'>) => {
      await deleteKart({ kartId })
    },

    // Engine operations
    createEngine,
    updateEngine: async (
      engineId: Id<'customEngines'>,
      updates: Omit<Parameters<typeof updateEngine>[0], 'engineId'>
    ) => {
      await updateEngine({ engineId, ...updates })
    },
    deleteEngine: async (engineId: Id<'customEngines'>) => {
      await deleteEngine({ engineId })
    },

    // Tyre operations
    createTyre,
    updateTyre: async (
      tyreId: Id<'customTyres'>,
      updates: Omit<Parameters<typeof updateTyre>[0], 'tyreId'>
    ) => {
      await updateTyre({ tyreId, ...updates })
    },
    deleteTyre: async (tyreId: Id<'customTyres'>) => {
      await deleteTyre({ tyreId })
    },
  }
}

/**
 * Types for custom configs from Convex
 */
export type CustomKart = NonNullable<
  ReturnType<typeof useConvexCustomConfigs>['karts']
>[number]

export type CustomEngine = NonNullable<
  ReturnType<typeof useConvexCustomConfigs>['engines']
>[number]

export type CustomTyre = NonNullable<
  ReturnType<typeof useConvexCustomConfigs>['tyres']
>[number]
