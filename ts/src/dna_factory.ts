import randomBytes from "randombytes";
import fs from "fs";
import { DNASchema, Category } from "@interfaces/types";

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

  constructor(dnaBytes?: number, encodingBase?: number) {
    this.dnaBytes = dnaBytes ?? 64;
    this.encodingBase = encodingBase ?? 16;
    this.baseSize = this.encodingBase / 8;
    this.latestVersion = fs.readFileSync("src/schemas/latest.txt").toString();
    this.dnaSchemas = {
      [this.latestVersion]: this.loadDNASchema(this.latestVersion),
    };
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
    const schemaPath = `src/schemas/dna_schema_v${version}.json`;
    const dnaSchema = JSON.parse(fs.readFileSync(schemaPath).toString());
    if (version !== dnaSchema.version)
      throw new Error(
        `Versions missmatch: ${version} (filename) vs ${dnaSchema.version} (schema)`
      );
    return dnaSchema;
  }

  getDNASchema(version?: string): DNASchema {
    if (!version) return this.dnaSchemas[this.latestVersion];
    else if (this.dnaSchemas[version]) return this.dnaSchemas[version];

    this.dnaSchemas[version] = this.loadDNASchema(version);

    return this.dnaSchemas[version];
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
    const dnaSchema = this.getDNASchema(version);
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

  parse(dnaString: string) {
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
    };
  }
}
