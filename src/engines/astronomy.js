// Arithmetic and explanatory models, not a full historical astronomical simulator.
export const ARYABHATA_PI = ((100 + 4) * 8 + 62000) / 20000;

export function piErrorPercent() {
  return Math.abs(ARYABHATA_PI - Math.PI) / Math.PI * 100;
}

export function circumference(diameter, pi = ARYABHATA_PI) {
  if (!Number.isFinite(diameter) || diameter < 0) {
    throw new RangeError('Diameter must be non-negative and finite.');
  }
  return pi * diameter;
}

export function earthRotationDegrees(hours) {
  if (!Number.isFinite(hours)) throw new TypeError('Hours must be finite.');
  // Simplified 24-hour solar-day educational model.
  return (((hours % 24) + 24) % 24) * 15;
}
