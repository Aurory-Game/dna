import { AbilityDictionary, Category, DNASchema } from './interfaces/types';

// you should multiply by 100 to get in %
export function getAverageFromRaw(numbers: number[], maxValuePerStat: number[]): number {
  return numbers.reduce((prev, curr, index) => prev + curr / maxValuePerStat[index], 0) / numbers.length;
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
  completeVersionsDict: Record<string, DNASchema | AbilityDictionary>,
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
