import { parentPort, workerData } from 'worker_threads';
import { DNAFactoryV1 as DNAFactory } from '../../src/dna_factory_v1';
import { EggsFactoryV1 as EggsFactory } from '../../src/eggs_factory_v1';
import { Grade, Rarity } from '../../src/interfaces/types';
import rarities from '../../src/deps/rarities.json';
import { utils } from '../../src/';

export interface StatsMeanWorker {
  statMeans: Record<string, number>;
  standardStatMeans: Record<string, number>;
}

async function run(loopCount: number): Promise<StatsMeanWorker> {
  const df = new DNAFactory(undefined, undefined);
  const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
  const rarityStats = ['hp', 'initiative', 'atk', 'def', 'eatk', 'edef'];
  const statMeans = {} as Record<string, number>;
  Object.entries(rarities.prime).forEach(([rarity]) => {
    for (let i = 0; i < loopCount; i++) {
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, 'prime', undefined, rarity as Rarity);
      const parsed = df.parse(dna);
      const statsMean = Math.floor(
        utils.getAverageFromRaw(
          rarityStats.map((v) => parsed.raw[v]),
          rarityStats.map(() => 255)
        ) * 100
      );
      statMeans[statsMean.toString()] = statMeans[statsMean.toString()] ? statMeans[statsMean.toString()] + 1 : 1;
    }
  });
  const standardStatMeans = {} as Record<string, number>;
  Object.entries(rarities.standard).forEach(([rarity]) => {
    for (let i = 0; i < loopCount; i++) {
      const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, 'prime', undefined, rarity as Rarity);
      const parsed = df.parse(dna);
      const statsMean = Math.floor(
        utils.getAverageFromRaw(
          rarityStats.map((v) => parsed.raw[v]),
          rarityStats.map(() => 255)
        ) * 100
      );
      standardStatMeans[statsMean.toString()] = standardStatMeans[statsMean.toString()]
        ? standardStatMeans[statsMean.toString()] + 1
        : 1;
    }
  });
  return { statMeans, standardStatMeans };
}

async function f() {
  parentPort?.postMessage(await run(workerData.value));
}
f();
