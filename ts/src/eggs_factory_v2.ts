import { EggInfo, DroppableNeftyInfoV2, NeftyCodeName } from './interfaces/types';
import eggsInfo from './deps/eggs_info.json';
import standardEggsInfo from './deps/standard_eggs_info.json';
import { DNAFactoryV2 as DNAFactory } from './dna_factory_v2';
import neftiesInfo from './deps/nefties_info.json';

export class EggsFactoryV2 {
  eggInfo: EggInfo;
  standardEggInfo: EggInfo;
  df: DNAFactory;
  constructor(eggPk: string, df: DNAFactory) {
    this.eggInfo = (eggsInfo as Record<string, EggInfo>)[eggPk];
    this.standardEggInfo = (standardEggsInfo as Record<string, EggInfo>)[eggPk];
    this.df = df;
  }

  static getAllEggs(): Record<string, EggInfo> {
    return eggsInfo as Record<string, EggInfo>;
  }

  static getAllStandardEggs(): Record<string, EggInfo> {
    return standardEggsInfo as Record<string, EggInfo>;
  }

  getDroppableNefties(): DroppableNeftyInfoV2[] {
    return this.eggInfo.archetypes.map((neftyCodeName) => {
      const r = {} as DroppableNeftyInfoV2;
      r.neftyCodeName = neftyCodeName;
      r.displayName = neftiesInfo.code_to_displayName[neftyCodeName] as string;
      return r;
    });
  }

  getDroppableStandardNefties(): DroppableNeftyInfoV2[] {
    return this.standardEggInfo.archetypes.map((neftyCodeName) => {
      const r = {} as DroppableNeftyInfoV2;
      r.neftyCodeName = neftyCodeName;
      r.displayName = neftiesInfo.code_to_displayName[neftyCodeName] as string;
      return r;
    });
  }

  hatch(): { archetypeKey: string; neftyCodeName: NeftyCodeName } {
    const droppableArchetypes = this.eggInfo.archetypes;
    const neftyCodeName = droppableArchetypes[Math.floor(Math.random() * droppableArchetypes.length)];
    const archetypeKey = this.df.getArchetypeKeyByNeftyCodeName(neftyCodeName);
    return { archetypeKey, neftyCodeName };
  }

  hatchStandard(): { archetypeKey: string; neftyCodeName: NeftyCodeName } {
    const droppableArchetypes = this.standardEggInfo.archetypes;
    const neftyCodeName = droppableArchetypes[Math.floor(Math.random() * droppableArchetypes.length)];
    const archetypeKey = this.df.getArchetypeKeyByNeftyCodeName(neftyCodeName);
    return { archetypeKey, neftyCodeName };
  }
}
