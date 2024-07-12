import {
  Grade,
  Rarity,
  version,
  DNASchemaV4,
  DnaDataV2,
  ParseDataPerc,
  NeftyCodeName,
  ParseV2,
  DnaDataData,
  ParseDataComputed,
  AdvStatsJSON,
  AdvStatsJSONValue,
  Parse,
  RarityDistribution,
  NeftieInfo,
} from './interfaces/types';
import { LATEST_VERSION as LATEST_SCHEMA_VERSION } from './deps/schemas/latest';
import { LATEST_VERSION as LATEST_ADVENTURES_STATS_VERSION } from './deps/schemas/adventures/latest';
import dnaSchemaV4_0 from './deps/schemas/aurory_dna_v4.0.0.json';
import { getAverageFromRaw, getLatestSubversion, randomInt, randomNormal, toPaddedHexa } from './utils';
import { N_STATS_SOT, TACTICS_ADV_NAMES_MAP, VERSION_LENGTH } from './constants';
import { DNAFactoryV1 } from './dna_factory_v1';
import adventuresStatsV0_0_6 from './deps/schemas/adventures/v0.0.6.json';
import { compressToBase64, decompressFromBase64 } from 'lz-string';
import neftiesInfo from './deps/nefties_info.json';
import raritiesJson from './deps/rarities.json';

const dnaSchemas: Record<version, DNASchemaV4> = {
  '4.0.0': dnaSchemaV4_0 as DNASchemaV4,
};

const adventuresStats: Record<version, AdvStatsJSON> = {
  '0.0.6': adventuresStatsV0_0_6,
};

export class DNAFactoryV2 {
  private latestSchemasSubversions: Record<version, version>;
  private codeNameToKey: Record<NeftyCodeName, string>;
  constructor() {
    this.latestSchemasSubversions = {};
    this.codeNameToKey = {} as Record<NeftyCodeName, string>;
    Object.entries(this.getDNASchema(LATEST_SCHEMA_VERSION).archetypes).forEach(([key, codename]) => {
      this.codeNameToKey[codename as NeftyCodeName] = key;
    });
  }

  // get latest minor version from a major version
  private getLatestSchemaSubversion(schemaVersion?: string): string {
    if (!schemaVersion) return LATEST_SCHEMA_VERSION;
    else if (schemaVersion?.includes('.')) return schemaVersion;
    else if (schemaVersion && this.latestSchemasSubversions[schemaVersion])
      return this.latestSchemasSubversions[schemaVersion];
    const completeVersion = getLatestSubversion(dnaSchemas, schemaVersion);
    this.latestSchemasSubversions[schemaVersion] = completeVersion;
    return completeVersion;
  }

  private _getRandomRarity(grade: Grade): Rarity {
    const rarities = raritiesJson[grade];
    if (!rarities) {
      throw new Error(`No rarity found for input ${grade}`);
    }
    const precision = 3;
    const multiplier = Math.pow(10, precision);
    const weightsSum = Object.values(rarities).reduce((acc, rarity) => acc + rarity.probability * multiplier, 0);
    const random = Math.random() * weightsSum;
    let total = 0;
    for (const [rarity, rarityInfo] of Object.entries(rarities)) {
      total += rarityInfo.probability * multiplier;
      if (random <= total) return rarity as Rarity;
    }
    throw new Error(`No rarity found: ${weightsSum}, ${random}`);
  }

  getDNASchema(version?: version): DNASchemaV4 {
    if (!version) return dnaSchemas[LATEST_SCHEMA_VERSION];
    else if (dnaSchemas[version]) return dnaSchemas[version];
    else if (this.latestSchemasSubversions[version]) return dnaSchemas[this.latestSchemasSubversions[version]];

    const completeVersion = version.includes('.') ? version : this.getLatestSchemaSubversion(version);

    if (!completeVersion) throw new Error(`No schema found for ${version}`);

    const dnaSchema: DNASchemaV4 = dnaSchemas[completeVersion];
    if (completeVersion !== dnaSchema.version)
      throw new Error(`Versions mismatch: ${completeVersion} (filename) vs ${dnaSchema.version} (schema)`);
    return dnaSchemas[completeVersion];
  }

  private serializeDna(data: DnaDataV2): string {
    return compressToBase64(JSON.stringify(data));
  }

  private deserializeDna(dna: string): DnaDataV2 {
    return JSON.parse(decompressFromBase64(dna)) as DnaDataV2;
  }

  private getDna(version: version, data: DnaDataV2): string {
    const versionDNAFormat = toPaddedHexa(version, 4);
    const serializedData = this.serializeDna(data);
    const dna = versionDNAFormat + serializedData;
    return dna;
  }

