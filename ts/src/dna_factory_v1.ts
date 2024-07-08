import randomBytes from 'randombytes';
import {
  DNASchema,
  DNASchemaV0,
  DNASchemaV2,
  DNASchemaV3,
  Category,
  Parse,
  AbilityDictionary,
  NeftiesInfo,
  KeywordsKey,
  Archetype,
  ParseData,
  AbilityInfo,
  ParseDataRangeCompleteness,
  ParseDataIndex,
  ParseDataSkillInfo,
  RarityInfo,
  Rarity,
  Gene,
  Grade,
  NeftyImageFormat,
  version,
  AdvStatsJSON,
} from './interfaces/types';
import dnaSchemaV0_2 from './deps/schemas/aurory_dna_v0.2.0.json';
import dnaSchemaV0_3 from './deps/schemas/aurory_dna_v0.3.0.json';
import dnaSchemaV0_4 from './deps/schemas/aurory_dna_v0.4.0.json';
import dnaSchemaV0_5 from './deps/schemas/aurory_dna_v0.5.0.json';
import dnaSchemaV2_0 from './deps/schemas/aurory_dna_v2.0.0.json';
import dnaSchemaV2_1 from './deps/schemas/aurory_dna_v2.1.0.json';
import dnaSchemaV3_0 from './deps/schemas/aurory_dna_v3.0.0.json';
import dnaSchemaV3_1 from './deps/schemas/aurory_dna_v3.1.0.json';
import dnaSchemaV3_2 from './deps/schemas/aurory_dna_v3.2.0.json';
import adventuresStatsV0_0_6 from './deps/schemas/adventures/v0.0.6.json';
import { LATEST_VERSION as LATEST_ADVENTURES_STATS_VERSION } from './deps/schemas/adventures/latest';
import { LATEST_VERSION as LATEST_ABILTIIES_VERSION } from './deps/dictionaries/latest';
import abiltiesDictionaryV4 from './deps/dictionaries/abilities_dictionary_v0.4.0.json';
import neftiesInfo from './deps/nefties_info.json';
import raritiesGeneration from './deps/rarities_generation.json';
import raritiesRead from './deps/rarities_read.json';
import { DNA } from './dna';
import {
  getAverageFromRaw,
  getCategoryKeyFromName,
  getLatestSubversion,
  randomInt,
  randomNormal,
  unpad,
} from './utils';
import { DNASchemaReader } from './dna_schema_reader';
import { getAdventuresStats } from './adventure_stats';
import { LAST_SUPPORTED_VERSION_BY_V1 } from './constants';

const dnaSchemas: Record<version, DNASchema> = {
  '0.2.0': dnaSchemaV0_2 as DNASchema,
  '0.3.0': dnaSchemaV0_3 as DNASchema,
  '0.4.0': dnaSchemaV0_4 as DNASchema,
  '0.5.0': dnaSchemaV0_5 as DNASchema,
  '2.0.0': dnaSchemaV2_0 as DNASchemaV2,
  '2.1.0': dnaSchemaV2_1 as DNASchemaV2,
  '3.0.0': dnaSchemaV3_0 as DNASchemaV3,
  '3.1.0': dnaSchemaV3_1 as DNASchemaV3,
  '3.2.0': dnaSchemaV3_2 as DNASchemaV3,
};

const adventuresStats: Record<version, AdvStatsJSON> = {
  '0.0.6': adventuresStatsV0_0_6,
};

const abilitiesDictionaries: Record<version, AbilityDictionary> = {
  '0.4.0': abiltiesDictionaryV4 as AbilityDictionary,
};

export class DNAFactoryV1 {
  dnaSchemas: Record<version, DNASchema>;
  abilitiesDictionary: Record<version, AbilityDictionary>;
  neftiesInfo: NeftiesInfo;
  latestSchemaVersion: string;
  latestAbilitiesVersion: string;
  dnaBytes: number;
  encodingBase: number;
  baseSize: number;
  latestSchemasSubversions: Record<version, version>;
  latestDictionariesSubversions: Record<version, version>;
  raritiesGeneration: Record<string, Record<Rarity, RarityInfo>>;
  raritiesRead: Record<Rarity, Omit<RarityInfo, 'probability'>>;
  adventuresStats: Record<string, AdvStatsJSON>;

