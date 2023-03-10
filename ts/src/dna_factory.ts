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
  Rarity,
  Gene,
  NeftyImageFormat,
} from './interfaces/types';
import dnaSchemaV0_2 from './deps/schemas/aurory_dna_v0.2.0.json';
import dnaSchemaV0_3 from './deps/schemas/aurory_dna_v0.3.0.json';
import dnaSchemaV0_4 from './deps/schemas/aurory_dna_v0.4.0.json';
import dnaSchemaV2_0 from './deps/schemas/aurory_dna_v2.0.0.json';
import dnaSchemaV3_0 from './deps/schemas/aurory_dna_v3.0.0.json';
import { LATEST_VERSION as LATEST_SCHEMA_VERSION } from './deps/schemas/latest';
import { LATEST_VERSION as LATEST_ABILTIIES_VERSION } from './deps/dictionaries/latest';
import abiltiesDictionaryV4 from './deps/dictionaries/abilities_dictionary_v0.4.0.json';
import neftiesInfo from './deps/nefties_info.json';
import rarities from './deps/rarities.json';
import { DNA } from './dna';
import { RarityInfo } from './interfaces/types';
import { getAverageFromRaw, getCategoryKeyFromName, getLatestSubversion, randomInt } from './utils';

type version = string;

const dnaSchemas: Record<version, DNASchema> = {
  '0.2.0': dnaSchemaV0_2 as DNASchema,
  '0.3.0': dnaSchemaV0_3 as DNASchema,
  '0.4.0': dnaSchemaV0_4 as DNASchema,
  '2.0.0': dnaSchemaV2_0 as DNASchemaV2,
  '3.0.0': dnaSchemaV3_0 as DNASchemaV3,
};

const abilitiesDictionaries: Record<version, AbilityDictionary> = {
  '0.4.0': abiltiesDictionaryV4 as AbilityDictionary,
};

export class DNAFactory {
  dnaSchemas: Record<version, DNASchema>;
  abilitiesDictionary: Record<version, AbilityDictionary>;
  nefiesInfo: NeftiesInfo;
  latestSchemaVersion: string;
  latestAbilitiesVersion: string;
  dnaBytes: number;
  encodingBase: number;
  baseSize: number;
  latestSchemasSubversions: Record<version, version>;
  latestDictionariesSubversions: Record<version, version>;
  rarities: Record<Rarity, RarityInfo>;

