import { AbilityDictionary, Category, DNASchema, DNASchemaV4 } from './interfaces/types';

// you should multiply by 100 to get in %
export function getAverageFromRaw(numbers: number[], maxValuePerStat: number[]): number {
  const v =
    numbers.reduce((prev, curr, index) => {
      return prev + Math.round((curr / maxValuePerStat[index]) * 100);
    }, 0) / numbers.length;
  return v / 100;
}

// min and max included
export function randomInt(min: number, max: number, excludeMax = false): number {
  if (excludeMax) max -= 1;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export function getCategoryKeyFromName(name: string, categories: Record<string, Category>) {
  for (const categoryKey in categories) {
    if (categories[categoryKey].name === name) return categoryKey;
  }
  throw new Error(`Category with name "${name}" not found`);
}

export function getLatestSubversion(
  completeVersionsDict: Record<string, DNASchema | AbilityDictionary | DNASchemaV4>,
  schemaVersionInput?: string
): string {
  const schemaVersion = schemaVersionInput
    ? parseInt(schemaVersionInput) === 1
      ? '0'
      : `${parseInt(schemaVersionInput)}`
    : undefined;
  let completeVersion = undefined;
  let completeVersionSplit: string[] = [];

  for (const localCompleteVersion of Object.keys(completeVersionsDict)) {
    const localCompleteVersionSplit = localCompleteVersion.split('.');
    // We only want to find the latest subversion of this major version
    if (schemaVersion && parseInt(localCompleteVersionSplit[0]) !== parseInt(schemaVersion)) continue;
    if (!completeVersion) {
      completeVersion = localCompleteVersion;
      continue;
    }

    for (let index = 0; index < 3; index++) {
      if (completeVersionSplit[index] === localCompleteVersionSplit[index]) continue;
      else if (completeVersionSplit[index] > localCompleteVersionSplit[index]) break;
      completeVersion = localCompleteVersion;
      completeVersionSplit = localCompleteVersionSplit;
    }
  }

  if (!completeVersion) throw new Error(`No complete version found for ${schemaVersion}`);

  return completeVersion;
}

/**
 * Generate a random value that follows a normal distribution
 * min, max define the range of the returned random values
 * left and right limits allows to "flatten" the curve to have closer probabilities between the median values and min and max values
 * @param min the min number to be returned by the function
 * @param max the max number to be returned by the function
 * @param leftLimit the left range of the normal distribution curve
 * @param rightLimit the right range of the normal distribution curve
 * @returns random number
 */
export function randomNormal(min: number, max: number, leftLimit: number, rightLimit: number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0)
    return randomNormal(min, max, leftLimit, rightLimit); // resample between 0 and 1 if out of range
  else {
    num *= rightLimit - leftLimit; // Stretch to fill range
    num += leftLimit; // offset to leftLimit
    if (num <= min - 0.5 || num >= max + 0.5) return randomNormal(min, max, leftLimit, rightLimit);
  }
  return Math.round(num);
}

export function unpad(v: string, encodingBase: number | undefined): string {
  return parseInt(v, encodingBase).toString();
}

export function toPadded(n: string, maxLength: number, radix?: number): string {
  return parseInt(n).toString(radix).padStart(maxLength, '0');
}

/**
 * Converts a string representation of a number to a hexadecimal string
 * and pads it with leading zeros to ensure it has the specified length.
 * @example
 * _toPaddedHexa('255', 4); / Returns '00ff'
 */
export function toPaddedHexa(n: string, maxLength: number): string {
  return toPadded(n, maxLength, 16);
}

export function toUnPaddedHexa(n: string): string {
  return unpad(n, 16);
}