  constructor(dnaBytes?: number, encodingBase?: number) {
    this.dnaBytes = dnaBytes ?? 64;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
    this.latestSchemaVersion = LAST_SUPPORTED_VERSION_BY_V1;
    this.latestAbilitiesVersion = LATEST_ABILTIIES_VERSION;
    this.dnaSchemas = dnaSchemas;
    this.abilitiesDictionary = abilitiesDictionaries;
    this.neftiesInfo = neftiesInfo;
    this.latestSchemasSubversions = {};
    this.latestDictionariesSubversions = {};
    this.raritiesGeneration = raritiesGeneration;
    this.raritiesRead = raritiesRead;
    this.adventuresStats = adventuresStats;
  }

  private _generateDNA(storageSize: number, encodingBase?: number): string | Buffer {
    const data = randomBytes(storageSize);
    if (!encodingBase) return data;
    switch (encodingBase) {
      case 64:
        return data.toString('base64');
      case 16:
        return data.toString('hex');
      default:
        throw new Error(`Encoding ${encodingBase} not supported. Try 16 or 64`);
    }
  }

  private _toPaddedBase(n: string, base: number): string {
    return parseInt(n)
      .toString(this.encodingBase)
      .padStart(base * this.baseSize, '0');
  }

  private _getRandomRarity(grade: Grade): Rarity {
    const rarities = this.raritiesGeneration[grade];
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

  /**
   * Generate statsCount number of stats with a mean value in the rarity range.
   * @param rarity Rarity
   * @param statsCount Number of stats to generate
   */
  private _generateStatsForRarity(grade: Grade, rarity: Rarity, genes: Gene[]): number[] {
    const filteredGenes = genes.filter((gene) => gene.type === 'range_completeness');
    const nStats = filteredGenes.length;
    const [minStatAvg, maxStatAvg] = this.raritiesGeneration[grade][rarity].average_stats_range;
    const stats = Array.from(Array(nStats).keys()).map(() => 0);

    const mean = randomInt(minStatAvg, maxStatAvg, true);
    // adding up to 5 will still result in the same mean as we are rounding down
    const totalPoints = mean * nStats;

    // As 100 is the upper limit, this value is over represented in the distribution
    // This makes the max random stat randomly set to a value between mean + 1 and 100
    const maxStatValue = randomInt(Math.min(mean + 1, 100), 100, false);

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

    const maxValuePerStat: number[] = [];
    filteredGenes.forEach((gene) => {
      const m = Math.pow(2, gene.base * 8) - 1;
      maxValuePerStat.push(m);
    });

    let pointsLeft = totalPoints;
    let raw = [] as number[];
    let average;

    while (pointsLeft) {
      distributePoints();
      raw = stats.map((stat, index) => Math.round((stat / 100) * maxValuePerStat[index]));

      average = Math.floor(
        getAverageFromRaw(
          raw,
          stats.map((_, index) => maxValuePerStat[index])
        ) * 100
      );

      // the average is done on raw stats but points are distributed on the % stats. It may happen the means are not the same.
      if (Math.floor(average) !== mean) pointsLeft += 1;
    }

    // if average = 1 for a non glitched or 95 for a schimmering, we may end up not enterring in the previous loop
    if (!raw.length) raw = stats.map((stat, index) => Math.round((stat / 100) * maxValuePerStat[index]));
    return raw;
  }

  private _unpad(v: string): string {
    return parseInt(v, this.encodingBase).toString();
  }

  loadDNASchema(version: string): DNASchema {
    const dnaSchema = dnaSchemas[version];
    if (version !== dnaSchema.version)
      throw new Error(`Versions mismatch: ${version} (filename) vs ${dnaSchema.version} (schema)`);
    return dnaSchema as DNASchema;
  }

  // get latest minor version from a major version
  getLatestSchemaSubversion(schemaVersion?: string): string {
    if (!schemaVersion) return this.latestSchemaVersion;
    else if (schemaVersion?.includes('.')) return schemaVersion;
    else if (schemaVersion && this.latestSchemasSubversions[schemaVersion])
      return this.latestSchemasSubversions[schemaVersion];
    const completeVersion = getLatestSubversion(this.dnaSchemas, schemaVersion);
    this.latestSchemasSubversions[schemaVersion] = completeVersion;
    return completeVersion;
  }

  // get latest minor version from a major version
  getLatestAbilitiesDictionarySubversion(schemaVersion?: string): string {
    if (!schemaVersion) return this.latestAbilitiesVersion;
    else if (schemaVersion?.includes('.')) return schemaVersion;
    else if (schemaVersion && this.latestDictionariesSubversions[schemaVersion])
      return this.latestDictionariesSubversions[schemaVersion];
    const completeVersion = getLatestSubversion(this.abilitiesDictionary, schemaVersion);
    this.latestDictionariesSubversions[schemaVersion] = completeVersion;
    return completeVersion;
  }

  // Version is either the major version like '3', or a complete version like '3.1.7'
  getDNASchema(version?: string): DNASchema {
    if (!version) return this.dnaSchemas[this.latestSchemaVersion];
    else if (this.dnaSchemas[version]) return this.dnaSchemas[version];
    else if (this.latestSchemasSubversions[version]) return this.dnaSchemas[this.latestSchemasSubversions[version]];

    const completeVersion = version.includes('.') ? version : this.getLatestSchemaSubversion(version);

    if (!completeVersion) throw new Error(`No schema found for ${version}`);

    this.dnaSchemas[completeVersion] = this.loadDNASchema(completeVersion);

    return this.dnaSchemas[completeVersion];
  }

  generateNeftyDNAV0(archetypeIndex: string, dnaSchema: DNASchemaV0, schemaVersion: string) {
    const categoryKey = getCategoryKeyFromName('nefties', dnaSchema.categories);

    const versionGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'version');
    if (!versionGeneInfo) throw new Error('Missing version gene');
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');
    const archetypeGeneInfo = dnaSchema.categories[categoryKey].category_genes_header.find(
      (gene_header) => gene_header.name === 'archetype'
    );
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');

    const versionDNAFormat = this._toPaddedBase(schemaVersion, versionGeneInfo.base);
    const categoryDNAFormat = this._toPaddedBase(categoryKey, categoryGeneInfo.base);
    const archetypeDNAFormat = this._toPaddedBase(archetypeIndex, archetypeGeneInfo.base);

    const randomDNAlen = this.dnaBytes - versionGeneInfo.base - categoryGeneInfo.base - archetypeGeneInfo.base;

    const randomDNA = this._generateDNA(randomDNAlen, this.encodingBase);
    const dna = versionDNAFormat + categoryDNAFormat + archetypeDNAFormat + randomDNA;

    return dna;
  }

