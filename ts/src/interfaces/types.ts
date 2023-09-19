import abiltiesDictionaryV4 from '../deps/dictionaries/abilities_dictionary_v0.4.0.json';

export type GeneType = 'index' | 'range_completeness';

export interface Gene {
  name: string;
  base: number;
  type?: GeneType;
}

export type Grade = 'standard' | 'prime';

export interface Archetype {
  fixed_attributes: Record<string, string | number>;
  encoded_attributes: Record<string, number[] | string[]>;
}

export type Mime =
  | 'application/octet-stream'
  | 'application/json'
  | 'image/png'
  | 'image/gif'
  | 'image/jpeg'
  | 'video/mp4'
  | 'text/plain';

export interface Media {
  full_type: Mime;
  preview_type: Mime;
  preview_uri: string;
  full_uri: string;
}

export interface Category {
  name: string;
  media?: Media;
  category_genes_header: Gene[];
  genes: Gene[];
  archetypes: Record<string, Archetype>;
}

export interface DNASchemaV0 {
  version: string;
  version_date: string;
  global_genes_header: Gene[];
  categories: Record<string, Category>;
}

export interface DNASchemaV2 {
  version: string;
  version_date: string;
  global_genes_header: Gene[];
  categories: Record<string, Category>;
  rarities: Record<string, Rarity>;
}

export type DNASchemaV3 = DNASchemaV2;

export type DNASchema = DNASchemaV0 | DNASchemaV2 | DNASchemaV3;

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export interface RarityInfo {
  average_stats_range: number[];
  probability: number;
}

export interface ParseDataRangeCompleteness {
  mp: number;
  hp: number;
  initiative: number;
  atk: number;
  def: number;
  eatk: number;
  edef: number;
}

export interface ImageNeftyByGame {
  medium: string;
  small: string;
}

export type NeftyImageFormat = keyof ImageNeftyByGame;

export interface ParseDataNefty {
  name: string;
  displayName: string;
  family: string;
  passiveSkill: string;
  ultimateSkill: string;
  description: string;
  rarity: Rarity;
  grade: Grade;
  defaultImage: string;
  imageByGame: { tactics: ImageNeftyByGame };
}

export interface ParseDataIndex {
  skill_a: string;
  skill_b: string;
  skill_c: string;
}

export interface ParseDataSkillInfo {
  skill_a_info: AbilityInfo;
  skill_b_info: AbilityInfo;
  skill_c_info: AbilityInfo;
  passiveSkill_info: AbilityInfo;
  ultimateSkill_info: AbilityInfo;
}

export type ParseData = ParseDataRangeCompleteness & ParseDataNefty & ParseDataIndex & ParseDataSkillInfo;

export interface AbilityInfo {
  name: AbilityLocalizedValue;
  description: AbilityLocalizedValue;
}

export type ParseDataAdv = ParseDataPerc & ParseDataComputed;

export interface ParseDataPerc {
  vitality: number;
  power: number;
  defense: number;
  speed: number;
}

export interface ParseDataComputed {
  vitalityComputed: number;
  powerComputed: number;
  defenseComputed: number;
  speedComputed: number;
}

export interface AdvStatsJSON {
  nefties: AdvStatsJSONRecord;
}

export type AdvStatsJSONRecord = Record<string, AdvStatsJSONValue>;

export interface AdvStatsJSONValue {
  Health: { min: number; max: number };
  Power: { min: number; max: number };
  Defense: { min: number; max: number };
  Speed: { min: number; max: number };
}

export interface Parse {
  data: ParseData;
  dataAdv: ParseDataAdv;
  raw: Record<string, number>;
  // percentages: Record<string, number>;
  archetype: Archetype;
  metadata: { version: string };
  genes: Gene[];
}

export interface AbilityLocalizedValue {
  EN: string;
}

export type KeywordsKey = keyof typeof abiltiesDictionaryV4.keywords;

export type Keywords = Record<KeywordsKey, AbilityLocalizedValue>;

export interface AbilityDictionary {
  version: string;
  version_date: string;
  keywords: Keywords;
}

export interface NeftiesInfo {
  code_to_displayName: Record<string, string>;
  family_to_description: Record<string, string>;
}

// eg: Nefty_Bitebit
type NeftyCodeName = string;

export interface EggInfo {
  name: string;
  description: string;
  archetypes: NeftyCodeName[];
}

export interface DroppableNeftyInfo {
  archetypeKey: string;
  archetype: Archetype;
  displayName: string;
  description: string;
}

export type version = string;

export type GeneWithValues = Gene & {
  rawValue: number;
  value: string | number;
  completeness?: number;
  skill_info?: AbilityInfo;
};
