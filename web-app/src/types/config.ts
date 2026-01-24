// Kart configuration
export interface Kart {
  id: string;
  name: string;
  weight: number;           // kg (with driver)
  frontalArea: number;      // m²
  dragCoefficient: number;
}

// Engine configuration
export interface GearPair {
  input: number;
  output: number;
}

export interface Gearbox {
  primary: GearPair;
  gears: GearPair[];        // 1st through 7th gear
}

export interface Engine {
  id: string;
  name: string;
  category: string;
  inertia: number;          // kgm²
  gearbox: Gearbox;
}

// Tyre configuration
export interface Tyre {
  id: string;
  name: string;
  diameter: number;         // mm
  inertia: number;          // kgm²
  rollingCoeff1: number;
  rollingCoeff2: number;
  rimType: 'aluminum' | 'magnesium';
}

// Final drive configuration
export interface FinalDrive {
  frontSprocket: number;    // teeth count
  rearSprocket: number;     // teeth count
}

// Environmental/run conditions
export interface RunConditions {
  pressure: number;         // mbar
  temperature: number;      // °C
  humidity: number;         // %
  trackGrip: number;        // 0-1 scale
}

// Combined analysis configuration
export interface AnalysisConfig {
  kart: Kart;
  engine: Engine;
  tyre: Tyre;
  finalDrive: FinalDrive;
  runConditions: RunConditions;
}

// Results options
export interface ResultsOptions {
  minRpm: number;
  maxRpm: number;
  filterLevel: number;      // 0-100
}
