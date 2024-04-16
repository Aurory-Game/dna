# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [v0.8.1] - 01/16/2024

- Set fixed average stat per rarity for standard nefties
- Set higher minimum average for prime nefties
- Reduce the over representation of 100 as an individual stats

## [v0.7.3] - 01/16/2024

- Wassie added to Quantum eggs

## [v0.7.0] - 12/6/2023

- Introduce Cybertooth and Wassie
- Add Fen and Moss eggs
- Update configuration format for adventure stats

## [v0.6.0] - 09/18/2023

- Introduce grade for DNA generation
- Add standard egg support in EggFactory

## [v0.5.4] - 19/09/2023

- Sync dictionary with ability names and descriptions from unity team

## [v0.5.1] - 10/08/2023

- Adjust Chocomint stats

## [v0.5.0] - 03/08/2023

- Add Chocomint's archetype
- Remove glitched & shimmering link to stats

## [v0.4.1] - 06/06/2023

- Add computed adventures stats to `parse.dataAdv`

## [v0.4.0] - 03/05/2023

- Refactor parse logic
- Add Adventures' stats `parse.dataAdv`:
- Set the max possible average for non schimmering to 98 instead of 99
- Update getAverageFromRaw to use rounded stats instead of raw stats for average computation
- Fix adventure stats not rounded

## [v0.3.6] - 12/04/2023

- Add updated stats for older versions of the schema

## [v0.3.5] - 11/04/2023

- Update Dinobit edef

## [v0.3.4] - 24/03/2023

- Fix stats generation script to have less 0% stats
- Add stats distribution tests

## [v0.3.3] - 13/03/2023

- Add Prairie Egg
- Update rarity stats generation
- Update rarity calculation & ranges

## [v0.3.1] - 01/02/2023

- Add `defaultImage` & `imageByGame` to parse.data

## [v0.3.0] - 01/02/2023

- Fix `_getRandomRarity` generating whole random number instead of float. Now supports probabilities with a precision of 3. (([#27](https://github.com/Aurory-Game/dna/issues/27)))
- Fix `_generateStatsForRarity` generating stats up to 2^base instead of 2^base - 1, leading inconsistencies with parse. (([#27](https://github.com/Aurory-Game/dna/issues/27)))

## [v0.2.0] - 20/12/2022

- Add dna schema v2.0.0 (v1 was skipped because of a bug in the previous version of the SDK).
- Nefties have a new `category_genes_header` field called rarity.
- Add a rarities json file (accessible through `df.rarities`)
- `generateNeftyDNA` now takes a rarity as an optional third argument argument
- `parse.data` now contains a `rarity` field

## [v0.1.8] - 09/12/2022

### Features

- [Breaking] Depracate schema v0.1.0 without changing the major version of the SDK
- Add `passiveSkill_info` and `ultimateSkill_info` to `parse`'s data field

## [v0.1.7] - 30/11/2022

### Features

- Update Nefties' descriptions

## [v0.1.6] - 24/11/2022

### Features

- Export types

## [v0.1.5] - 24/11/2022

### Features

- **[Breaking]** Rename `parse.data.display_name` to `parse.data.displayName`
- Add displayName & description field to `ef.getDroppableNefties`

## [v0.1.4] - 24/11/2022

### Features

- Update Everglade egg info
- Add README file
- Add detailed data for `parse`'s data field

## [v0.1.3] - 17/11/2022

### Features

- Add Everglade egg info

## [v0.1.2] - 26/10/2022

### Fix

- dna version 0001 should be treated as 0000 (([#21](https://github.com/Aurory-Game/dna/issues/21)))

## [v0.1.0] - 25/10/2022

### Features

- Apply prettier to json files ([#11](https://github.com/Aurory-Game/dna/issues/11))
- Add CHANGELOG.md ([#12](https://github.com/Aurory-Game/dna/issues/12))
- Fix type errors in tests ([#14](https://github.com/Aurory-Game/dna/issues/14))
- Remove unused tsconfig-paths ([#18](https://github.com/Aurory-Game/dna/issues/18))
- parse returned object now contains nefty's and skills display name and description.

### Breaking Changes

- Egg factory's hatch method doesn't take parameters anymore
- Egg factory requires an egg's pk to be inialized
