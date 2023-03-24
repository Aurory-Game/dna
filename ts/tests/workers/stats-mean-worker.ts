import { parentPort, workerData } from 'worker_threads';
import { DNAFactory } from '../../src/dna_factory';
import { EggsFactory } from '../../src/eggs_factory';
import { Rarity } from '../../src/interfaces/types';
import { utils } from '../../src';
import rarities from '../../src/deps/rarities.json';

export interface StatsMeanWorker {
  statMeans: Record<string, number>;
}

async function run(loopCount: number): Promise<StatsMeanWorker> {
  const df = new DNAFactory(undefined, undefined);
  const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
  const rarityStats = ['hp', 'initiative', 'atk', 'def', 'eatk', 'edef'];
  const statMeans = {} as any;
  Object.entries(rarities).forEach(([rarity]) => {
    for (let i = 0; i < loopCount; i++) {
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, undefined, rarity as Rarity);
      const parsed = df.parse(dna);
      const statsMean = Math.floor(
        utils.getAverageFromRaw(
          rarityStats.map((v) => parsed.raw[v]),
          rarityStats.map((v) => 255)
        ) * 100
      );
      statMeans[statsMean.toString()] = statMeans[statsMean.toString()] ? statMeans[statsMean.toString()] + 1 : 1;
    }
  });
  return { statMeans };
}

async function f() {
  parentPort?.postMessage(await run(workerData.value));
}
f();
