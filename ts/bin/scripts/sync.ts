import * as fs from 'fs';
import dotenv from 'dotenv';
import { camelCase } from 'camel-case';

import abilitiesDictionaryV4 from '../../src/deps/dictionaries/abilities_dictionary_v0.4.0_old.json';

import { GoogleSpreadsheet } from 'google-spreadsheet';

dotenv.config();

const ABILITIES_SPREADSHEET_ID = '1F6eLu-QJfhsh6IatTcn2jwvNkmN1QBa-8CF91Gze1eM';

// Key is name from spreadsheet, while value is skill from dna. skill is also used in v0.4.0 dictionary
const mapSpreadsheetToAbilitySkills: { [key: string]: string } = {
  BULLDOZER: 'dinobit_bulldozer',
  DODGE: 'Dodge',
  SHOUT_BORN: 'ShoutBorn',
  LIFEFORCE_DRAIN: 'LifeforceSink',
  FLYING: 'FlyingEvade',
  SKY_DROP: 'FlyingDrop',
  ATTACK_AND_BACK: 'AttackAndBack',
  SHARP_GUST: 'SharpGust',
  ETHER_BLAST: 'EtherBlast',
  TANK_BUSTER: 'TankBuster',
  COMBO_BREAKER: 'ComboBreaker',
  APPEASE_FEELINGS: 'AppeaseFeelings',
  LIFE_CYCLE: 'LifeCycle',
  ROOT: 'Root',
  SLIPPERY_SKIN: 'SlipperySkin',
  THROWBACK: 'Throwback',
  ROOT_EMBRACE: 'RootsEmbrace',
  VITAGREENS: 'Vitamins',
  BODYGUARD: 'BodyGuard',
  PACK_PROTECTOR: 'shibaPassive',
  CATRENALINE: 'bitebitPassive',
  PAINFUL_SHRIEK: 'PainfulShriek',
  UNSTOPPABLE_FORCE: 'dinobitPassive',
  UNREVEALED_ABILITY: 'MysteryAbility',
  JUMP_SCARE: 'JumpScare',
};

const TRANSLATIONS_DIR = 'src/deps/dictionaries';

const LOCALES = ['en', 'fr', 'de', 'it', 'zh', 'zh-TW', 'es', 'pt'];
const REMOTE_LOCALES = new Map([
  ['en', 'ENGLISH'],
  ['fr', 'FRENCH'],
  ['de', 'GERMAN'],
  ['it', 'ITALIAN'],
  ['zh', 'SIMPLIFIED CHINESE'],
  ['zh-TW', 'TRADITIONAL CHINESE'],
  ['es', 'SPANISH'],
  ['pt', 'BRAZILIAN PORTUGUESE'],
]);

// abilities spreadsheet declarations.

const abilityNameSignatures = [
  { key: '[ABILITY_NAME_', type: 'ability' },
  { key: '[PASSIVE_NAME_', type: 'passive' },
  { key: '[STATUS_NAME_', type: 'status' },
];

const abilityDescriptionSignatures = [
  { key: '[ABILITY_DESCRIPTION_', type: 'ability' },
  { key: '[PASSIVE_DESCRIPTION_', type: 'passive' },
  { key: '[STATUS_DESCRIPTION_', type: 'status' },
];

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function main() {
  // sync from abilities spread sheet
  await syncAbilitiesData();
}

async function syncAbilitiesData() {
  const { remoteData: rows } = await getAbilitiesRemoteData();

  const abilities: Record<string, Record<string, Record<string, string>>> = {};

  for (const row of rows) {
    for (const locale of LOCALES) {
      for (const signature of abilityNameSignatures) {
        let name = row['KEY'].split(signature.key)[1];

        if (name) {
          name = name.slice(0, -1);

          name = mapSpreadsheetToAbilitySkills[name] ? mapSpreadsheetToAbilitySkills[name] : camelCase(name);

          abilities[`creatureAbility.${name}.name`] = {
            ...abilities?.[`creatureAbility.${name}.name`],
            [locale.toUpperCase()]: row[REMOTE_LOCALES.get(locale)!],
          };
        }
      }

      for (const signature of abilityDescriptionSignatures) {
        let name = row['KEY'].split(signature.key)[1];

        if (name) {
          name = name.slice(0, -1);

          name = mapSpreadsheetToAbilitySkills[name] ? mapSpreadsheetToAbilitySkills[name] : camelCase(name);

          abilities[`creatureAbility.${name}.description`] = {
            ...abilities?.[`creatureAbility.${name}.description`],
            [locale.toUpperCase()]: row[REMOTE_LOCALES.get(locale)!],
          };
        }
      }
    }
  }

  const abilitiesDictionary = {
    version: '0.4.0',
    version_date: '12/09/2023',
    keywords: { ...abilitiesDictionaryV4, ...abilities },
  };

  const nsFile = `${TRANSLATIONS_DIR}/abilities_dictionary_v0.4.0.json`;

  fs.writeFileSync(nsFile, JSON.stringify(abilitiesDictionary, null, 2), 'utf8');
}

async function getRemoteData(docId: string, sheetTitle: string) {
  const doc = new GoogleSpreadsheet(docId);
  doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  });
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[sheetTitle];

  const remoteData = (await sheet.getRows()).filter((row) => !!row['KEY']);
  return {
    sheet,
    remoteData,
  };
}

async function getAbilitiesRemoteData() {
  const { sheet, remoteData } = await getRemoteData(ABILITIES_SPREADSHEET_ID, 'Aurory Tactics');

  return {
    sheet,
    // Get only rows that translate ability names.
    remoteData: remoteData.filter(
      (row) =>
        abilityNameSignatures.filter((signature) => row['KEY'].startsWith(signature.key)).length > 0 ||
        abilityDescriptionSignatures.filter((signature) => row['KEY'].startsWith(signature.key)).length > 0
    ),
  };
}
