// dna_override_tool.ts - simple manual override tool for DNA stats.
// -----------------------------------------------------------------------------------
// EDIT SECTION – Modify the two constants below only --------------------------------
// -----------------------------------------------------------------------------------

// Existing DNA you want to edit
const INPUT_DNA =
  '0004N4IgbgpgTgzglgewHYgFwgCwDoAMWCMIANCACYCGALuWqAOZTmkRogAOUcAtiyY55QCerAMIIuXZMRBIIAMyFjmAOXI9Wy+UID6AEThIEAIziVppODDYAbcoNXr0+wybMBfEhWoBBUmFogABZsaPgAnCRUANZoAOwkENGh8WTyoREgEMxyySRWEFloAEwAzG5uQA';

// Stats you wish to override (any or all). Leave out keys you don't want to change
const OVERRIDE_STATS = {
  hp: 70,
  // atk: 55,
  // def: 60,
  // speed: 80,
} as Partial<import('../../src/interfaces/types').ParseDataPerc>;

// -----------------------------------------------------------------------------------
// DO NOT EDIT BELOW THIS LINE --------------------------------------------------------
// -----------------------------------------------------------------------------------

import { DNAFactoryV2 as DNAFactory } from '../../src/dna_factory_v2';
import { ParseDataPerc } from '../../src/interfaces/types';
import { getAverageFromRaw, toPaddedHexa } from '../../src/utils';
import { compressToBase64 } from 'lz-string';

// Simple color helpers (avoid extra dependencies)
const color = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function paint(text: string, clr: keyof typeof color) {
  return `${color[clr]}${text}${color.reset}`;
}

// Local helper replicating DNAFactory private logic so we don't change the class itself
function buildDnaFromParts(
  version: string,
  data: import('../../src/interfaces/types').DnaData,
  dataAdv: ParseDataPerc
): string {
  const dnaData: import('../../src/interfaces/types').DnaDataV2 = {
    version,
    data,
    dataAdv,
  };
  const versionDNAFormat = toPaddedHexa(version, 4);
  const serialized = compressToBase64(JSON.stringify(dnaData));
  return versionDNAFormat + serialized;
}

function overrideDna() {
  const factory = new DNAFactory();

  // Parse original DNA
  const original = factory.parse(INPUT_DNA);

  // Merge stats (ensure all 6 fields, use factory helper for missing eatk/edef)
  let newStats: ParseDataPerc = {
    hp: OVERRIDE_STATS.hp ?? original.dataAdv.hp,
    atk: OVERRIDE_STATS.atk ?? original.dataAdv.atk,
    eatk: OVERRIDE_STATS.eatk ?? original.dataAdv.eatk,
    def: OVERRIDE_STATS.def ?? original.dataAdv.def,
    edef: OVERRIDE_STATS.edef ?? original.dataAdv.edef,
    speed: OVERRIDE_STATS.speed ?? original.dataAdv.speed,
  };

  // If eatk or edef are missing, use factory to fill them in
  if (newStats.eatk === undefined || newStats.edef === undefined) {
    newStats = factory.createDataAdvFromExisting(original.data, newStats);
  }

  // Compute new rarity depending on stats average (use all 6 stats)
  const statsArr = [newStats.hp, newStats.atk, newStats.eatk, newStats.def, newStats.edef, newStats.speed];
  const avg =
    getAverageFromRaw(
      statsArr,
      statsArr.map(() => 100)
    ) * 100;
  const newRarity = factory.getRarityFromStatsAvg(avg, false, original.data.grade) ?? original.data.rarity;

  // Build data object (clone of original with updated rarity)
  const newData = {
    grade: original.data.grade,
    neftyCodeName: original.data.neftyCodeName,
    rarity: newRarity,
  } as import('../../src/interfaces/types').DnaData;

  const newDna = buildDnaFromParts(original.version, newData, newStats);

  // Double-check parsing works
  const parsedNew = factory.parse(newDna);

  // Render diff
  console.log(paint('\n========= DNA OVERRIDE RESULT =========', 'cyan'));
  console.log(`${paint('Original DNA', 'yellow')}: ${INPUT_DNA}`);
  console.log(`${paint('New DNA     ', 'green')}: ${newDna}\n`);

  console.log(paint('--- Stats Comparison ---', 'cyan'));
  (['hp', 'atk', 'eatk', 'def', 'edef', 'speed'] as (keyof ParseDataPerc)[]).forEach((key) => {
    const o = original.dataAdv[key];
    const n = parsedNew.dataAdv[key];
    const changed = o !== n;
    const line = `${key.toUpperCase().padEnd(5)} : ${o.toString().padStart(3)} -> ${n.toString().padStart(3)}`;
    console.log(changed ? paint(line, 'green') : line);
  });

  console.log('\n');
  console.log(`${paint('Rarity', 'bold')}: ${original.data.rarity} -> ${paint(parsedNew.data.rarity, 'green')}`);
  console.log(paint('========================================\n', 'cyan'));
}

// Execute immediately when the file is run
overrideDna();
