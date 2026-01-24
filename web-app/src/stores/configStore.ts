import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Kart, Engine, Tyre, FinalDrive, RunConditions } from '@/types/config';

// Default values
const defaultKart: Kart = {
  id: 'kz2',
  name: 'KZ2',
  weight: 175,
  frontalArea: 0.5603,
  dragCoefficient: 0.89,
};

const defaultEngine: Engine = {
  id: 'kz-tm-kz10c',
  name: 'KZ - TM KZ10C',
  category: 'KZ',
  inertia: 0.0037986,
  gearbox: {
    primary: { input: 19, output: 75 },
    gears: [
      { input: 13, output: 33 },
      { input: 16, output: 29 },
      { input: 18, output: 27 },
      { input: 22, output: 27 },
      { input: 22, output: 23 },
      { input: 27, output: 25 },
    ],
  },
};

const defaultTyre: Tyre = {
  id: 'vega-xm-magnesio',
  name: 'Vega XM - Magnesio',
  diameter: 279.4,
  inertia: 0.0267,
  rollingCoeff1: 0.032,
  rollingCoeff2: 9.5e-6,
  rimType: 'magnesium',
};

const defaultFinalDrive: FinalDrive = {
  frontSprocket: 11,
  rearSprocket: 80,
};

const defaultRunConditions: RunConditions = {
  pressure: 1013,
  temperature: 20,
  humidity: 50,
  trackGrip: 0.8,
};

interface ConfigState {
  // Selected configurations
  kart: Kart;
  engine: Engine;
  tyre: Tyre;
  finalDrive: FinalDrive;
  runConditions: RunConditions;

  // Loaded preset lists
  karts: Kart[];
  engines: Engine[];
  tyres: Tyre[];

  // Custom (user-saved) configs
  customKarts: Kart[];
  customEngines: Engine[];
  customTyres: Tyre[];

  // Actions
  setKart: (kart: Kart) => void;
  setEngine: (engine: Engine) => void;
  setTyre: (tyre: Tyre) => void;
  setFinalDrive: (finalDrive: Partial<FinalDrive>) => void;
  setRunConditions: (conditions: Partial<RunConditions>) => void;

  // Preset loaders
  loadKarts: (karts: Kart[]) => void;
  loadEngines: (engines: Engine[]) => void;
  loadTyres: (tyres: Tyre[]) => void;

  // Custom config management
  addCustomKart: (kart: Kart) => void;
  addCustomEngine: (engine: Engine) => void;
  addCustomTyre: (tyre: Tyre) => void;
  setCustomKarts: (karts: Kart[]) => void;
  setCustomEngines: (engines: Engine[]) => void;
  setCustomTyres: (tyres: Tyre[]) => void;

  // Reset
  resetToDefaults: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // Initial state
      kart: defaultKart,
      engine: defaultEngine,
      tyre: defaultTyre,
      finalDrive: defaultFinalDrive,
      runConditions: defaultRunConditions,

      karts: [],
      engines: [],
      tyres: [],

      customKarts: [],
      customEngines: [],
      customTyres: [],

      // Actions
      setKart: (kart) => set({ kart }),
      setEngine: (engine) => set({ engine }),
      setTyre: (tyre) => set({ tyre }),
      setFinalDrive: (finalDrive) =>
        set((state) => ({ finalDrive: { ...state.finalDrive, ...finalDrive } })),
      setRunConditions: (conditions) =>
        set((state) => ({ runConditions: { ...state.runConditions, ...conditions } })),

      // Preset loaders
      loadKarts: (karts) => set({ karts }),
      loadEngines: (engines) => set({ engines }),
      loadTyres: (tyres) => set({ tyres }),

      // Custom configs
      addCustomKart: (kart) =>
        set((state) => ({ customKarts: [...state.customKarts, kart] })),
      addCustomEngine: (engine) =>
        set((state) => ({ customEngines: [...state.customEngines, engine] })),
      addCustomTyre: (tyre) =>
        set((state) => ({ customTyres: [...state.customTyres, tyre] })),
      setCustomKarts: (customKarts) => set({ customKarts }),
      setCustomEngines: (customEngines) => set({ customEngines }),
      setCustomTyres: (customTyres) => set({ customTyres }),

      // Reset
      resetToDefaults: () =>
        set({
          kart: defaultKart,
          engine: defaultEngine,
          tyre: defaultTyre,
          finalDrive: defaultFinalDrive,
          runConditions: defaultRunConditions,
        }),
    }),
    {
      name: 'engine-analysis-config',
      partialize: (state) => ({
        kart: state.kart,
        engine: state.engine,
        tyre: state.tyre,
        finalDrive: state.finalDrive,
        runConditions: state.runConditions,
        customKarts: state.customKarts,
        customEngines: state.customEngines,
        customTyres: state.customTyres,
      }),
    }
  )
);
