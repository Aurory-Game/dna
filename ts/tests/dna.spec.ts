import { DNAFactory, EggsFactory } from "../src";
import assert from 'assert';
import { isTypedArray } from "util/types";

describe("Basic", () => {
  it('DNA should parse', () => {
    const df = new DNAFactory();
    const ef = new EggsFactory();
    const neftyIndex = ef.hatch(0, 5);
    const dna = df.generateNeftyDNA(neftyIndex);
    const data = df.parse(dna);
    console.log(data);
  });
});

describe("Compute possible names, families and abilities", () => {
  it('Possible names, families, abilities, should be as expected', () => {
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
      ultimates.add(fixed_attributes.ultimateSkill)
      encoded_attributes.skill_a.forEach(v => abilities.add(v))
      encoded_attributes.skill_b.forEach(v => abilities.add(v))
      encoded_attributes.skill_c.forEach(v => abilities.add(v))
    });
    assert.deepEqual(neftyNames, new Set([
      'Nefty_Bitebit',
      'Nefty_Dipking',
      'Nefty_Dinobit',
      'Nefty_ShibaIgnite',
      'Nefty_Zzoo',
      'Nefty_Blockchoy',
      'Nefty_Number9'
    ]));
    assert.deepEqual(neftyFamilies, new Set([
      'Bitebit',
      'Dipking',
      'Dinobit',
      'Shiba',
      'Zzoo',
      'Blockchoy',
      'Number9'
    ]));
    assert.deepEqual(passives, new Set([
      'bitebitPassive',
      'SlipperySkin',
      'dinobitPassive',
      'shibaPassive',
      'zzooPassive',
      'FreshGreens',
      'number9Passive'
    ]));
    assert.deepEqual(ultimates, new Set([
      'bouncingClaws',
      'ComboBreaker',
      'dinobit_bulldozer',
      'bigBark',
      'FlyingDrop',
      'Vitamins',
      'JumpScare'
    ]));
    assert.deepEqual(abilities, new Set([
      'AppeaseFeelings',
      'AttackAndBack',
      'BodyGuard',
      'Dodge',
      'EtherBlast',
      'FlyingEvade',
      'GroundControl',
      'LifeCycle',
      'LifeforceSink',
      'RootsEmbrace',
      'ScarringAttack',
      'SharpGust',
      'ShoutBorn',
      'SoulConduit',
      'TankBuster',
      'Throwback',
      'backlineDrop',
      'clashStance',
      'defensiveDome',
      'stompAttack'
    ]));
  });
});

describe("Using previous schema 0.1.0", () => {
  it('Parsed stats should reflect the schema parameter as an input', () => {
    const df = new DNAFactory(null, null, "0.1.0");
    const ef = new EggsFactory();
    assert.throws(() => {
      // 6 does not exist on schema 0.1.0
      const neftyIndex = ef.hatch(6, 6);
      const dna = df.generateNeftyDNA(neftyIndex);
      df.parse(dna)
    });
    const neftyIndex = ef.hatch(2, 2);
    const dna = df.generateNeftyDNA(neftyIndex);
    const parsed = df.parse(dna);
    assert.equal(parsed.data.name, 'Nefty_Dinobit');
    assert.equal(parsed.data.hp >= 90, true)
    assert.equal(parsed.data.hp <= 180, true)
  });
});
