/**
 * Environmental corrections for air density calculation
 * Used to adjust drag force calculations based on ambient conditions
 */

// Constants
const R_DRY = 287.05; // Gas constant for dry air (J/(kg·K))
const R_VAPOR = 461.495; // Gas constant for water vapor (J/(kg·K))

/**
 * Calculate saturation vapor pressure using Magnus formula
 * @param temperature - Temperature in Celsius
 * @returns Saturation vapor pressure in Pa
 */
function saturationVaporPressure(temperature: number): number {
  // Magnus formula coefficients
  const a = 17.27;
  const b = 237.7;
  return 610.78 * Math.exp((a * temperature) / (b + temperature));
}

/**
 * Calculate air density based on environmental conditions
 * @param pressure - Atmospheric pressure in mbar
 * @param temperature - Temperature in Celsius
 * @param humidity - Relative humidity in percentage (0-100)
 * @returns Air density in kg/m³
 */
export function calculateAirDensity(
  pressure: number,
  temperature: number,
  humidity: number
): number {
  // Convert units
  const pressurePa = pressure * 100; // mbar to Pa
  const temperatureK = temperature + 273.15; // Celsius to Kelvin
  const relativeHumidity = humidity / 100; // percentage to decimal

  // Calculate partial pressure of water vapor
  const pSat = saturationVaporPressure(temperature);
  const pVapor = relativeHumidity * pSat;

  // Calculate partial pressure of dry air
  const pDry = pressurePa - pVapor;

  // Calculate air density using ideal gas law for humid air
  const density = (pDry / (R_DRY * temperatureK)) + (pVapor / (R_VAPOR * temperatureK));

  return density;
}

/**
 * Standard atmosphere air density at sea level (ISA conditions)
 * 15°C, 1013.25 mbar, 0% humidity
 */
export const STANDARD_AIR_DENSITY = 1.225; // kg/m³

/**
 * Calculate correction factor for power based on air density
 * Higher density = more drag = higher indicated power
 * @param actualDensity - Current air density
 * @returns Correction factor (multiply power by this to normalize)
 */
export function airDensityCorrectionFactor(actualDensity: number): number {
  return STANDARD_AIR_DENSITY / actualDensity;
}
