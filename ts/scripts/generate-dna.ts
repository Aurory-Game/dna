import { DNAFactory, EggsFactory } from '../src';

function run() {
  const df = new DNAFactory();
  const eggs = EggsFactory.getAllEggs();
  const dna = df.generateNeftyDNA('0', 'prime');
  const data = df.parse(dna);
  console.log(data);
}

run();
