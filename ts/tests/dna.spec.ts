import { DNAFactory, EggsFactory, Rarity, utils } from '../src';
import nefties_info from '../src/deps/nefties_info.json';
import assert from 'assert';
import rarities from '../src/deps/rarities.json';
import { readdirSync, readFileSync } from 'fs';
import { LATEST_VERSION as LATEST_ADVENTURES_STATS_VERSION } from '../src/deps/schemas/adventures/latest';
import { LATEST_VERSION as LATEST_SCHEMA_VERSION } from '../src/deps/schemas/latest';
import { DNASchema } from '../src/interfaces/types';
import { execPath } from 'process';
import { TACTICS_ADV_NAMES_MAP } from '../src/constants';

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
];

const neftyCodeNamesProd = new Set([
  'Nefty_Axobubble',
  'Nefty_Bitebit',
  'Nefty_Dipking',
  'Nefty_Dinobit',
  'Nefty_ShibaIgnite',
  'Nefty_Zzoo',
  'Nefty_Blockchoy',
  'Nefty_Number9',
  'Nefty_Unika',
  'Nefty_Chocomint',
]);

const neftyFamiliesProd = new Set([
  'Axobubble',
  'Bitebit',
  'Dipking',
  'Dinobit',
  'Shiba',
  'Zzoo',
  'Blockchoy',
  'Number9',
  'Unika',
  'Chocomint',
]);

const passivesProd = new Set([
  'bitebitPassive',
  'SlipperySkin',
  'dinobitPassive',
  'shibaPassive',
  'PainfulShriek',
  'FreshGreens',
  'number9Passive',
  'tailekinesis',
  'Inspiring',
  'TastyMint',
]);

const ultimatesProd = new Set([
  'bouncingClaws',
  'ComboBreaker',
  'dinobit_bulldozer',
  'bigBark',
  'FlyingDrop',
  'Vitamins',
  'JumpScare',
  'bubbleOut',
  'Encore',
  'MightyMint',
]);

const abilitiesProd = new Set([
  'AppeaseFeelings',
  'AttackAndBack',
  'BodyGuard',
  'Dodge',
  'EtherBlast',
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
  'stompAttack',
  'pressureBomb',
  'fateSwap',
  'NoEscape',
  'Pulltergeist',
  'ComeAndPlay',
  'Kickback',
  'Overtake',
  'RainbowFlash',
  'FreshCherry',
  'FrostyMood',
  'RottenCherry',
]);

const allSchemaVersions = readdirSync('./src/deps/schemas')
  .filter((v) => v.endsWith('json'))
  .map((v) => {
    const index = v.indexOf('_v');
    return v.slice(index + 2, index + 7);
  });

