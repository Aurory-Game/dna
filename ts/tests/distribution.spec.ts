import { DNAFactory, EggsFactory, GLITCHED_PERIOD, Rarity, SCHIMMERING_PERIOD, utils } from '../src';
import assert from 'assert';
import rarities from '../src/deps/rarities.json';

import { Worker } from 'worker_threads';
import { addWorker } from './utils';
import { StatsMeanWorker } from './workers/stats-mean-worker';
import { DistributionWorker } from './workers/distribution-worker';

describe('Distribution', () => {
  beforeEach(function () {
    process.stdout.write(`\nLoading: ${this?.currentTest?.title}\n`);
  });

  afterEach(() => {
    process.stdout.write(`\n`);
  });

  /**
   * This test verifies that the means are evenly distributed.
   * It does this by creating 15k DNAs for each rarity group,
   * then checks if the deviation from the expected distribution is less than 20%.
   */
  it('Means are evenely distributed', (done) => {
    const statMeans = {} as any;
    const loopCount = 15000;
    let loopDone = 0;
    const workers = [] as { id: number; worker: Worker }[];
    const maxParallelWorkers = 15;
    const loopPerThread = 1000;

    const resultHandler = async (result: StatsMeanWorker, worker: Worker) => {
      const index = workers.findIndex((v) => v.id === worker.threadId);
      await workers[index].worker.terminate();
      if (loopDone > loopCount) return;
      workers.splice(index, 1);
      Object.entries(result.statMeans).forEach(([key, value]) => {
        statMeans[key] = statMeans[key] ? statMeans[key] + value : value;
      });
      loopDone += loopPerThread;
    };

    const workerPath = './workers/stats-mean-worker.ts';

    for (let index = 0; index < maxParallelWorkers; index++) {
      const worker = addWorker(loopPerThread, workerPath, resultHandler);
      workers.push({ id: worker.threadId, worker });
    }
    const idx = setInterval(() => {
      process.stdout.write(`\r${loopDone}, ${Math.round((loopDone / loopCount) * 100)}%`);
      if (workers.length < maxParallelWorkers && loopDone < loopCount) {
        const worker = addWorker(loopPerThread, workerPath, resultHandler);
        workers.push({ id: worker.threadId, worker });
      } else if (loopDone >= loopCount) {
        console.log('\n');
        clearInterval(idx);

        // stats should be evenly distributed
        const expectedCommon = loopCount / 18;
        const expectedLegendary = loopCount / 19;
        const expectedFull = loopCount / 20;
        // Check less than 10% deviation from expected
        Object.entries(statMeans).forEach(([meanStr, count]) => {
          const mean = parseInt(meanStr);
          if (mean < 6 || mean > 94) return;
          const expected = mean < 20 ? expectedCommon : mean > 80 ? expectedLegendary : expectedFull;
          assert.ok(
            Math.abs(expected - (count as number)) < expected * 0.2,
            `Mean ${mean}, expected ${expected}, got ${count}`
          );
        });

        done();
      }
    }, 1000);
  });

  /**
   * This test generates 1k DNAs for each rarity group and counts the stat values.
   * It's expected to have an even distribution of stat values, expect for 100 and 0%.
   */
  it('Individual stats visual check', (done) => {
    const df = new DNAFactory(undefined, undefined);
    const ef = new EggsFactory('8XaR7cPaMZoMXWBWgeRcyjWRpKYpvGsPF6dMwxnV4nzK', df);
    const rarityStats = ['hp', 'initiative', 'atk', 'def', 'eatk', 'edef'];
    const statsCount = {} as any;
    const loopCount = 1000;
    Object.entries(rarities).forEach(([rarity, rarityInfo]) => {
      for (let i = 0; i < loopCount; i++) {
        const dna = df.generateNeftyDNA(ef.hatch().archetypeKey, 'prime', undefined, rarity as Rarity);
        const parsed = df.parse(dna);
        const statPercentages = rarityStats.map((v) => Math.round((parsed.raw[v] / 255) * 100));
        statPercentages.forEach((v) => {
          statsCount[v] = statsCount[v] ? statsCount[v] + 1 : 1;
        });
      }
    });
    // stats should be evenly distributed
    console.log('Individual stats visual check');
    console.log(statsCount);
    done();
  });

  // this may fail sometimes as we only do 300k iterations
  it('Rarity & Glitched & Schimmering distribution rates are within a specific range of the targets', (done) => {
    const rarityCount: Record<Rarity, number> = {} as any;
    const loopCount = 300000;
    let loopDone = 0;
    const workers = [] as { id: number; worker: Worker }[];
    const maxParallelWorkers = 15;
    const loopPerThread = 10000;
    const resultHandler = async (result: DistributionWorker, worker: Worker) => {
      const index = workers.findIndex((v) => v.id === worker.threadId);
      await workers[index].worker.terminate();
      if (loopDone > loopCount) return;
      workers.splice(index, 1);
      Object.entries(result.rarityCount).forEach(([rarity, count]) => {
        rarityCount[rarity as Rarity] = (rarityCount[rarity as Rarity] || 0) + (count as number);
      });
      loopDone += loopPerThread;
    };
    const workerPath = './workers/distribution-worker.ts';
    for (let index = 0; index < maxParallelWorkers; index++) {
      const worker = addWorker(loopPerThread, workerPath, resultHandler);
      workers.push({ id: worker.threadId, worker });
    }
    const idx = setInterval(() => {
      process.stdout.write(`\r${loopDone}, ${Math.round((loopDone / loopCount) * 100)}%`);
      if (workers.length < maxParallelWorkers && loopDone < loopCount) {
        const worker = addWorker(loopPerThread, workerPath, resultHandler);
        workers.push({ id: worker.threadId, worker });
      } else if (loopDone >= loopCount) {
        console.log('\n');
        clearInterval(idx);

        // check rarity distribution
        Object.entries(rarities.prime).forEach(([rarity, rarityInfo]) => {
          const targetRate = rarityInfo.probability / 100;
          const computedProbability = rarityCount[rarity as Rarity] / loopDone;
          const maxDiff10Percent = (rarityInfo.probability / 100) * 0.1;
          assert.ok(
            Math.abs(targetRate - computedProbability) < maxDiff10Percent,
            `Expected: ${targetRate}, got: ${computedProbability}, diff: ${Math.abs(
              targetRate - computedProbability
            )}, 10% acceptable diff: ${maxDiff10Percent}`
          );
        });
        done();
      }
    }, 1000);
  });
});
