import { DNAFactoryV2 as DNAFactory } from './dna_factory_v2';
export { DNAFactory };
import { EggsFactoryV2 as EggsFactory } from './eggs_factory_v2';
export { EggsFactory };

import { LATEST_VERSION as LATEST_SCHEMA_VERSION } from './deps/schemas/latest';
import { LATEST_VERSION as LATEST_ADVENTURES_STATS_VERSION } from './deps/schemas/adventures/latest';
export { LATEST_SCHEMA_VERSION, LATEST_ADVENTURES_STATS_VERSION };

export * from './dna_factory_v1';
export * from './dna_factory_v2';
export * from './eggs_factory_v1';
export * from './eggs_factory_v2';
export * from './dna_schema_reader';
export * from './interfaces/types';
export * from './constants';
export * as utils from './utils';
