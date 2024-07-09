import { DNAFactory, EggsFactory, Rarity, utils } from '../src';
import nefties_info from '../src/deps/nefties_info.json';
import assert from 'assert';
import raritiesGeneration from '../src/deps/rarities_generation.json';
import { readdirSync, readFileSync } from 'fs';
import { DNASchema, DNASchemaV4, NeftyCodeName, ParseDataPerc } from '../src/interfaces/types';
import { LAST_SUPPORTED_VERSION_BY_V1, TACTICS_ADV_NAMES_MAP } from '../src/constants';
import { LATEST_VERSION } from '../src/deps/schemas/latest';

const displayNamesProd = [
  'Axobubble',
  'Bitebit',
  'Dipking',
  'Dinobit',
  'Shiba Ignite',
  'Zzoo',
  'Block Choy',
  'Number 9',
  'Unika',
  'Chocomint',
  'Cybertooth',
  'Wassie',
  'Dracurve',
  'Raccoin',
  'Shibark',
  'Unikirin',
  'Beeblock',
  'Chocorex',
  'Keybab',
  'Bloomtail',
];

const allSchemaVersions = readdirSync('./src/deps/schemas')
  .filter((v) => v.endsWith('json'))
  .map((v) => {
    const index = v.indexOf('_v');
    return v.slice(index + 2, index + 7);
  })
  .filter((v) => parseInt(v.split('.')[0]) > 3);

describe('Basic', () => {
  it('DNA should parse', () => {
    const df = new DNAFactory();
    Object.entries(EggsFactory.getAllEggs()).forEach(([eggPk, eggInfo]) => {
      const ef = new EggsFactory(eggPk, df);
      const droppableNefties = ef.getDroppableNefties();
      const schema = df.getDNASchema(LATEST_VERSION);
      const archetypes = Object.entries(schema.archetypes);
      droppableNefties.forEach(({ neftyCodeName, displayName }) => {
        assert.ok(displayName);
        assert.ok(neftyCodeName);
        assert.ok(TACTICS_ADV_NAMES_MAP[neftyCodeName]);
        const archetypeKey = df.getArchetypeKeyByNeftyCodeName(neftyCodeName);
        assert.ok(archetypeKey);
        assert.ok(nefties_info.code_to_displayName[neftyCodeName]);
        assert.ok(
          (nefties_info.family_to_description as any)[
            nefties_info.code_to_displayName[neftyCodeName].replace(/\s+/g, '')
          ],
          `Family description not found for ${nefties_info.code_to_displayName[neftyCodeName].replace(/\s+/g, '')}`
        );
        const dna = df.generateNeftyDNA(archetypeKey, 'prime');
        const data = df.parse(dna);
        assert.ok(data.data);
        assert.ok(data.data.grade);
        assert.ok(data.data.neftyCodeName);
        assert.ok(data.data.rarity);
        assert.ok(data.dataAdv);
        assert.ok(Number.isInteger(data.dataAdv.atk));
        assert.ok(Number.isInteger(data.dataAdv.def));
        assert.ok(Number.isInteger(data.dataAdv.hp));
        assert.ok(Number.isInteger(data.dataAdv.speed));
        assert.ok(Number.isInteger(data.dataAdv.atkComputed));
        assert.ok(Number.isInteger(data.dataAdv.defComputed));
        assert.ok(Number.isInteger(data.dataAdv.hpComputed));
        assert.ok(Number.isInteger(data.dataAdv.speedComputed));
        assert.ok(data.version);
      });
    });
  });

  // Display names are used to compute image URLs
  it('Ensure display names never change', () => {
    Object.values(nefties_info.code_to_displayName).forEach((displayName) => {
      assert(displayNamesProd.includes(displayName), `${displayName} is not in displayNamesProd`);
    });
  });

  it('Generated Nefty DNA version matches forced version', () => {
    const df = new DNAFactory();
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    for (let index = 0; index < allSchemaVersions.length; index++) {
      const version = allSchemaVersions[index];
      const majorVersion = version.split('.')[0];
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, 'prime', version);
      const parsed = df.parse(dna);
      const parsedMajorVersion = parsed.version.split('.')[0];
      assert.equal(majorVersion, parsedMajorVersion);
    }
  });
});