  constructor(dnaBytes?: number, encodingBase?: number) {
    this.dnaBytes = dnaBytes ?? 64;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
    this.latestSchemaVersion = LATEST_SCHEMA_VERSION;
    this.latestAbilitiesVersion = LATEST_ABILTIIES_VERSION;
    this.dnaSchemas = dnaSchemas;
    this.abilitiesDictionary = abilitiesDictionaries;
    this.nefiesInfo = neftiesInfo;
    this.latestSchemasSubversions = {};
    this.latestDictionariesSubversions = {};
    this.rarities = rarities;
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

  private _getRandomRarity(): Rarity {
    const precision = 3;
    const multiplier = Math.pow(10, precision);
    const weightsSum = Object.values(this.rarities).reduce((acc, rarity) => acc + rarity.probability * multiplier, 0);
    const random = Math.random() * weightsSum;
    let total = 0;
    for (const [rarity, rarityInfo] of Object.entries(this.rarities)) {
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
  private _generateStatsForRarity(rarity: Rarity, genes: Gene[]): number[] {
    let t = [];
    let average = -1;
    const filteredGenes = genes.filter((gene) => gene.type === 'range_completeness');
    const maxValuePerStat: number[] = [];
    filteredGenes.forEach((gene) => {
      const m = Math.pow(2, gene.base * 8) - 1;
      maxValuePerStat.push(m);
    });
    while (this.getRarityFromStatsAvg(average, false) !== rarity) {
      t = [];
      for (let i = 0; i < maxValuePerStat.length; i++) {
        const n = randomInt(0, maxValuePerStat[i]);
        t.push(n);
      }
      average = getAverageFromRaw(t, maxValuePerStat) * 100;
    }
    return t;
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
    dnaSchema: DNASchemaV2 | DNASchemaV3,
    schemaVersion: string,
    rarityPreset?: Rarity
  ) {
    const rarity = rarityPreset ?? this._getRandomRarity();
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
    const randomStats = this._generateStatsForRarity(rarity, dnaSchema.categories[categoryKey].genes);
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

  generateNeftyDNA(archetypeIndex: string, version?: string, rarityPreset?: Rarity) {
    if (!archetypeIndex) throw new Error('Missing archetypeIndex');
    const dnaSchema = this.getDNASchema(version ?? this.latestSchemaVersion) as DNASchemaV2;
    const schemaVersion = dnaSchema.version;
    const categoryKey = getCategoryKeyFromName('nefties', dnaSchema.categories);
    if (!dnaSchema.categories[categoryKey]?.archetypes[archetypeIndex])
      throw new Error(
        `Archetype index not found. archetypeIndex ${archetypeIndex} schemaVersion ${schemaVersion} categoryKey ${categoryKey}`
      );

    const v = version ? this._unpad(version) : null;
    if (!v) return this.generateNeftyDNALatest(archetypeIndex, dnaSchema, schemaVersion, rarityPreset);
    if (v == '0' || v == '1') return this.generateNeftyDNAV0(archetypeIndex, dnaSchema, schemaVersion);
    else if (v == '2' || v == '3')
      return this.generateNeftyDNALatest(archetypeIndex, dnaSchema, schemaVersion, rarityPreset);
    else throw new Error(`Invalid version ${version}`);
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
    return this.nefiesInfo.code_to_displayName[neftyNameCode];
  }

  getFamilyDescription(family: string) {
    return this.nefiesInfo.family_to_description[family];
  }

  /**
   * Returns rarity from stats average
   * @param statsAverage average of all stats, from 0 to 100;
   */
  getRarityFromStatsAvg(statsAverage: number, raiseErrorOnNotFound = true): Rarity | null {
    const rarity = Object.entries(this.rarities).find(([rarity, rarityInfo]) => {
      return statsAverage >= rarityInfo.average_stats_range[0] && statsAverage < rarityInfo.average_stats_range[1];
    });
    if (!rarity) {
      if (raiseErrorOnNotFound) throw new Error(`Rarity not found for stats average ${statsAverage}`);
      else return null;
    }
    return rarity[0] as Rarity;
  }

  parseV0(dnaSchema: DNASchemaV0, dna: DNA): Parse {
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');
    const categoryIndex = dna.read(categoryGeneInfo.base);
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
    const archetypeGeneInfo = category.category_genes_header.find((gene_header) => gene_header.name === 'archetype');
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');
    const archetypeIndex = dna.read(archetypeGeneInfo.base);
    const archetype = category.archetypes[this._unpad(archetypeIndex)];

    const data: ParseData = Object.assign({} as ParseData, archetype.fixed_attributes);
    const neftyNameCode = archetype.fixed_attributes.name as string;
    data['displayName'] = this.getDisplayNameFromCodeName(neftyNameCode);
    data['description'] = this.getFamilyDescription(archetype.fixed_attributes.family as string);
    data['passiveSkill_info'] = this.getAbilityInfo(data['passiveSkill']);
    data['ultimateSkill_info'] = this.getAbilityInfo(data['ultimateSkill']);
    const raw: Record<string, number> = {};
    const encoded_attributes = archetype.encoded_attributes;
    let statsRawSum = 0;
    for (const gene of category.genes) {
      const encoded_attribute = encoded_attributes[gene.name];
      if (!encoded_attribute) throw new Error(`Gene ${gene.name} not found in archetype`);
      const value = parseInt(dna.read(gene.base), this.encodingBase);
      raw[gene.name] = value;
      if (gene.type === 'range_completeness') {
        const completeness = value / (Math.pow(2, gene.base * 8) - 1);
        statsRawSum += completeness;
        data[gene.name as keyof ParseDataRangeCompleteness] = Math.round(
          completeness * ((encoded_attribute[1] as number) - (encoded_attribute[0] as number)) +
            (encoded_attribute[0] as number)
        );
      } else if (gene.type === 'index') {
        const rangedValue = value % encoded_attribute.length;
        data[gene.name as keyof ParseDataIndex] = encoded_attribute[rangedValue] as string;
        if (gene.name.startsWith('skill_')) {
          data[`${gene.name}_info` as keyof ParseDataSkillInfo] = this.getAbilityInfo(
            encoded_attributes[gene.name][0] as string
          );
        }
      } else throw new Error(`Gene type ${gene.type} not supported.`);
    }

    data['rarity'] = this.getRarityFromStatsAvg((statsRawSum * 100) / 6) as Rarity;
    return {
      data,
      raw,
      metadata: { version: dnaSchema.version },
      archetype,
      genes: category.genes,
    };
  }

  parseV2(dnaSchema: DNASchemaV2, dna: DNA): Parse {
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');
    const categoryIndex = dna.read(categoryGeneInfo.base);
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
    const archetypeGeneInfo = category.category_genes_header.find((gene_header) => gene_header.name === 'archetype');
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');
    const archetypeIndex = dna.read(archetypeGeneInfo.base);
    const archetype = category.archetypes[this._unpad(archetypeIndex)];

    const rarityGeneInfo = category.category_genes_header.find((gene_header) => gene_header.name === 'rarity');
    if (!rarityGeneInfo) throw new Error('Missing rarity gene');

    const data: ParseData = Object.assign({} as ParseData, archetype.fixed_attributes);
    const neftyNameCode = archetype.fixed_attributes.name as string;
    data['displayName'] = this.getDisplayNameFromCodeName(neftyNameCode);
    data['description'] = this.getFamilyDescription(archetype.fixed_attributes.family as string);
    data['passiveSkill_info'] = this.getAbilityInfo(data['passiveSkill']);
    data['ultimateSkill_info'] = this.getAbilityInfo(data['ultimateSkill']);

    // Due to a bug we don't use rarity indicator from DNA for V2
    dna.read(rarityGeneInfo.base);

    const raw: Record<string, number> = {};
    const encoded_attributes = archetype.encoded_attributes;
    let statsRawSum = 0;
    for (const gene of category.genes) {
      const encoded_attribute = encoded_attributes[gene.name];
      if (!encoded_attribute) throw new Error(`Gene ${gene.name} not found in archetype`);
      const value = parseInt(dna.read(gene.base), this.encodingBase);
      raw[gene.name] = value;
      if (gene.type === 'range_completeness') {
        const completeness = value / (Math.pow(2, gene.base * 8) - 1);
        statsRawSum += completeness;
        data[gene.name as keyof ParseDataRangeCompleteness] = Math.round(
          completeness * ((encoded_attribute[1] as number) - (encoded_attribute[0] as number)) +
            (encoded_attribute[0] as number)
        );
      } else if (gene.type === 'index') {
        const rangedValue = value % encoded_attribute.length;
        data[gene.name as keyof ParseDataIndex] = encoded_attribute[rangedValue] as string;
        if (gene.name.startsWith('skill_')) {
          data[`${gene.name}_info` as keyof ParseDataSkillInfo] = this.getAbilityInfo(
            encoded_attributes[gene.name][0] as string
          );
        }
      } else throw new Error(`Gene type ${gene.type} not supported.`);
    }
    data['rarity'] = this.getRarityFromStatsAvg((statsRawSum / 6) * 100) as Rarity;

    return {
      data,
      raw,
      metadata: { version: dnaSchema.version },
      archetype,
      genes: category.genes,
    };
  }

  parseV3(dnaSchema: DNASchemaV2, dna: DNA): Parse {
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');
    const categoryIndex = dna.read(categoryGeneInfo.base);
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
    const archetypeGeneInfo = category.category_genes_header.find((gene_header) => gene_header.name === 'archetype');
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');
    const archetypeIndex = dna.read(archetypeGeneInfo.base);
    const archetype = category.archetypes[this._unpad(archetypeIndex)];

    const rarityGeneInfo = category.category_genes_header.find((gene_header) => gene_header.name === 'rarity');
    if (!rarityGeneInfo) throw new Error('Missing rarity gene');
    const rarityIndex = dna.read(rarityGeneInfo.base);
    const rarity = dnaSchema.rarities[this._unpad(rarityIndex)];

    const data: ParseData = Object.assign({} as ParseData, archetype.fixed_attributes);
    data['rarity'] = rarity as Rarity;
    const neftyNameCode = archetype.fixed_attributes.name as string;
    data['displayName'] = this.getDisplayNameFromCodeName(neftyNameCode);
    data['description'] = this.getFamilyDescription(archetype.fixed_attributes.family as string);
    data['passiveSkill_info'] = this.getAbilityInfo(data['passiveSkill']);
    data['ultimateSkill_info'] = this.getAbilityInfo(data['ultimateSkill']);
    const raw: Record<string, number> = {};
    const encoded_attributes = archetype.encoded_attributes;
    for (const gene of category.genes) {
      const encoded_attribute = encoded_attributes[gene.name];
      if (!encoded_attribute) throw new Error(`Gene ${gene.name} not found in archetype`);
      const value = parseInt(dna.read(gene.base), this.encodingBase);
      raw[gene.name] = value;
      if (gene.type === 'range_completeness') {
        const completeness = value / (Math.pow(2, gene.base * 8) - 1);
        data[gene.name as keyof ParseDataRangeCompleteness] = Math.round(
          completeness * ((encoded_attribute[1] as number) - (encoded_attribute[0] as number)) +
            (encoded_attribute[0] as number)
        );
      } else if (gene.type === 'index') {
        const rangedValue = value % encoded_attribute.length;
        data[gene.name as keyof ParseDataIndex] = encoded_attribute[rangedValue] as string;
        if (gene.name.startsWith('skill_')) {
          data[`${gene.name}_info` as keyof ParseDataSkillInfo] = this.getAbilityInfo(
            encoded_attributes[gene.name][0] as string
          );
        }
      } else throw new Error(`Gene type ${gene.type} not supported.`);
    }

    return {
      data,
      raw,
      metadata: { version: dnaSchema.version },
      archetype,
      genes: category.genes,
    };
  }

  parse(dnaString: string, forcedVersion?: version): Parse {
    const dna = new DNA(dnaString, this.encodingBase);
    let dnaVersion;
    if (forcedVersion && forcedVersion.includes('.')) dnaVersion = forcedVersion;
    else if (forcedVersion) dnaVersion = this.getLatestSchemaSubversion(forcedVersion);
    else dnaVersion = this.getLatestSchemaSubversion(dna.read(2));

    // move dna after version if we didn't had to read it.
    if (dna.cursor === 0) dna.read(2);

    const dnaSchema = this.getDNASchema(dnaVersion);
    const majorVersion = dnaVersion.split('.')[0];
    const majorVersionInt = parseInt(majorVersion);
    let parse: Parse;
    if (majorVersionInt === 0 || majorVersionInt === 1) parse = this.parseV0(dnaSchema, dna);
    else if (majorVersionInt === 2) parse = this.parseV2(dnaSchema as DNASchemaV2, dna);
    else if (majorVersionInt === 3) parse = this.parseV3(dnaSchema as DNASchemaV3, dna);
    else throw new Error(`Version ${majorVersionInt} not supported.`);

    parse.data = this.addNeftyImageData(parse);
    return parse;
  }

  getNeftyImageName(neftyName: string, rarity: Rarity, format?: NeftyImageFormat): string {
    const neftyCodeName = encodeURIComponent(neftyName.toLowerCase().trim().replace(/\s/g, '_'));
    const rarityToFrame = {
      Common: 'bronze',
      Uncommon: 'silver',
      Rare: 'gold',
      Epic: 'diamond',
      Legendary: 'mythtic',
    };
    const rarityCodeName = rarityToFrame[rarity];
    let url = '';
    if (format) url = `https://images.cdn.aurory.io/nefties/${neftyCodeName}/${rarityCodeName}-${format}.png`;
    else url = `https://images.cdn.aurory.io/nefties/${neftyCodeName}/${rarityCodeName}.png`;
    return url;
  }

  addNeftyImageData(parse: Parse): ParseData {
    const data = JSON.parse(JSON.stringify(parse.data));
    data.defaultImage = this.getNeftyImageName(data.displayName, data.rarity);
    data.imageByGame = {
      tactics: {
        small: this.getNeftyImageName(data.displayName, data.rarity, 'small'),
        medium: this.getNeftyImageName(data.displayName, data.rarity, 'medium'),
      },
    };
    return data;
  }

  getDnaVersion(dnaString: string): string {
    const dna = new DNA(dnaString, this.encodingBase);
    const version = dna.read(2);
    return version;
  }

  getCategory(categoryName: string, dnaVersion: string): Category {
    const dnaSchema = this.getDNASchema(this._unpad(dnaVersion));
    const categoryIndex = getCategoryKeyFromName(categoryName, dnaSchema.categories);
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
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
