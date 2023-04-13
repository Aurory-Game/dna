import { Archetype, Gene, DNASchema, GeneWithValues } from './interfaces/types';
import { DNA } from './dna';
import { unpad } from './utils';

export class DNASchemaReader {
  version: string;
  versionDate: string;
  globalGenesHeader: Record<string, string>;
  categoryName: string;
  categoryGenesHeader: Record<string, string>;
  genes: GeneWithValues[];
  archetype: Archetype;
  categoryKey: string;
  statsRawSum: number;

  constructor(dnaSchema: DNASchema, dna: DNA, resetDNA = true) {
    // make sure dna offset is at 0;
    resetDNA && dna.reset();
    this.version = dnaSchema.version;
    this.versionDate = dnaSchema.version_date;
    this.globalGenesHeader = {};
    dnaSchema.global_genes_header.forEach((gene: Gene) => {
      this.globalGenesHeader[gene.name] = unpad(dna.read(gene.base), dna.encodingBase);
    });
    this.categoryKey = this.globalGenesHeader.category;
    this.categoryName = dnaSchema.categories[this.categoryKey].name;
    this.categoryGenesHeader = {};
    dnaSchema.categories[this.categoryKey].category_genes_header.forEach((gene: Gene) => {
      this.categoryGenesHeader[gene.name] = unpad(dna.read(gene.base), dna.encodingBase);
    });
    this.statsRawSum = 0;
    this.archetype = dnaSchema.categories[this.categoryKey].archetypes[this.categoryGenesHeader['archetype']];

    this.genes = dnaSchema.categories[this.categoryKey].genes.map((gene: Gene) => {
      const rawValue = parseInt(dna.read(gene.base), dna.encodingBase);
      const encodedAttribute = this.archetype.encoded_attributes[gene.name];
      const result = { ...gene } as GeneWithValues;
      result.rawValue = rawValue;
      if (gene.type === 'range_completeness') {
        result.completeness = rawValue / (Math.pow(2, gene.base * 8) - 1);
        this.statsRawSum += result.completeness;
        result.value = Math.round(
          result.completeness * ((encodedAttribute[1] as number) - (encodedAttribute[0] as number)) +
            (encodedAttribute[0] as number)
        );
      } else if (gene.type === 'index') {
        const rangedValue = rawValue % encodedAttribute.length;
        result.value = encodedAttribute[rangedValue] as string;
      } else throw new Error(`Gene type ${gene.type} not supported.`);
      return result;
    });
  }

  getCompletenessGenes() {
    return this.genes.filter((gene) => gene.type === 'range_completeness');
  }

  getIndexGenes() {
    return this.genes.filter((gene) => gene.type === 'index');
  }
}
