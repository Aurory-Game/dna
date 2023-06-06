import { TACTICS_ADV_NAMES_MAP } from './constants';
import { DNASchemaReader } from './dna_schema_reader';
import {
  GeneWithValues,
  ParseDataAdv,
  ParseDataRangeCompleteness,
  AdvStatsJSON,
  ParseDataPerc,
} from './interfaces/types';

/**
 * Allow to pick a random number from an array, but in a deterministic way.
 * The same input array will produce the same output number.
 */
function deterministicRandomPicker(arr: number[]): number {
  const deterministicRandoms = arr.map((value, index, array) => {
    const prevIndex = index === 0 ? array.length - 1 : index - 1;
    const nextIndex = index === array.length - 1 ? 0 : index + 1;
    return (array[prevIndex] + array[nextIndex] + value) % array.length;
  });
  arr.sort((a, b) => {
    const indexA = arr.indexOf(a);
    const indexB = arr.indexOf(b);
    return deterministicRandoms[indexA] - deterministicRandoms[indexB];
  });
  return arr[0];
}

function removeGlitched(targetAverage: number, adventuresStatsOriginal: number[]): number[] {
  const adventuresStats = [...adventuresStatsOriginal];
  const maxNum = Math.max(...adventuresStats);
  const maxIndex = adventuresStats.indexOf(maxNum);
  adventuresStats[maxIndex] = 6;

  while (floorAverage(adventuresStats) !== targetAverage) {
    const validIndices = adventuresStats.reduce((indices, stat, index) => {
      if (stat !== 0 && index !== maxIndex) {
        indices.push(index);
      }
      return indices;
    }, [] as number[]);

    const indexToModify = deterministicRandomPicker(validIndices);
    adventuresStats[indexToModify] -= 1;
  }

  return adventuresStats;
}

function makeGlitched(targetAverage: number, adventuresStatsOriginal: number[]): number[] {
  const adventuresStats = adventuresStatsOriginal.map((num) => (num > 5 ? 5 : num));

  while (floorAverage(adventuresStats) !== targetAverage) {
    const validIndices = adventuresStats.reduce((indices, stat, index) => {
      if (stat !== 5) {
        indices.push(index);
      }
      return indices;
    }, [] as number[]);

    const indexToModify = deterministicRandomPicker(validIndices);
    adventuresStats[indexToModify] += 1;
  }

  return adventuresStats;
}

function makeSchimmering(targetAverage: number, adventuresStatsOriginal: number[]): number[] {
  const adventuresStats = adventuresStatsOriginal.map((num) => (num < 95 ? 95 : num));
  while (floorAverage(adventuresStats) !== targetAverage) {
    const validIndices = adventuresStats.reduce((indices, stat, index) => {
      if (stat !== 95) {
        indices.push(index);
      }
      return indices;
    }, [] as number[]);

    const indexToModify = deterministicRandomPicker(validIndices);
    adventuresStats[indexToModify] -= 1;
  }

  return adventuresStats;
}

function removeSchimmering(targetAverage: number, adventuresStatsOriginal: number[]): number[] {
  const adventuresStats = [...adventuresStatsOriginal];
  const min = Math.min(...adventuresStats);
  const minIndex = adventuresStats.indexOf(min);
  adventuresStats[minIndex] = 94;

  while (floorAverage(adventuresStats) !== targetAverage) {
    const validIndices = adventuresStats.reduce((indices, stat, index) => {
      if (stat !== 100 && index !== minIndex) {
        indices.push(index);
      }
      return indices;
    }, [] as number[]);

    const indexToModify = deterministicRandomPicker(validIndices);
    adventuresStats[indexToModify] += 1;
  }

  return adventuresStats;
}

function floorAverage(stats: number[]): number {
  return Math.floor(stats.reduce((sum, stat) => sum + Math.round(stat), 0) / stats.length);
}

function tacticsStatsObjToArr(tacticsStats: ParseDataRangeCompleteness): number[] {
  return [
    tacticsStats.hp,
    tacticsStats.initiative,
    tacticsStats.atk,
    tacticsStats.def,
    tacticsStats.eatk,
    tacticsStats.edef,
  ];
}

