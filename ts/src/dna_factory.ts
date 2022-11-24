import randomBytes from 'randombytes';
import {
  DNASchema,
  Category,
  Parse,
  AbilityDictionary,
  NeftiesInfo,
  AbilityLocalizedValue,
  KeywordsKey,
  Archetype,
  ParseData,
  AbilityInfo,
  ParseDataRangeCompleteness,
  ParseDataIndex,
  ParseDataSkillInfo,
} from './interfaces/types';
import dnaSchemaV1 from './deps/schemas/aurory_dna_v0.1.0.json';
import dnaSchemaV2 from './deps/schemas/aurory_dna_v0.2.0.json';
import dnaSchemaV3 from './deps/schemas/aurory_dna_v0.3.0.json';
import dnaSchemaV4 from './deps/schemas/aurory_dna_v0.4.0.json';
import { LATEST_VERSION as LATEST_SCHEMA_VERSION } from './deps/schemas/latest';
import { LATEST_VERSION as LATEST_ABILTIIES_VERSION } from './deps/dictionaries/latest';
import abiltiesDictionaryV4 from './deps/dictionaries/abilities_dictionary_v0.4.0.json';
import neftiesInfo from './deps/nefties_info.json';

type version = string;

const dnaSchemas: Record<version, DNASchema> = {
  '0.1.0': dnaSchemaV1 as DNASchema,
  '0.2.0': dnaSchemaV2 as DNASchema,
  '0.3.0': dnaSchemaV3 as DNASchema,
  '0.4.0': dnaSchemaV4 as DNASchema,
};

const abilitiesDictionaries: Record<version, AbilityDictionary> = {
  '0.4.0': abiltiesDictionaryV4 as AbilityDictionary,
};

export class DNA {
  cursor: number;
  dna: string;
  encodingBase: number;
  baseSize: number;
  constructor(dna: string, encodingBase?: number) {
    this.cursor = 0;
    this.dna = dna;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
  }

  read(n: number): string {
    const cursorShift = this.baseSize * n;
    const value = this.dna.substring(this.cursor, this.cursor + cursorShift);
    this.cursor += cursorShift;
    return value;
  }
}

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
  }

  generateDNA(storageSize: number, encodingBase?: number): string | Buffer {
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

  loadDNASchema(version: string): DNASchema {
    const dnaSchema = dnaSchemas[version];
    if (version !== dnaSchema.version)
      throw new Error(`Versions mismatch: ${version} (filename) vs ${dnaSchema.version} (schema)`);
    return dnaSchema as DNASchema;
  }

  private getLatestSubversion(
    completeVersionsDict: Record<string, DNASchema | AbilityDictionary>,
    schemaVersionInput?: string
  ): string {
    const schemaVersion = schemaVersionInput
      ? parseInt(schemaVersionInput) === 1
        ? '0'
        : schemaVersionInput
      : undefined;
    let completeVersion = undefined;
    let completeVersionSplit: string[] = [];

    for (const localCompleteVersion of Object.keys(completeVersionsDict)) {
      if (!completeVersion) {
        completeVersionSplit = localCompleteVersion.split('.');
        // We only want to find the latest subversion of this major version
        if (schemaVersion && parseInt(completeVersionSplit[0]) !== parseInt(schemaVersion)) continue;
        completeVersion = localCompleteVersion;
        continue;
      }

      const localCompleteVersionSplit = localCompleteVersion.split('.');
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

  // get latest minor version from a major version
  getLatestSchemaSubversion(schemaVersion?: string): string {
    if (!schemaVersion) return this.latestSchemaVersion;
    else if (schemaVersion?.includes('.')) return schemaVersion;
    else if (schemaVersion && this.latestSchemasSubversions[schemaVersion])
      return this.latestSchemasSubversions[schemaVersion];
    const completeVersion = this.getLatestSubversion(this.dnaSchemas, schemaVersion);
    this.latestSchemasSubversions[schemaVersion] = completeVersion;
    return completeVersion;
  }

  // get latest minor version from a major version
  getLatestAbilitiesDictionarySubversion(schemaVersion?: string): string {
    if (!schemaVersion) return this.latestAbilitiesVersion;
    else if (schemaVersion?.includes('.')) return schemaVersion;
    else if (schemaVersion && this.latestDictionariesSubversions[schemaVersion])
      return this.latestDictionariesSubversions[schemaVersion];
    const completeVersion = this.getLatestSubversion(this.abilitiesDictionary, schemaVersion);
    this.latestDictionariesSubversions[schemaVersion] = completeVersion;
    return completeVersion;
  }

  getDNASchema(version?: string): DNASchema {
    if (!version) return this.dnaSchemas[this.latestSchemaVersion];
    else if (this.dnaSchemas[version]) return this.dnaSchemas[version];
    else if (this.latestSchemasSubversions[version]) return this.dnaSchemas[this.latestSchemasSubversions[version]];

    const completeVersion = version.includes('.') ? version : this.getLatestSchemaSubversion(version);

    if (!completeVersion) throw new Error(`No schema found for ${version}`);

    this.dnaSchemas[completeVersion] = this.loadDNASchema(completeVersion);

    return this.dnaSchemas[completeVersion];
  }

  private _getCategoryKeyFromName(name: string, categories: Record<string, Category>) {
    for (const categoryKey in categories) {
      if (categories[categoryKey].name === name) return categoryKey;
    }
    throw new Error(`Category with name "${name}" not found`);
  }

  private _toPaddedBase(n: string, base: number): string {
    return parseInt(n)
      .toString(this.encodingBase)
      .padStart(base * this.baseSize, '0');
  }

  generateNeftyDNA(archetypeIndex: string, version?: string) {
    if (!archetypeIndex) throw new Error('Missing archetypeIndex');

    const dnaSchema = this.getDNASchema(version ?? this.latestSchemaVersion);
    const schemaVersion = dnaSchema.version;

    const categoryKey = this._getCategoryKeyFromName('nefties', dnaSchema.categories);

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

    const randomDNA = this.generateDNA(randomDNAlen, this.encodingBase);

    const dna = versionDNAFormat + categoryDNAFormat + archetypeDNAFormat + randomDNA;

    return dna;
  }

  private _unpad(v: string): string {
    return parseInt(v, this.encodingBase).toString();
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

  parse(dnaString: string, forcedVersion?: version): Parse {
    const dna = new DNA(dnaString, this.encodingBase);
    const dnaMajorVersion = dna.read(2);
    const dnaSchema = this.getDNASchema(forcedVersion ?? dnaMajorVersion);

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
    data['display_name'] = this.nefiesInfo.code_to_displayName[neftyNameCode];
    data['description'] = this.nefiesInfo.family_to_description[archetype.fixed_attributes.family as string];
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

  getDnaVersion(dnaString: string): string {
    const dna = new DNA(dnaString, this.encodingBase);
    const version = dna.read(2);
    return version;
  }

  getCategory(categoryName: string, dnaVersion: string): Category {
    const dnaSchema = this.getDNASchema(this._unpad(dnaVersion));
    const categoryIndex = this._getCategoryKeyFromName(categoryName, dnaSchema.categories);
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
