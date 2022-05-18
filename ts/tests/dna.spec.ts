import { DNAFactory, EggsFactory } from "../src";

describe("Basic", () => {
  const df = new DNAFactory();
  const ef = new EggsFactory();
  const neftyIndex = ef.hatch(0, 0);
  const dna = df.generateNeftyDNA(neftyIndex);
  const data = df.parse(dna);
  console.log(data);
});
