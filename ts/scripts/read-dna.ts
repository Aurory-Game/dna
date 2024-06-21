import { DNAFactory } from '../src';

function run() {
  const dna = process.argv[2];
  const df = new DNAFactory();
  const data = df.parse(dna, '3.2.0');
  debugger;
  console.log(data);
}

run();