describe('Basic', () => {
  it('DNA should parse', () => {
    const df = new DNAFactory();
    Object.entries(EggsFactory.getAllEggs()).forEach(([eggPk, eggInfo]) => {
      const ef = new EggsFactory(eggPk, df);
      const droppableNefties = ef.getDroppableNefties();
      droppableNefties.forEach(({ archetypeKey, archetype, displayName, description }) => {
        try {
          assert.ok(displayName);
          assert.ok(description);
          const dna = df.generateNeftyDNA(archetypeKey);
          const data = df.parse(dna);
          assert.ok(data.data);
          assert.ok(data.data.name);
          assert.ok(data.data.displayName);
          assert.ok(data.data.family);
          assert.ok(data.data.mp);
          assert.ok(data.data.passiveSkill);
          assert.ok(data.data.ultimateSkill);
          assert.ok(data.data.description);
          assert.ok(data.data.rarity);
          assert.ok(data.data.defaultImage);
          assert.ok(data.data.imageByGame);
          assert.ok(data.data.imageByGame.tactics);
          assert.ok(data.data.imageByGame.tactics.medium);
          assert.ok(data.data.imageByGame.tactics.small);
          assert.ok(Number.isInteger(data.data.hp));
          assert.ok(Number.isInteger(data.data.initiative));
          assert.ok(Number.isInteger(data.data.atk));
          assert.ok(Number.isInteger(data.data.def));
          assert.ok(Number.isInteger(data.data.eatk));
          assert.ok(Number.isInteger(data.data.edef));
          assert.ok(data.data.skill_a);
          assert.ok(data.data.skill_a_info);
          assert.ok(data.data.skill_a_info.name.EN);
          assert.ok(data.data.skill_a_info.description.EN);
          assert.ok(data.data.skill_b);
          assert.ok(data.data.skill_b_info);
          assert.ok(data.data.skill_b_info.name.EN);
          assert.ok(data.data.skill_b_info.description.EN);
          assert.ok(data.data.skill_c);
          assert.ok(data.data.skill_c_info);
          assert.ok(data.data.skill_c_info.name.EN);
          assert.ok(data.data.skill_c_info.description.EN);
          assert.ok(data.dataAdv);
          assert.ok(Number.isInteger(data.dataAdv.vitality));
          assert.ok(Number.isInteger(data.dataAdv.vitalityComputed));
          assert.ok(Number.isInteger(data.dataAdv.speed));
          assert.ok(Number.isInteger(data.dataAdv.speedComputed));
          assert.ok(Number.isInteger(data.dataAdv.power));
          assert.ok(Number.isInteger(data.dataAdv.powerComputed));
          assert.ok(Number.isInteger(data.dataAdv.defense));
          assert.ok(Number.isInteger(data.dataAdv.defenseComputed));
        } catch (e) {
          console.error(e);
          console.log(archetypeKey, archetype.fixed_attributes.name);
        }
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
    const df = new DNAFactory(undefined, undefined);
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    for (let index = 0; index < allSchemaVersions.length; index++) {
      const version = allSchemaVersions[index];
      const majorVersion = version.split('.')[0];
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, version);
      const parsed = df.parse(dna);
      const parsedMajorVersion = parsed.metadata.version.split('.')[0];
      assert.equal(majorVersion, parsedMajorVersion);
    }
  });
});

describe('Compute possible names, families and abilities', () => {
  it('Possible names, families, abilities, should be as expected', () => {
    const df = new DNAFactory();
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    const neftyIndex = ef.hatch().archetypeKey;
    const dna = df.generateNeftyDNA(neftyIndex);
    const category = df.getCategory('nefties', df.getDnaVersion(dna));
    const neftyNames = new Set();
    const neftyFamilies = new Set();
    const passives = new Set();
    const ultimates = new Set();
    const abilities = new Set();
    Object.values(category.archetypes).forEach(({ fixed_attributes, encoded_attributes }) => {
      neftyNames.add(fixed_attributes.name);
      neftyFamilies.add(fixed_attributes.family);
      passives.add(fixed_attributes.passiveSkill);
      ultimates.add(fixed_attributes.ultimateSkill);
      encoded_attributes.skill_a.forEach((v) => abilities.add(v));
      encoded_attributes.skill_b.forEach((v) => abilities.add(v));
      encoded_attributes.skill_c.forEach((v) => abilities.add(v));
    });
    assert.deepEqual(Array.from(neftyNames).sort(), Array.from(neftyCodeNamesProd).sort());
    assert.deepEqual(Array.from(neftyFamilies).sort(), Array.from(neftyFamiliesProd).sort());
    assert.deepEqual(Array.from(passives).sort(), Array.from(passivesProd).sort());
    assert.deepEqual(Array.from(ultimates).sort(), Array.from(ultimatesProd).sort());
    assert.deepEqual(Array.from(abilities).sort(), Array.from(abilitiesProd).sort());
  });
});

describe('Using previous schema 0.2.0', () => {
  it('Parsed stats should reflect the schema parameter as an input', () => {
    const forceVersion = '0.2.0';
    const df = new DNAFactory(undefined, undefined);
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    assert.throws(() => {
      // 7 does not exist on schema 0.2.0
      const dna = df.generateNeftyDNA('7', forceVersion);
      const p = df.parse(dna, forceVersion);
    });
    const dinobitArcchetypeIndex = '2';
    const dna = df.generateNeftyDNA(dinobitArcchetypeIndex, forceVersion);
    const parsed = df.parse(dna, forceVersion);
    assert.equal(parsed.data.name, 'Nefty_Dinobit');
    assert.equal(parsed.data.hp >= 640, true);
    assert.equal(parsed.data.hp <= 960, true);
  });
});

describe('Rarity', () => {
  it('Rarity is retured by parse even for version < v2', () => {
    const forceVersion = '0.4.0';
    const df = new DNAFactory(undefined, undefined);
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, forceVersion);
    const parsed = df.parse(dna, forceVersion);
    assert.ok(parsed.data.rarity);
  });

  it('Rarity matches the average stats for V2', () => {
    const df = new DNAFactory(undefined, undefined);
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    const rarityStats = ['hp', 'initiative', 'atk', 'def', 'eatk', 'edef'];
    Object.entries(rarities).forEach(([rarity, rarityInfo]) => {
      // for (let i = 0; i < 1e3; i++) {
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, '2.0.0', rarity as Rarity);
      const parsed = df.parse(dna);
      assert.deepEqual(parsed.data.rarity, rarity);
      const statsAvg =
        utils.getAverageFromRaw(
          rarityStats.map((v) => parsed.raw[v]),
          rarityStats.map((v) => 255)
        ) * 100;
      assert.deepEqual(df.getRarityFromStatsAvg(statsAvg), rarity);
      assert.ok(statsAvg >= rarityInfo.average_stats_range[0]);
      if (statsAvg === 100) assert.ok(statsAvg === rarityInfo.average_stats_range[1]);
      else assert.ok(statsAvg < rarityInfo.average_stats_range[1]);
      // }
    });
  });

  it('Rarity matches the average stats for latest version', () => {
    const df = new DNAFactory(undefined, undefined);
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    const rarityStats = ['hp', 'initiative', 'atk', 'def', 'eatk', 'edef'];
    Object.entries(rarities).forEach(([rarity, rarityInfo]) => {
      // for (let i = 0; i < 1e3; i++) {
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, undefined, rarity as Rarity);
      const parsed = df.parse(dna);
      assert.deepEqual(parsed.data.rarity, rarity);
      const statsAvg =
        utils.getAverageFromRaw(
          rarityStats.map((v) => parsed.raw[v]),
          rarityStats.map((v) => 255)
        ) * 100;
      assert.deepEqual(df.getRarityFromStatsAvg(statsAvg), rarity);
      assert.ok(statsAvg >= rarityInfo.average_stats_range[0]);
      if (statsAvg === 100) assert.ok(statsAvg === rarityInfo.average_stats_range[1]);
      else assert.ok(statsAvg < rarityInfo.average_stats_range[1]);
      // }
    });
  });
});

const adventuresStatsNames = [
  'bitebit',
  'dipking',
  'dinobit',
  'shiba ignite',
  'zzoo',
  'block choy',
  'number 9',
  'axobubble',
  'unika',
  'chocomint',
];

describe('Adventures', () => {
  it('All archetypes have adventure stats', () => {
    const schema: DNASchema = JSON.parse(
      readFileSync(`./src/deps/schemas/aurory_dna_v${LATEST_SCHEMA_VERSION}.json`, 'utf8')
    );
    Object.values(schema.categories['0'].archetypes).forEach((archetype) => {
      assert.ok(
        TACTICS_ADV_NAMES_MAP[archetype.fixed_attributes.name],
        `${archetype.fixed_attributes.name} not found in TACTICS_ADV_NAMES_MAP: ${JSON.stringify(
          TACTICS_ADV_NAMES_MAP
        )}`
      );
    });
  });
});
