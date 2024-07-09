import { TACTICS_ADV_NAMES_MAP } from './constants';
import { DNASchemaReader } from './dna_schema_reader';
import {
  GeneWithValues,
  ParseDataAdv,
  ParseDataRangeCompleteness,
  AdvStatsJSON,
  ParseDataPerc,
  AdvStatsJSONValue,
  NeftyCodeName,
} from './interfaces/types';

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
    hp: advArr[0],
    atk: advArr[1],
    def: advArr[2],
    speed: advArr[3],
  };
}

function convertStats(tacticsStats: ParseDataRangeCompleteness): ParseDataPerc {
  const floorAvgGame1 = floorAverage(tacticsStatsObjToArr(tacticsStats));
  const hpGame2 = Math.round(tacticsStats.hp);
  const atkGame2 = Math.round((tacticsStats.atk + tacticsStats.eatk) / 2);
  const defenseGame2 = Math.round((tacticsStats.def + tacticsStats.edef) / 2);
  const speedGame2 = Math.round(tacticsStats.initiative);
  let adventuresStats = [hpGame2, atkGame2, defenseGame2, speedGame2];

  while (floorAverage(adventuresStats) !== floorAvgGame1) {
    const diff = floorAvgGame1 - floorAverage(adventuresStats);
    adventuresStats = adventuresStats.map((stat) => Math.round(Math.min(Math.max(stat + diff, 0), 100)));
  }

  return advArrToObj(adventuresStats);
}

export function getAdventuresStats(dnaSchemaReader: DNASchemaReader, adventuresStats: AdvStatsJSON): ParseDataAdv {
  const tacticsStats: Partial<ParseDataRangeCompleteness> = {};
  dnaSchemaReader.getCompletenessGenes().forEach((gene: GeneWithValues) => {
    tacticsStats[gene.name as keyof ParseDataRangeCompleteness] = Math.round((gene.completeness as number) * 100);
  });
  const fixedStats = convertStats(tacticsStats as ParseDataRangeCompleteness);
  const neftieName = TACTICS_ADV_NAMES_MAP[dnaSchemaReader.archetype.fixed_attributes.name as NeftyCodeName];
  const advStatsRanges = adventuresStats.nefties[neftieName];
  Object.keys(fixedStats).forEach((key) => {
    const min = advStatsRanges[`${key}Min` as keyof AdvStatsJSONValue];
    const max = advStatsRanges[`${key}Max` as keyof AdvStatsJSONValue];
    (fixedStats as ParseDataAdv)[`${key}Computed` as keyof ParseDataAdv] = Math.round(
      (fixedStats[key as keyof typeof fixedStats] / 100) * (max - min) + min
    );
  });

  return fixedStats as ParseDataAdv;
}