function advArrToObj(advArr: number[]): ParseDataPerc {
  return {
    vitality: advArr[0],
    speed: advArr[1],
    power: advArr[2],
    defense: advArr[3],
  };
}

function convertStats(tacticsStats: ParseDataRangeCompleteness): ParseDataPerc {
  const floorAvgGame1 = floorAverage(tacticsStatsObjToArr(tacticsStats));
  const hpGame2 = Math.round(tacticsStats.hp);
  const powerGame2 = Math.round((tacticsStats.atk + tacticsStats.eatk) / 2);
  const defenseGame2 = Math.round((tacticsStats.def + tacticsStats.edef) / 2);
  const initiativeGame2 = Math.round(tacticsStats.initiative);
  let adventuresStats = [hpGame2, initiativeGame2, powerGame2, defenseGame2];

  while (floorAverage(adventuresStats) !== floorAvgGame1) {
    const diff = floorAvgGame1 - floorAverage(adventuresStats);
    adventuresStats = adventuresStats.map((stat) => Math.round(Math.min(Math.max(stat + diff, 0), 100)));
  }

  return advArrToObj(adventuresStats);
}

function fixGlitchedSchimmering(
  tacticsStatsObj: ParseDataRangeCompleteness,
  adventuresStatsObj: ParseDataPerc
): ParseDataPerc {
  const tacticsStats = tacticsStatsObjToArr(tacticsStatsObj);
  const floorAvgGame1 = floorAverage(tacticsStats);
  const adventuresStats = Object.values(adventuresStatsObj);
  const isGlitched1 = tacticsStats.every((stat) => stat <= 5);
  const isSchimmering1 = tacticsStats.every((stat) => stat >= 95);
  const isGlitched2 = adventuresStats.every((stat) => stat <= 5);
  const isSchimmering2 = adventuresStats.every((stat) => stat >= 95);

  let adventuresStatsCorrected;
  if (isGlitched1 === isGlitched2 && isSchimmering1 === isSchimmering2) {
    return adventuresStatsObj;
  } else if (isGlitched1 !== isGlitched2) {
    if (isGlitched1) {
      adventuresStatsCorrected = makeGlitched(floorAvgGame1, adventuresStats);
    }
    adventuresStatsCorrected = removeGlitched(floorAvgGame1, adventuresStats);
  } else if (isSchimmering1) adventuresStatsCorrected = makeSchimmering(floorAvgGame1, adventuresStats);
  else adventuresStatsCorrected = removeSchimmering(floorAvgGame1, adventuresStats);
  return advArrToObj(adventuresStatsCorrected);
}

export function getAdventuresStats(dnaSchemaReader: DNASchemaReader, adventuresStats: AdvStatsJSON): ParseDataAdv {
  const tacticsStats: any = {};
  dnaSchemaReader.getCompletenessGenes().forEach((gene: GeneWithValues) => {
    tacticsStats[gene.name] = Math.round((gene.completeness as number) * 100);
  });
  const adventureStats = convertStats(tacticsStats);
  const fixedStats = fixGlitchedSchimmering(tacticsStats, adventureStats);

  const advName = TACTICS_ADV_NAMES_MAP[dnaSchemaReader.archetype.fixed_attributes.name];
  const advStatsRanges = adventuresStats.nefties[advName];
  const statsNameMap: Record<keyof typeof fixedStats, keyof typeof advStatsRanges> = {
    vitality: 'Health',
    power: 'Power',
    defense: 'Defense',
    speed: 'Speed',
  };

  Object.keys(fixedStats).forEach((key) => {
    const { min, max } = advStatsRanges[statsNameMap[key as keyof typeof fixedStats]];
    (fixedStats as ParseDataAdv)[`${key}Computed` as keyof ParseDataAdv] = Math.round(
      (fixedStats[key as keyof typeof fixedStats] / 100) * (max - min) + min
    );
  });

  return fixedStats as ParseDataAdv;
}
