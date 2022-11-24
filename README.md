# Aurory DNA SDK

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
