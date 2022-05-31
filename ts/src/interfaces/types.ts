export type GeneType = "index" | "range_completeness";

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
  | "application/octet-stream"
  | "application/json"
  | "image/png"
  | "image/gif"
  | "image/jpeg"
  | "video/mp4"
  | "text/plain";

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
  data: Record<string, string | number>;
  raw: Record<string, number>;
  archetype: Archetype;
  metadata: { version: string }
}