  generateNeftyDNALatest(
    archetypeIndex: string,
    grade: Grade,
    dnaSchema: DNASchemaV2 | DNASchemaV3,
    schemaVersion: string,
    rarityPreset?: Rarity
  ) {
    const rarity = rarityPreset ?? this._getRandomRarity(grade);
    const rarityIndex = Object.entries(dnaSchema.rarities).find(([_, rarityName]) => rarityName === rarity)?.[0];
    if (!rarityIndex) throw new Error('Rarity not found');

    const categoryKey = getCategoryKeyFromName('nefties', dnaSchema.categories);

    const versionGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'version');
    if (!versionGeneInfo) throw new Error('Missing version gene');
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');

    const archetypeGeneInfo = dnaSchema.categories[categoryKey].category_genes_header.find(
      (gene_header) => gene_header.name === 'archetype'
    );
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');
    const rarityGeneInfo = dnaSchema.categories[categoryKey].category_genes_header.find(
      (gene_header) => gene_header.name === 'rarity'
    );
    if (!rarityGeneInfo) throw new Error('Missing rarity gene');

    const versionDNAFormat = this._toPaddedBase(schemaVersion, versionGeneInfo.base);
    const categoryDNAFormat = this._toPaddedBase(categoryKey, categoryGeneInfo.base);
    const archetypeDNAFormat = this._toPaddedBase(archetypeIndex, archetypeGeneInfo.base);
    const rarityDNAFormat = this._toPaddedBase(rarityIndex, rarityGeneInfo.base);

    const randomDNAlen =
      this.dnaBytes - versionGeneInfo.base - categoryGeneInfo.base - archetypeGeneInfo.base - rarityGeneInfo.base;

