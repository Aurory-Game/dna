import { DNAFactory, EggsFactory } from "../src";
import fs from "fs";
import path from "path";

describe("Basic", () => {
  const version = path.join;
  const df = new DNAFactory();
  const ef = new EggsFactory();
  const neftyIndex = ef.hatch(0, 5);
  const dna = df.generateNeftyDNA(neftyIndex);
  const data = df.parse(dna);
  console.log(data);
});
