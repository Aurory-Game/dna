import randomBytes from "randombytes";
import { DNASchema, Category, Parse } from "./interfaces/types";
import { isNode } from "./utils/platform";

const fs = isNode ? require("fs") : require("browserify-fs");
const path = isNode ? require("path") : require("path-browserify");

type version = string | number;

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
  isNode: boolean;
  dnaSchemas: Record<version, DNASchema>;
  latestVersion: string;
  dnaBytes: number;
  encodingBase: number;
  baseSize: number;
  latestSubversions: Record<version, version>

  constructor(dnaBytes?: number, encodingBase?: number, schemaVersion?: string) {
    this.dnaBytes = dnaBytes ?? 64;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
    this.latestVersion = this.getLatestVersion();
    const version = schemaVersion ? schemaVersion : this.latestVersion;
    this.dnaSchemas = {
      [this.latestVersion]: this.loadDNASchema(version),
    };
    this.latestSubversions = {
      [parseInt(this.latestVersion).toString()]: this.latestVersion
    };
  }

  getLatestVersion() {
    return fs
      .readFileSync(path.resolve(__dirname, "schemas/latest.txt"))
      .toString()
      .trim();
  }

  generateDNA(storageSize: number, encodingBase?: number): string | Buffer {
    const data = randomBytes(storageSize);
    if (!encodingBase) return data;
    switch (encodingBase) {
      case 64:
        return data.toString("base64");
      case 16:
        return data.toString("hex");
      default:
        throw new Error(`Encoding ${encodingBase} not supported. Try 16 or 64`);
    }
  }

  loadDNASchema(version: string) {
    const schemaPath = path.resolve(
      __dirname,
      `schemas/aurory_dna_v${version}.json`
    );
    const dnaSchema = JSON.parse(fs.readFileSync(schemaPath).toString());
    if (version !== dnaSchema.version)
      throw new Error(
        `Versions mismatch: ${version} (filename) vs ${dnaSchema.version} (schema)`
      );
    return dnaSchema;
  }

  getLatestSubversion(schemaVersion?: string): string {
    if (schemaVersion.includes('.')) return schemaVersion

    const schemasDir = path.resolve(
      __dirname,
      `schemas/`
    );
    let completeVersion = undefined
    let completeVersionSplit = undefined
    const reg = /.+v(.+)\.(text|json)/
    fs.readdirSync(schemasDir).forEach(v => {
      const regResult = reg.exec(v)
      if (!regResult || regResult.length < 2) return

      const localCompleteVersion = regResult[1]

      if (!completeVersion) {
        completeVersion = localCompleteVersion
        completeVersionSplit = localCompleteVersion.split('.')
        return
      }

      const localCompleteVersionSplit = localCompleteVersion.split('.')
      for (let index = 0; index < 3; index++) {
        if (completeVersionSplit[index] === localCompleteVersionSplit[index]) continue
        else if (completeVersionSplit[index] > localCompleteVersionSplit[index]) break
        completeVersion = localCompleteVersion
        completeVersionSplit = localCompleteVersionSplit
      }
    })

    if (!completeVersion) throw new Error(`No complete version found for ${schemaVersion}`)

    return completeVersion
  }

  getDNASchema(version?: string): DNASchema {
    if (!version) return this.dnaSchemas[this.latestVersion];
    else if (this.dnaSchemas[version]) return this.dnaSchemas[version];
    else if (this.latestSubversions[version]) return this.dnaSchemas[this.latestSubversions[version]]

    const completeVersion = version.includes('.') ? version : this.getLatestSubversion(version);
    console.log(completeVersion)
    this.dnaSchemas[completeVersion] = this.loadDNASchema(completeVersion);

    return this.dnaSchemas[completeVersion];
  }

  private _getCategoryKeyFromName(
    name: string,
    categories: Record<string, Category>
  ) {
    for (const categoryKey in categories) {
      if (categories[categoryKey].name === name) return categoryKey;
    }
    throw new Error(`Category with name "${name}" not found`);
  }

  private _toPaddedBase(n: string, base: number): string {
    return parseInt(n)
      .toString(this.encodingBase)
      .padStart(base * this.baseSize, "0");
  }

  generateNeftyDNA(archetypeIndex: string, version?: string) {
    if (!archetypeIndex) throw new Error("Missing archetypeIndex");

    const dnaSchema = this.getDNASchema(version ?? this.latestVersion);
    const schemaVersion = dnaSchema.version;

    const categoryKey = this._getCategoryKeyFromName(
      "nefties",
      dnaSchema.categories
    );

    const versionGeneInfo = dnaSchema.global_genes_header.find(
      (gene_header) => gene_header.name === "version"
    );
    const categoryGeneInfo = dnaSchema.global_genes_header.find(
      (gene_header) => gene_header.name === "category"
    );
    const archetypeGeneInfo = dnaSchema.categories[
      categoryKey
    ].category_genes_header.find(
      (gene_header) => gene_header.name === "archetype"
    );

    const versionDNAFormat = this._toPaddedBase(
      schemaVersion,
      versionGeneInfo.base
    );
    const categoryDNAFormat = this._toPaddedBase(
      categoryKey,
      categoryGeneInfo.base
    );
    const archetypeDNAFormat = this._toPaddedBase(
      archetypeIndex,
      archetypeGeneInfo.base
    );

    const randomDNAlen =
      this.dnaBytes -
      versionGeneInfo.base -
      categoryGeneInfo.base -
      archetypeGeneInfo.base;

    const randomDNA = this.generateDNA(randomDNAlen, this.encodingBase);

    const dna =
      versionDNAFormat + categoryDNAFormat + archetypeDNAFormat + randomDNA;

    return dna;
  }

  private _unpad(v: string): string {
    return parseInt(v, this.encodingBase).toString();
  }

  parse(dnaString: string): Parse {
    const dna = new DNA(dnaString, this.encodingBase);
    const version = dna.read(2);
    const dnaSchema = this.getDNASchema(this._unpad(version));
    const categoryGeneInfo = dnaSchema.global_genes_header.find(
      (gene_header) => gene_header.name === "category"
    );
    const categoryIndex = dna.read(categoryGeneInfo.base);
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
    const archetypeGeneInfo = category.category_genes_header.find(
      (gene_header) => gene_header.name === "archetype"
    );
    const archetypeIndex = dna.read(archetypeGeneInfo.base);
    const archetype = category.archetypes[this._unpad(archetypeIndex)];
    const data = Object.assign({}, archetype.fixed_attributes);
    const raw = {};
    const encoded_attributes = archetype.encoded_attributes;
    for (const gene of category.genes) {
      const encoded_attribute = encoded_attributes[gene.name];
      if (!encoded_attribute)
        throw new Error(`Gene ${gene.name} not found in archetype`);
      const value = parseInt(dna.read(gene.base), this.encodingBase);
      raw[gene.name] = value;
      if (gene.type === "range_completeness") {
        const completeness = value / (Math.pow(2, gene.base * 8) - 1);
        data[gene.name] = Math.round(
          completeness *
          ((encoded_attribute[1] as number) -
            (encoded_attribute[0] as number)) +
          (encoded_attribute[0] as number)
        );
      } else if (gene.type === "index") {
        const rangedValue = value % encoded_attribute.length;
        data[gene.name] = encoded_attribute[rangedValue];
      } else throw new Error(`Gene type ${gene.type} not supported.`);
    }
    return {
      data,
      raw,
      metadata: { version: this._unpad(version) },
      archetype,
      genes: category.genes
    };
  }

  getDnaVersion(dnaString: string): string {
    const dna = new DNA(dnaString, this.encodingBase);
    const version = dna.read(2);
    return version
  }

  getCategory(categoryName: string, dnaVersion: string): Category {
    const dnaSchema = this.getDNASchema(this._unpad(dnaVersion));
    const categoryIndex = this._getCategoryKeyFromName(
      categoryName,
      dnaSchema.categories
    );
    const category = dnaSchema.categories[this._unpad(categoryIndex)];
    return category
  }
}
