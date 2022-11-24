# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