  /**
   * Generate statsCount number of stats with a mean value in the rarity range.
   * @param rarity Rarity
   * @param statsCount Number of stats to generate
   */
  private _generateStatsForRarity(nStats: number, grade: Grade, rarity: Rarity): number[] {
    const [minStatAvg, maxStatAvg] = raritiesJson[grade][rarity].average_stats_range;
    const stats = Array.from(Array(nStats).keys()).map(() => 0);

    const mean = randomInt(minStatAvg, maxStatAvg, true);
    // adding up to 5 will still result in the same mean as we are rounding down
    const totalPoints = mean * nStats;
    const maxValuePerStat = 100;

    // As 100 is the upper limit, this value is over represented in the distribution
    // This makes the max random stat randomly set to a value between mean + 1 and 100
    const maxStatValue = randomInt(Math.min(mean + 1, maxValuePerStat), maxValuePerStat, false);

    const distributePoints = () => {
      while (pointsLeft) {
        const statIndex = randomInt(0, stats.length, true);
        const statValue = stats[statIndex];

        const maxPoints = Math.min(pointsLeft, maxStatValue - statValue);
        if (!maxPoints) continue;
        if (pointsLeft < 0) throw new Error('pointsLeft < 0');
        const points = randomNormal(1, Math.ceil(maxPoints / stats.length), -100, 200);
        stats[statIndex] += points;
        pointsLeft -= points;
      }
    };

    let pointsLeft = totalPoints;
    let raw = [] as number[];
    let average;

    while (pointsLeft) {
      distributePoints();
      raw = stats.map((stat) => Math.round((stat / 100) * maxValuePerStat));

      average = Math.floor(
        getAverageFromRaw(
          raw,
          stats.map(() => maxValuePerStat)
        ) * 100
      );

      // the average is done on raw stats but points are distributed on the % stats. It may happen the means are not the same.
      if (Math.floor(average) !== mean) pointsLeft += 1;
    }

    // if average = 1 for a non glitched or 95 for a schimmering, we may end up not enterring in the previous loop
    if (!raw.length) raw = stats.map((stat) => Math.round((stat / 100) * maxValuePerStat));
    return raw;
  }

  private computeSOTStats(neftyCodeName: NeftyCodeName, dataAdv: ParseDataPerc): ParseDataComputed {
    const neftyCodenameId = TACTICS_ADV_NAMES_MAP[neftyCodeName];
    const computed = {} as ParseDataComputed;
    const sotStatsCurrent = adventuresStats[LATEST_ADVENTURES_STATS_VERSION].nefties[neftyCodenameId];
    if (!sotStatsCurrent) {
      throw new Error(`No SOT stats found for ${neftyCodenameId}`);
    }
    Object.entries(dataAdv).forEach(([statName, percentage]) => {
      const key = `${statName}Computed` as keyof ParseDataComputed;
      const minK = `${statName}Min` as keyof AdvStatsJSONValue;
      const min = sotStatsCurrent[minK];
      const maxK = `${statName}Max` as keyof AdvStatsJSONValue;
      const max = sotStatsCurrent[maxK];
      const value = (percentage / 100) * (max - min) + min;
      computed[key] = Math.round(value);
    });
    return computed;
  }

  private validateArchetypeIndex(archetypeIndex: string) {
    if (!Number.isInteger(parseInt(archetypeIndex))) {
      throw new Error(`Invalid archetype index: ${archetypeIndex}`);
    }
  }

  private initializeDnaData(version: string): DnaDataV2 {
    const dnaData = {} as DnaDataV2;
    dnaData.version = version;
    return dnaData;
  }

  private createDataData(
    dnaSchema: DNASchemaV4,
    archetypeIndex: string,
    grade: Grade,
    rarityPreset?: Rarity
  ): DnaDataData {
    const dataData = {} as DnaDataData;
    dataData.grade = grade;
    dataData.rarity = rarityPreset ?? this._getRandomRarity(grade);
    dataData.neftyCodeName = dnaSchema.archetypes[archetypeIndex] as NeftyCodeName;
    if (!dataData.neftyCodeName) {
      throw new Error(`No archetype found for index ${archetypeIndex}`);
    }
    return dataData;
  }

  private createDataDataFromV1(dataV1: Parse): DnaDataData {
    const dataData = {} as DnaDataData;
    dataData.grade = dataV1.data.grade;
    dataData.rarity = dataV1.data.rarity;
    dataData.neftyCodeName = dataV1.archetype.fixed_attributes.name as NeftyCodeName;
    return dataData;
  }

