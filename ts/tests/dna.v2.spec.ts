import { DNAFactory } from '../src';

describe('Basic', () => {
  it('should work', () => {
    const df = new DNAFactory();
    const dna = df.generateNeftyDNA('0', 'prime');
    console.log(dna);
    const parsed = df.parse(dna);
    console.log(parsed);
  });
});