describe('Rarity', () => {
  it('Rarity matches the average stats for latest version', () => {
    const df = new DNAFactory();
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    const rarityStats: (keyof ParseDataPerc)[] = ['hp', 'atk', 'def', 'speed'];
    Object.entries(raritiesGeneration.prime).forEach(([rarity, rarityInfo]) => {
      // for (let i = 0; i < 1e3; i++) {
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, 'prime', undefined, rarity as Rarity);
      const parsed = df.parse(dna);
      assert.deepEqual(parsed.data.rarity, rarity);
      const statsAvg =
        utils.getAverageFromRaw(
          rarityStats.map((v) => parsed.dataAdv[v]),
          rarityStats.map((v) => 100)
        ) * 100;
      assert.deepEqual(df.getRarityFromStatsAvg(statsAvg), rarity);
      assert.ok(statsAvg >= rarityInfo.average_stats_range[0]);
      if (statsAvg === 100) assert.ok(statsAvg === rarityInfo.average_stats_range[1]);
      else assert.ok(statsAvg < rarityInfo.average_stats_range[1]);
    });
  });
});

describe('starter eggs', () => {
  it('Starter egg should be hatched with constant stats and rarity', () => {
    const standardEggs = EggsFactory.getAllStandardEggs();
    const eggPk = Object.keys(standardEggs)[0];
    const df = new DNAFactory();
    const ef = new EggsFactory(eggPk, df);
    for (let index = 0; index < 10; index++) {
      const dna = df.generateStarterNeftyDNA(ef.hatchStandard().archetypeKey);
      assert(dna);
      const data = df.parse(dna);
      const expectedRawStatValue = 30;
      assert.equal(['Dipking', 'Block Choy', 'Number 9'].includes(data.data.displayName), true);
      assert.equal(data.dataAdv.hp, expectedRawStatValue);
      assert.equal(data.dataAdv.atk, expectedRawStatValue);
      assert.equal(data.dataAdv.def, expectedRawStatValue);
      assert.equal(data.dataAdv.speed, expectedRawStatValue);
    }
  });
});

describe('standard eggs', () => {
  it('all standard eggs should be hatchable', () => {
    const df = new DNAFactory();
    const standardEggs = EggsFactory.getAllStandardEggs();
    Object.keys(standardEggs).forEach((eggName) => {
      const ef = new EggsFactory(eggName, df);
      const archetypeKey = ef.hatchStandard().archetypeKey;
      if (eggName === 'starter_egg') {
        const dna = df.generateStarterNeftyDNA(archetypeKey);
        assert(dna);
        const parsedDna = df.parse(dna);
        assert.equal(standardEggs[eggName].archetypes.includes(parsedDna.data.neftyCodeName), true);
      } else {
        const dna = df.generateNeftyDNA(archetypeKey, 'standard');
        assert(dna);
        const parsedDna = df.parse(dna);
        assert.equal(standardEggs[eggName].archetypes.includes(parsedDna.data.neftyCodeName), true);
      }
    });
  });
});

describe('droppable nefties', () => {
  const df = new DNAFactory();
  it('all standard eggs archetypes are droppable', () => {
    const standardEggs = EggsFactory.getAllStandardEggs();
    Object.keys(standardEggs).forEach((eggName) => {
      const ef = new EggsFactory(eggName, df);
      const droppableStandardNefties = ef.getDroppableStandardNefties();

      assert(droppableStandardNefties);
      assert.equal(droppableStandardNefties.length, standardEggs[eggName].archetypes.length);
    });
  });
  it('all prime eggs neftie archetypes are droppable', () => {
    const primeEggs = EggsFactory.getAllEggs();
    Object.keys(primeEggs).forEach((eggName) => {
      const ef = new EggsFactory(eggName, df);
      const droppableNefties = ef.getDroppableNefties();

      assert(droppableNefties);
      assert.equal(droppableNefties.length, primeEggs[eggName].archetypes.length);
    });
  });
});