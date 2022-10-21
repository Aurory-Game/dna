import abiltiesDictionaryV4 from '../deps/dictionaries/abilities_dictionary_v0.4.0.json';

export type GeneType = 'index' | 'range_completeness';

export interface Gene {
  name: string;
  base: number;
  type?: GeneType;
}

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

export interface DNASchema {
  version: string;
  version_date: string;
  global_genes_header: Gene[];
  categories: Record<string, Category>;
}

export interface Parse {
  data: Record<string, any>;
  raw: Record<string, number>;
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
