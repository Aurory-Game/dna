import randomBytes from 'randombytes';
import { DNASchema, Category, Parse } from './interfaces/types';
import dnaSchemaV1 from './schemas/aurory_dna_v0.1.0.json';
import dnaSchemaV2 from './schemas/aurory_dna_v0.2.0.json';
import { LATEST_VERSION } from './schemas/latest';

type version = string | number;

const dnaSchemas: Record<version, DNASchema> = {
  '0.1.0': dnaSchemaV1 as DNASchema,
  '0.2.0': dnaSchemaV2 as DNASchema,
};

const versions = Object.keys(dnaSchemas);

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
  latestVersion: string;
  dnaBytes: number;
  encodingBase: number;
  baseSize: number;
  latestSubversions: Record<version, version>;

  constructor(dnaBytes?: number, encodingBase?: number, schemaVersion?: string) {
    this.dnaBytes = dnaBytes ?? 64;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
    this.latestVersion = LATEST_VERSION;
    const version = schemaVersion ? schemaVersion : this.latestVersion;
    this.dnaSchemas = {
      [this.latestVersion]: this.loadDNASchema(version),
    };
    this.latestSubversions = {
      [parseInt(this.latestVersion).toString()]: this.latestVersion,
    };
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

  getLatestSubversion(schemaVersion?: string): string | null {
    if (schemaVersion?.includes('.')) return schemaVersion;

    let completeVersion = undefined;
    let completeVersionSplit: string[] = [];
    const reg = /.+v(.+)\.(text|json)/;

    for (const v of versions) {
      const regResult = reg.exec(v);
      if (!regResult || regResult.length < 2) return null;

      const localCompleteVersion = regResult[1];

      if (!completeVersion) {
        completeVersion = localCompleteVersion;
        completeVersionSplit = localCompleteVersion.split('.');
        return null;
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

    if (schemaVersion) {
      this.latestSubversions[schemaVersion] = completeVersion;
    }

    return completeVersion;
  }

  getDNASchema(version?: string): DNASchema {
    if (!version) return this.dnaSchemas[this.latestVersion];
    else if (this.dnaSchemas[version]) return this.dnaSchemas[version];
    else if (this.latestSubversions[version]) return this.dnaSchemas[this.latestSubversions[version]];

    const completeVersion = version.includes('.') ? version : this.getLatestSubversion(version);

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

    const dnaSchema = this.getDNASchema(version ?? this.latestVersion);
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

  parse(dnaString: string): Parse {
    const dna = new DNA(dnaString, this.encodingBase);
    const version = dna.read(2);
    const dnaSchema = this.getDNASchema(this._unpad(version));
    const categoryGeneInfo = dnaSchema.global_genes_header.find((gene_header) => gene_header.name === 'category');
    if (!categoryGeneInfo) throw new Error('Missing category gene');
    const categoryIndex = dna.read(categoryGeneInfo.base);
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
    const archetypeGeneInfo = category.category_genes_header.find((gene_header) => gene_header.name === 'archetype');
    if (!archetypeGeneInfo) throw new Error('Missing archetype gene');
    const archetypeIndex = dna.read(archetypeGeneInfo.base);
    const archetype = category.archetypes[this._unpad(archetypeIndex)];
    const data = Object.assign({}, archetype.fixed_attributes);
    const raw: Record<string, number> = {};
    const encoded_attributes = archetype.encoded_attributes;
    for (const gene of category.genes) {
      const encoded_attribute = encoded_attributes[gene.name];
      if (!encoded_attribute) throw new Error(`Gene ${gene.name} not found in archetype`);
      const value = parseInt(dna.read(gene.base), this.encodingBase);
      raw[gene.name] = value;
      if (gene.type === 'range_completeness') {
        const completeness = value / (Math.pow(2, gene.base * 8) - 1);
        data[gene.name] = Math.round(
          completeness * ((encoded_attribute[1] as number) - (encoded_attribute[0] as number)) +
            (encoded_attribute[0] as number)
        );
      } else if (gene.type === 'index') {
        const rangedValue = value % encoded_attribute.length;
        data[gene.name] = encoded_attribute[rangedValue];
      } else throw new Error(`Gene type ${gene.type} not supported.`);
    }
    return {
      data,
      raw,
      metadata: { version: this._unpad(version) },
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
}