    const randomDNA = this._generateDNA(randomDNAlen, this.encodingBase) as string;
    const randomStats = this._generateStatsForRarity(grade, rarity, dnaSchema.categories[categoryKey].genes);
    const dnaTacticsStats = randomStats.map((stat) => this._toPaddedBase(stat.toString(), 1)).join('');

    const dna =
      versionDNAFormat +
      categoryDNAFormat +
      archetypeDNAFormat +
      rarityDNAFormat +
      dnaTacticsStats +
      randomDNA.slice(dnaTacticsStats.length);
    return dna;
  }

  generateNeftyDNA(archetypeIndex: string, grade: Grade, version?: string, rarityPreset?: Rarity) {
    if (!archetypeIndex) throw new Error('Missing archetypeIndex');
    const dnaSchema = this.getDNASchema(version ?? this.latestSchemaVersion) as DNASchemaV2;
    const schemaVersion = dnaSchema.version;
    const categoryKey = getCategoryKeyFromName('nefties', dnaSchema.categories);
    if (!dnaSchema.categories[categoryKey]?.archetypes[archetypeIndex])
      throw new Error(
        `Archetype index not found. archetypeIndex ${archetypeIndex} schemaVersion ${schemaVersion} categoryKey ${categoryKey}`
      );

    const v = version ? unpad(version, this.encodingBase) : null;
    if (!v) return this.generateNeftyDNALatest(archetypeIndex, grade, dnaSchema, schemaVersion, rarityPreset);
    if (v == '0' || v == '1') return this.generateNeftyDNAV0(archetypeIndex, dnaSchema, schemaVersion);
    else if (v == '2' || v == '3')
      return this.generateNeftyDNALatest(archetypeIndex, grade, dnaSchema, schemaVersion, rarityPreset);
    else throw new Error(`Invalid version ${version}`);
  }

  generateStarterNeftyDNA(archetypeIndex: string) {
    if (!archetypeIndex) throw new Error('Missing archetypeIndex');
    const dnaSchema = this.getDNASchema(this.latestSchemaVersion) as DNASchemaV2;
    const schemaVersion = dnaSchema.version;
    const categoryKey = getCategoryKeyFromName('nefties', dnaSchema.categories);
    if (!dnaSchema.categories[categoryKey]?.archetypes[archetypeIndex])
      throw new Error(
        `Archetype index not found. archetypeIndex ${archetypeIndex} schemaVersion ${schemaVersion} categoryKey ${categoryKey}`
      );
    const rarity = 'Uncommon';
    const rarityIndex = Object.entries(dnaSchema.rarities).find(([_, rarityName]) => rarityName === rarity)?.[0];
    if (!rarityIndex) throw new Error('Rarity not found');

    const versionGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'version');
    if (!versionGeneInfo) throw new Error('Missing version gene');
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');

    const archetypeGeneInfo = dnaSchema.categories[categoryKey].category_genes_header.find(
      (gene_header) => gene_header.name === 'archetype'
    );
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');
    const rarityGeneInfo = dnaSchema.categories[categoryKey].category_genes_header.find(
      (gene_header) => gene_header.name === 'rarity'
    );
    if (!rarityGeneInfo) throw new Error('Missing rarity gene');

    const versionDNAFormat = this._toPaddedBase(schemaVersion, versionGeneInfo.base);
    const categoryDNAFormat = this._toPaddedBase(categoryKey, categoryGeneInfo.base);
    const archetypeDNAFormat = this._toPaddedBase(archetypeIndex, archetypeGeneInfo.base);
    const rarityDNAFormat = this._toPaddedBase(rarityIndex, rarityGeneInfo.base);

    const randomDNAlen =
      this.dnaBytes - versionGeneInfo.base - categoryGeneInfo.base - archetypeGeneInfo.base - rarityGeneInfo.base;

    const randomDNA = this._generateDNA(randomDNAlen, this.encodingBase) as string;
    const starterEggStat = Math.floor(255 * 0.3);
    const stats = Array(6).fill(starterEggStat);
    const dnaTacticsStats = stats.map((stat) => this._toPaddedBase(stat.toString(), 1)).join('');
    const dna =
      versionDNAFormat +
      categoryDNAFormat +
      archetypeDNAFormat +
      rarityDNAFormat +
      dnaTacticsStats +
      randomDNA.slice(dnaTacticsStats.length);
    return dna;
  }

  getAbilitiesDictionary(version?: string): AbilityDictionary {
    if (!version) return this.abilitiesDictionary[this.latestAbilitiesVersion];
    return this.abilitiesDictionary[this.getLatestAbilitiesDictionarySubversion(version)];
  }

  getAbilityInfo(ability: string, version?: string): AbilityInfo {
    const abilityVersion = version ?? this.latestAbilitiesVersion;
    const abilityKeywords = this.getAbilitiesDictionary(version ?? this.latestAbilitiesVersion).keywords;
    const info = {} as AbilityInfo;
    for (const keyword in abilityKeywords) {
      const [_, abilityName, infoType] = keyword.split('.');
      if (abilityName !== ability) continue;
      info[infoType as keyof AbilityInfo] = abilityKeywords[keyword as KeywordsKey];
      if (info.name && info.description) return info;
    }
    throw new Error(`Ability ${ability} not found in version ${abilityVersion}`);
  }

  getDisplayNameFromCodeName(neftyNameCode: string) {
    return this.neftiesInfo.code_to_displayName[neftyNameCode];
  }

  getFamilyDescription(family: string) {
    return this.neftiesInfo.family_to_description[family];
  }

  /**
   * Returns rarity from stats average
   * @param statsAverage average of all stats, from 0 to 100;
   */
  getRarityFromStatsAvg(statsAverage: number, raiseErrorOnNotFound = true, grade: Grade = 'prime'): Rarity | null {
    const rarity = Object.entries(this.raritiesRead).find(([rarity, rarityInfo]) => {
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

  private getDNASchemaFromDNA(dna: DNA, forcedVersion?: version): { dnaSchema: DNASchema; majorVersionInt: number } {
    const dnaStringVersion = dna.read(2);
    let dnaVersion;
    if (forcedVersion && forcedVersion.includes('.')) dnaVersion = forcedVersion;
    else if (forcedVersion) dnaVersion = this.getLatestSchemaSubversion(forcedVersion);
    else dnaVersion = this.getLatestSchemaSubversion(dnaStringVersion);
    const dnaSchema = this.getDNASchema(dnaVersion);
    const majorVersion = dnaVersion.split('.')[0];
    const majorVersionInt = parseInt(majorVersion);
    return { dnaSchema, majorVersionInt };
  }

  parse(dnaString: string, forcedVersion?: version, forcedAdvStatsVersion?: version): Parse {
    const dna = new DNA(dnaString, this.encodingBase);
    const { dnaSchema } = this.getDNASchemaFromDNA(dna.clone(), forcedVersion);
    const dnaSchemaReader = new DNASchemaReader(dnaSchema, dna);

    const raw: Record<string, number> = {};
    dnaSchemaReader.genes.forEach((gene) => {
      raw[gene.name] = gene.rawValue;
    });
    const archetype = dnaSchemaReader.archetype;
    // raw genes
    const genes = dnaSchema.categories[dnaSchemaReader.categoryKey].genes;
    const data: ParseData = Object.assign({} as ParseData, archetype.fixed_attributes);
    this._setRarity(data, dnaSchemaReader, dnaSchema);
    this._setGrade(data, dnaSchemaReader, dnaSchema);
    const neftyNameCode = archetype.fixed_attributes.name as string;
    data['displayName'] = this.getDisplayNameFromCodeName(neftyNameCode);
    data['description'] = this.getFamilyDescription(archetype.fixed_attributes.family as string);
    data['passiveSkill_info'] = this.getAbilityInfo(data['passiveSkill']);
    data['ultimateSkill_info'] = this.getAbilityInfo(data['ultimateSkill']);
    this._setStats(data, dnaSchemaReader);
    this._setSkills(data, dnaSchemaReader);
    this._addNeftyImageData(data, 'prime');

    const advStatsJSON = forcedAdvStatsVersion
      ? this.adventuresStats[forcedAdvStatsVersion]
      : this.adventuresStats[LATEST_ADVENTURES_STATS_VERSION];

    const dataAdv = getAdventuresStats(dnaSchemaReader, advStatsJSON);

    return {
      data,
      dataAdv,
      raw,
      metadata: { version: dnaSchema.version },
      archetype,
      genes,
    };
  }

  private _setSkills(data: ParseData, dnaSchemaReader: DNASchemaReader) {
    dnaSchemaReader.getCompletenessGenes().forEach((gene) => {
      data[gene.name as keyof ParseDataRangeCompleteness] = gene.value as number;
    });
  }

  private _setStats(data: ParseData, dnaSchemaReader: DNASchemaReader) {
    dnaSchemaReader.getIndexGenes().forEach((gene) => {
      data[gene.name as keyof ParseDataIndex] = gene.value as string;
      if (gene.name.startsWith('skill_')) {
        data[`${gene.name}_info` as keyof ParseDataSkillInfo] = this.getAbilityInfo(gene.value as string);
      }
    });
  }

  private _setRarity(data: ParseData, dnaSchemaReader: DNASchemaReader, dnaSchema: DNASchema) {
    if (dnaSchemaReader.categoryGenesHeader.rarity) {
      // rarity doesn't exist on V0
      data.rarity = (dnaSchema as DNASchemaV2).rarities[dnaSchemaReader.categoryGenesHeader.rarity];
    } else {
      const numberOfStats = dnaSchemaReader.getCompletenessGenes().length; // 6
      data.rarity = this.getRarityFromStatsAvg((dnaSchemaReader.statsRawSum * 100) / numberOfStats) as Rarity;
    }
  }

  private _setGrade(data: ParseData, dnaSchemaReader: DNASchemaReader, dnaSchema: DNASchema) {
    if (dnaSchemaReader.categoryGenesHeader.grade) {
      // grade needs to be added to the dna generation process to support this
      // data.grade = (dnaSchema as DNASchemaV3).grades[dnaSchemaReader.categoryGenesHeader.grade];
    } else {
      // all nefties were prime before grade was introduced
      data.grade = 'prime';
    }
  }

  getNeftyImageName(neftyName: string, rarity: Rarity, grade: Grade, format?: NeftyImageFormat): string {
    const neftyCodeName = encodeURIComponent(neftyName.toLowerCase().trim().replace(/\s/g, '-'));
    const rarityToFrame = {
      Common: 'bronze',
      Uncommon: 'silver',
      Rare: 'gold',
      Epic: 'diamond',
      Legendary: 'mythic',
    };
    const rarityCodeName = rarityToFrame[rarity];
    const gradeCodeName = grade === 'standard' ? '-standard' : '';
    const rarityAndGrade = `${rarityCodeName}${gradeCodeName}`;
    if (format) {
      return `https://images.cdn.aurory.io/nefties/${neftyCodeName}/${rarityAndGrade}-${format}.png`;
    } else {
      return `https://images.cdn.aurory.io/nefties/${neftyCodeName}/${rarityAndGrade}.png`;
    }
  }

  private _addNeftyImageData(data: ParseData, grade: Grade): void {
    data.defaultImage = this.getNeftyImageName(data.displayName, data.rarity, grade);
    data.imageByGame = {
      tactics: {
        small: this.getNeftyImageName(data.displayName, data.rarity, grade, 'small'),
        medium: this.getNeftyImageName(data.displayName, data.rarity, grade, 'medium'),
      },
    };
  }

  getDnaVersion(dnaString: string): string {
    const dna = new DNA(dnaString, this.encodingBase);
    const version = dna.read(2);
    return version;
  }

  getCategory(categoryName: string, dnaVersion: string): Category {
    const dnaSchema = this.getDNASchema(unpad(dnaVersion, this.encodingBase));
    const categoryIndex = getCategoryKeyFromName(categoryName, dnaSchema.categories);
    const category = dnaSchema.categories[unpad(categoryIndex, this.encodingBase)];
    return category;
  }

  getArchetypes(version?: string) {
    const completeVersion = this.getLatestSchemaSubversion(version);
    const category = this.getCategory('nefties', completeVersion);
    return category.archetypes;
  }

  getArchetypeByNeftyCodeName(neftyCodeName: string, version?: string): { archetypeKey: string; archetype: Archetype } {
    const archetypes = this.getArchetypes(version);
    for (const archetypeKey in archetypes) {
      const archetype = archetypes[archetypeKey];
      if (archetype.fixed_attributes.name === neftyCodeName) return { archetypeKey, archetype };
    }
    throw new Error(`Archetype with name ${neftyCodeName} not found`);
  }
}
