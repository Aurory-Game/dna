import { Worker } from 'worker_threads';

type ResultHandler = (result: any, worker: Worker) => Promise<void>;

/**
 *
 * @param value Value to pass to worker
 * @param workerPath Path relative to the worker file (./tests/worker.js)
 * @param resultHandler Function handling worker's result
 * @param workers Array where to push the worker
 */
export function addWorker(value: any, workerPath: string, resultHandler: ResultHandler): Worker {
  const worker = new Worker('./tests/worker.js', {
    workerData: {
      value,
      path: workerPath,
    },
  });
  worker.on('message', (result) => resultHandler(result, worker));
  return worker;
}
