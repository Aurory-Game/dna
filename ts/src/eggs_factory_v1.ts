import { EggInfo, Archetype, DroppableNeftyInfo } from './interfaces/types';
import eggsInfo from './deps/eggs_info_deprecated.json';
import standardEggsInfo from './deps/standard_eggs_info.json';
import { DNAFactoryV1 as DNAFactory } from './dna_factory_v1';
import { LAST_SUPPORTED_VERSION_BY_V1 } from './constants';

export class EggsFactoryV1 {
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

  getDroppableNefties(): DroppableNeftyInfo[] {
    return this.eggInfo.archetypes.map((neftyCodeName) => {
      const r: DroppableNeftyInfo = {} as DroppableNeftyInfo;
      Object.assign(r, this.df.getArchetypeByNeftyCodeName(neftyCodeName, LAST_SUPPORTED_VERSION_BY_V1));
      r.displayName = this.df.getDisplayNameFromCodeName(neftyCodeName);
      r.description = this.df.getFamilyDescription(r.archetype.fixed_attributes.family as string);
      return r;
    });
  }

  getDroppableStandardNefties(): DroppableNeftyInfo[] {
    return this.standardEggInfo.archetypes.map((neftyCodeName) => {
      const r: DroppableNeftyInfo = {} as DroppableNeftyInfo;
      Object.assign(r, this.df.getArchetypeByNeftyCodeName(neftyCodeName, LAST_SUPPORTED_VERSION_BY_V1));
      r.displayName = this.df.getDisplayNameFromCodeName(neftyCodeName);
      r.description = this.df.getFamilyDescription(r.archetype.fixed_attributes.family as string);
      return r;
    });
  }

  hatch(): { archetypeKey: string; archetype: Archetype } {
    const droppableArchetypes = this.eggInfo.archetypes;
    const neftyCodeName = droppableArchetypes[Math.floor(Math.random() * droppableArchetypes.length)];
    return this.df.getArchetypeByNeftyCodeName(neftyCodeName, LAST_SUPPORTED_VERSION_BY_V1);
  }

  hatchStandard(): { archetypeKey: string; archetype: Archetype } {
    const droppableArchetypes = this.standardEggInfo.archetypes;
    const neftyCodeName = droppableArchetypes[Math.floor(Math.random() * droppableArchetypes.length)];
    return this.df.getArchetypeByNeftyCodeName(neftyCodeName, LAST_SUPPORTED_VERSION_BY_V1);
  }
}
