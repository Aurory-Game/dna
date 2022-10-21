import { EggInfo, Archetype } from './interfaces/types';
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

  getDroppableNefties(): { archetypeKey: string; archetype: Archetype }[] {
    return this.eggInfo.archetypes.map((neftyCodeName) => this.df.getArchetypeByNeftyCodeName(neftyCodeName));
  }

  hatch(): { archetypeKey: string; archetype: Archetype } {
    const droppableArchetypes = this.eggInfo.archetypes;
    const neftyCodeName = droppableArchetypes[Math.floor(Math.random() * droppableArchetypes.length)];
    return this.df.getArchetypeByNeftyCodeName(neftyCodeName);
  }
}
