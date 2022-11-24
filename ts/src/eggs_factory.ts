import { EggInfo, Archetype, DroppableNeftyInfo } from './interfaces/types';
import eggsInfo from './deps/eggs_info.json';
import { DNAFactory } from './dna_factory';

export class EggsFactory {
  eggInfo: EggInfo;
  df: DNAFactory;
  constructor(eggPk: string, df: DNAFactory) {
    this.eggInfo = (eggsInfo as Record<string, EggInfo>)[eggPk];
    this.df = df;
  }

  static getAllEggs(): Record<string, EggInfo> {
    return eggsInfo;
  }

  getDroppableNefties(): DroppableNeftyInfo[] {
    return this.eggInfo.archetypes.map((neftyCodeName) => {
      const r: DroppableNeftyInfo = {} as DroppableNeftyInfo;
      Object.assign(r, this.df.getArchetypeByNeftyCodeName(neftyCodeName));
      r.displayName = this.df.getDisplayNameFromCodeName(neftyCodeName);
      r.description = this.df.getFamilyDescription(r.archetype.fixed_attributes.family as string);
      return r;
    });
  }

  hatch(): { archetypeKey: string; archetype: Archetype } {
    const droppableArchetypes = this.eggInfo.archetypes;
    const neftyCodeName = droppableArchetypes[Math.floor(Math.random() * droppableArchetypes.length)];
    return this.df.getArchetypeByNeftyCodeName(neftyCodeName);
  }
}
