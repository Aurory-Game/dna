# Aurory DNA SDK

Welcome to the Aurory DNA SDK. This SDK is used to generate and parse Nefties' DNA.

## Installation

```bash
npm i @aurory/dnajs
```

## Examples

### Generate + parse dna

```typescript
import { DNAFactory, EggFactory } from "@aurory/dna";

const df = new DNAFactory();
// the first argument is an egg's mint address.
const ef = new EggsFactory("8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK", df);
const neftyIndex = ef.hatch().archetypeKey;
const dna = df.generateNeftyDNA(neftyIndex);
const parsed = df.parse(dna);
console.log(parsed);
```

> See `Parse` interface for more details on [df.parse](./ts/src/interfaces/types.ts)'s output.

### Get all eggs

```typescript
const eggs = EggsFactory.getAllEggs();
for (const egg of eggs) {
  const [eggPk, eggInfo] = egg;
  console.log(eggPk, eggInfo);
}
```

## How to contribute

- Make sure to adding tests for your changes.
- Make sure to specify the changes you made in the CHANGELOG, under the `Unreleased` section.
- If a new abilities dictionary or dna schema is added, update the appropriate `latest.ts` file.

## How to release a new version

- Open a branch named `release/vX.X.X`
- Update the version in `package.json`
- Update the CHANGELOG to replace the `Unreleased` section with the new version
