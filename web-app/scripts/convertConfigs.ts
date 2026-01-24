/**
 * Convert .cbd configuration files to JSON
 * Run with: npx tsx scripts/convertConfigs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, '../../');
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseCBD(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove surrounding quotes if present
      if (line.startsWith('"') && line.endsWith('"')) {
        return line.slice(1, -1);
      }
      return line;
    });
}

function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.cbd$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface Engine {
  id: string;
  name: string;
  category: string;
  inertia: number;
  gearbox: {
    primary: { input: number; output: number };
    gears: { input: number; output: number }[];
  };
}

function convertEngines(): Engine[] {
  const engineDir = path.join(BASE_DIR, 'engine');
  const engines: Engine[] = [];

  for (const file of fs.readdirSync(engineDir)) {
    if (!file.endsWith('.cbd')) continue;

    const content = fs.readFileSync(path.join(engineDir, file), 'utf8');
    const values = parseCBD(content);

    const name = file.replace('.cbd', '');
    let category = 'Other';

    if (name.includes('60 MINI') || name.includes('60 Baby')) category = '60cc';
    else if (name.includes('KZ')) category = 'KZ';
    else if (name.includes('OK')) category = 'OK';
    else if (name.includes('OKJ')) category = 'OKJ';
    else if (name.includes('Rotax')) category = 'Rotax';
    else if (name.includes('Iame') || name.includes('X30')) category = 'Iame';
    else if (name.includes('Vortex') || name.includes('Rok')) category = 'Vortex';
    else if (name.includes('Easy Kart')) category = 'EasyKart';
    else if (name.includes('Cadet') || name.includes('Young')) category = 'Cadet';

    // Parse gear values - format is: inertia, primary_in, primary_out, gear1_in, gear1_out, ...
    const gears: { input: number; output: number }[] = [];
    for (let i = 3; i < values.length - 1; i += 2) {
      const input = parseInt(values[i]);
      const output = parseInt(values[i + 1]);
      if (input && output && input > 0 && output > 0) {
        gears.push({ input, output });
      }
    }

    engines.push({
      id: toId(name),
      name,
      category,
      inertia: parseFloat(values[0]) || 0.003,
      gearbox: {
        primary: {
          input: parseInt(values[1]) || 1,
          output: parseInt(values[2]) || 1
        },
        gears
      }
    });
  }

  return engines.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

interface Kart {
  id: string;
  name: string;
  category: string;
  weight: number;
  frontalArea: number;
  dragCoefficient: number;
}

function convertKarts(): Kart[] {
  const kartDir = path.join(BASE_DIR, 'kart');
  const karts: Kart[] = [];

  for (const file of fs.readdirSync(kartDir)) {
    if (!file.endsWith('.cbd')) continue;

    const content = fs.readFileSync(path.join(kartDir, file), 'utf8');
    const values = parseCBD(content);

    const name = file.replace('.cbd', '');
    let category = 'Other';

    if (name.includes('60')) category = '60cc';
    else if (name.includes('KZ')) category = 'KZ';
    else if (name.includes('OK')) category = 'OK';
    else if (name.includes('Rotax')) category = 'Rotax';
    else if (name.includes('Iame') || name.includes('X30')) category = 'Iame';
    else if (name.includes('Vortex') || name.includes('Rok')) category = 'Vortex';
    else if (name.includes('Easy Kart')) category = 'EasyKart';
    else if (name.includes('Cadet') || name.includes('Young') || name.includes('KA')) category = 'Cadet/Junior';

    karts.push({
      id: toId(name),
      name,
      category,
      weight: parseFloat(values[0]) || 175,
      frontalArea: parseFloat(values[1]) || 0.5784,
      dragCoefficient: parseFloat(values[2]) || 0.804
    });
  }

  return karts.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

interface Tyre {
  id: string;
  name: string;
  brand: string;
  diameter: number;
  inertia: number;
  rollingCoeff1: number;
  rollingCoeff2: number;
  rimType: 'aluminum' | 'magnesium';
}

function convertTyres(): Tyre[] {
  const tyreDir = path.join(BASE_DIR, 'tyre');
  const tyres: Tyre[] = [];

  for (const file of fs.readdirSync(tyreDir)) {
    if (!file.endsWith('.cbd')) continue;

    const content = fs.readFileSync(path.join(tyreDir, file), 'utf8');
    const values = parseCBD(content);

    const name = file.replace('.cbd', '');
    const rimType = name.toLowerCase().includes('magnesio') ? 'magnesium' : 'aluminum';

    let brand = 'Other';
    if (name.includes('Vega')) brand = 'Vega';
    else if (name.includes('Mojo')) brand = 'Mojo';
    else if (name.includes('Bridgestone')) brand = 'Bridgestone';
    else if (name.includes('Lecont')) brand = 'Lecont';
    else if (name.includes('Komet')) brand = 'Komet';
    else if (name.includes('Dunlop')) brand = 'Dunlop';

    tyres.push({
      id: toId(name),
      name,
      brand,
      diameter: parseFloat(values[0]) || 280,
      inertia: parseFloat(values[1]) || 0.027,
      rollingCoeff1: parseFloat(values[2]) || 0.03,
      rollingCoeff2: parseFloat(values[3]) || 0.00001,
      rimType
    });
  }

  return tyres.sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.name.localeCompare(b.name);
  });
}

// Channel mappings for auto-detection
const channelMappings = {
  time: [
    'Time', 'time', 'Time(sec)', 'Time_s', 'RunningLapTime', 'Lap Time',
    'lap time [s]', 'Time [s]'
  ],
  distance: [
    'Distance', 'distance', 'Space', 'space', 'Lap Distance[m]', 'GPS_Distance',
    'GPS Distance'
  ],
  speed: [
    'GPS_Speed', 'Speed', 'SpeedGPS', 'GPS Speed', 'SPEEDG_Kph', 'V_Front',
    'speed', 'XKart Speed[kph]', 'GPS_Speed[km/h]', 'GPS Speed[km/h]'
  ],
  rpm: [
    'RPM', 'Engine', 'Rpm', 'rpm', 'engine speed', 'XKart RPM[rpm]', 'RPM_F',
    'Engine Speed', 'Engine RPM'
  ],
  latAcc: [
    'GPS_LatAcc', 'A. Lat.', 'Ay', 'acc_lat', 'GX[G]', 'ACC_CG_NF', 'GPS Lat.',
    'Lateral Acc', 'Lat Acc', 'LatAcc'
  ],
  lonAcc: [
    'GPS_LonAcc', 'A. Long.', 'Ax', 'acc_lon', 'GY[G]', 'ACC_X', 'GPS Long.',
    'Longitudinal Acc', 'Lon Acc', 'LonAcc'
  ],
  slope: [
    'GPS_Slope', 'slope', 'Slope', 'Track Slope'
  ],
  tempHead: [
    'temp_head', 'Head Temp', 'HeadTemp', 'Temperature 1', 'Temp1', 'CHT',
    'Cylinder Head Temp'
  ],
  tempCool: [
    'temp_cool', 'Water Temp', 'WaterTemp', 'Coolant', 'Temperature 2', 'Temp2',
    'Coolant Temp', 'Water'
  ],
  tempExhaust: [
    'temp_exhaust', 'Exhaust Temp', 'ExhaustTemp', 'EGT', 'Exhaust Gas Temp',
    'Temperature 3', 'Temp3'
  ],
  lambda: [
    'lambda', 'Lambda', 'AFR', 'Air Fuel Ratio', 'Lambda_Temp', 'O2'
  ],
  throttle: [
    'Throttle', 'throttle', 'TPS', 'Throttle Position', 'PosAcceleratore',
    'Accelerator'
  ],
  lap: [
    'Lap', 'lap', 'Lap Number', 'LAP', 'Lap #'
  ],
  latitude: [
    'Latitude', 'latitude', 'lat', 'x_gps', 'GPS_Lat', 'LATITUDE_deg'
  ],
  longitude: [
    'Longitude', 'longitude', 'lon', 'y_gps', 'GPS_Lon', 'LONGITUDE_deg'
  ],
  altitude: [
    'Altitude', 'altitude', 'GPS_Altitude', 'ANTALT_m', 'Alt'
  ]
};

// Main execution
console.log('Converting configuration files...\n');

const engines = convertEngines();
console.log(`Converted ${engines.length} engines`);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'engines.json'),
  JSON.stringify({ engines }, null, 2)
);

const karts = convertKarts();
console.log(`Converted ${karts.length} karts`);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'karts.json'),
  JSON.stringify({ karts }, null, 2)
);

const tyres = convertTyres();
console.log(`Converted ${tyres.length} tyres`);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'tyres.json'),
  JSON.stringify({ tyres }, null, 2)
);

console.log(`Saving channel mappings`);
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'channelMappings.json'),
  JSON.stringify({ channelMappings }, null, 2)
);

console.log('\nDone! Files written to public/data/');
