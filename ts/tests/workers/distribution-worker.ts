import { parentPort, workerData } from 'worker_threads';
import { DNAFactory } from '../../src/dna_factory';
import { EggsFactory } from '../../src/eggs_factory';
import { Rarity } from '../../src/interfaces/types';
import { utils } from '../../src';

export interface DistributionWorker {
  rarityCount: Record<Rarity, number>;
  glitchedCount: number;
  schimmeringCount: number;
}

async function run(loopCount: number) {
  const df = new DNAFactory(undefined, undefined);
  const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
  const rarityStats = ['hp', 'initiative', 'atk', 'def', 'eatk', 'edef'];
  let glitchedCount = 0;
  let schimmeringCount = 0;
  const rarityCount: Record<Rarity, number> = {} as any;
  for (let i = 0; i < loopCount; i++) {
    const dna = df.generateNeftyDNA(ef.hatch().archetypeKey);
    const parsed = df.parse(dna);
    const statsAvg =
      utils.getAverageFromRaw(
        rarityStats.map((v) => parsed.raw[v]),
        rarityStats.map((v) => 255)
      ) * 100;
    if (statsAvg < 6) {
      const stats = rarityStats.map((v) => Math.round((parsed.raw[v] / 255) * 100));
      if (Math.max(...stats) < 6) {
        glitchedCount += 1;
      }
    } else if (statsAvg > 94) {
      const stats = rarityStats.map((v) => Math.round((parsed.raw[v] / 255) * 100));
      if (Math.min(...stats) > 94) {
        schimmeringCount += 1;
      }
    }
    const rarity = df.getRarityFromStatsAvg(statsAvg)!;
    if (rarityCount[rarity]) rarityCount[rarity] += 1;
    else rarityCount[rarity] = 1;
  }
  return { rarityCount, glitchedCount, schimmeringCount };
}

async function f() {
  parentPort?.postMessage(await run(workerData.value));
}
f();