  private createDataAdv(stats: number[]): ParseDataPerc {
    const [hp, atk, def, speed] = stats;
    const dataAdv = {} as ParseDataPerc;
    Object.assign(dataAdv, { hp, atk, def, speed });
    return dataAdv;
  }

  private createDataAdvFromV1(stats: ParseDataPerc): ParseDataPerc {
    const { hp, atk, def, speed } = stats;
    const dataAdv = {} as ParseDataPerc;
    Object.assign(dataAdv, { hp, atk, def, speed });
    return dataAdv;
  }

  getAdventureStatsSchema(version: string = LATEST_ADVENTURES_STATS_VERSION): AdvStatsJSON {
    return adventuresStats[version];
  }

  getArchetypeKeyByNeftyCodeName(neftyCodeName: NeftyCodeName): string {
    const archetypeKey = this.codeNameToKey[neftyCodeName];
    if (!archetypeKey) {
      throw new Error(`No archetype found for ${neftyCodeName}`);
    }
    return archetypeKey;
  }

  getNeftiesInfo(): NeftieInfo {
    return neftiesInfo;
  }

  getRarityDistribution(): RarityDistribution {
    return raritiesJson;
  }

  /**
   * Returns rarity from stats average
   * @param statsAverage average of all stats, from 0 to 100;
   */
  getRarityFromStatsAvg(statsAverage: number, raiseErrorOnNotFound = true, grade: Grade): Rarity | null {
    const rarity = Object.entries(raritiesJson[grade]).find(([, rarityInfo]) => {
      return (
        statsAverage >= rarityInfo.average_stats_range[0] &&
        ((statsAverage === 100 && statsAverage === rarityInfo.average_stats_range[1]) ||
          statsAverage < rarityInfo.average_stats_range[1])
      );
    });
    if (!rarity) {
      if (raiseErrorOnNotFound) throw new Error(`Rarity not found for stats average ${statsAverage}`);
      else return null;
    }
    return rarity[0] as Rarity;
  }

  parse(dnaString: string): ParseV2 {
    // const majorVersion = toUnPaddedHexa(dnaString.slice(0, VERSION_LENGTH));
    const dataRaw = this.deserializeDna(dnaString.slice(VERSION_LENGTH));
    const dataAdv = Object.assign(
      {},
      dataRaw.dataAdv,
      this.computeSOTStats(dataRaw.data.neftyCodeName, dataRaw.dataAdv)
    );
    const displayName = neftiesInfo.code_to_displayName[dataRaw.data.neftyCodeName];
    const data = Object.assign(dataRaw.data, { displayName });
    const parsed: ParseV2 = Object.assign({ version: dataRaw.version }, { dataAdv, dataRaw, data });
    return parsed;
  }

  generateNeftyDNA(archetypeIndex: string, grade: Grade, version?: string, rarityPreset?: Rarity) {
    this.validateArchetypeIndex(archetypeIndex);
    const dnaSchema = this.getDNASchema(version ?? LATEST_SCHEMA_VERSION);

    const dnaData = this.initializeDnaData(dnaSchema.version);
    dnaData.data = this.createDataData(dnaSchema, archetypeIndex, grade, rarityPreset);

    const stats = this._generateStatsForRarity(N_STATS_SOT, grade, dnaData.data.rarity);
    dnaData.dataAdv = this.createDataAdv(stats);

    return this.getDna(dnaSchema.version, dnaData);
  }

  generateStarterNeftyDNA(archetypeIndex: string, version?: string) {
    this.validateArchetypeIndex(archetypeIndex);
    const dnaSchema = this.getDNASchema(version ?? LATEST_SCHEMA_VERSION);

    const dnaData = this.initializeDnaData(dnaSchema.version);
    dnaData.data = this.createDataData(dnaSchema, archetypeIndex, 'standard', 'Uncommon');

    const stats = Array(N_STATS_SOT).fill(30);
    dnaData.dataAdv = this.createDataAdv(stats);

    return this.getDna(dnaSchema.version, dnaData);
  }

  generateNeftyDNAFromV1Dna(
    dnaFactoryV1: DNAFactoryV1,
    v1Dna: string,
    newSotStats?: ParseDataPerc,
    newVersion?: string
  ) {
    const dataV1 = dnaFactoryV1.parse(v1Dna);
    const dnaSchema = this.getDNASchema(newVersion ?? LATEST_SCHEMA_VERSION);

    const dnaData = this.initializeDnaData(dnaSchema.version);
    dnaData.data = this.createDataDataFromV1(dataV1);

    const stats = newSotStats ?? dataV1.dataAdv;
    dnaData.dataAdv = this.createDataAdvFromV1(stats);

    return this.getDna(dnaSchema.version, dnaData);
  }
}
