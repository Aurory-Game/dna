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

describe("Compute possible names, families and abilities", () => {
  const version = path.join;
  const df = new DNAFactory();
  const ef = new EggsFactory();
  const neftyIndex = ef.hatch(0, 5);
  const dna = df.generateNeftyDNA(neftyIndex);
  const category = df.getCategory('nefties', df.getDnaVersion(dna))
  const neftyNames = new Set()
  const neftyFamilies = new Set()
  const passives = new Set()
  const ultimates = new Set()
  const abilities = new Set()
  Object.values(category.archetypes).forEach(({ fixed_attributes, encoded_attributes }) => {
    neftyNames.add(fixed_attributes.name)
    neftyFamilies.add(fixed_attributes.family)
    passives.add(fixed_attributes.passiveSkill)
    ultimates.add(fixed_attributes.passiveSkill)
    encoded_attributes.skill_a.forEach(v => abilities.add(v))
    encoded_attributes.skill_b.forEach(v => abilities.add(v))
    encoded_attributes.skill_c.forEach(v => abilities.add(v))
  })
  console.log('Names: ', neftyNames)
  console.log('Families: ', neftyFamilies)
  console.log('Passives: ', passives)
  console.log('Ultimates: ', passives)
  console.log('Abilities: ', passives)
});