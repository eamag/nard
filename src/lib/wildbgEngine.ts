type WorkerMethod = 'initialize' | 'analyze' | 'evaluate' | 'cube_info' | 'result';

type WorkerRequest = {
  id: number;
  method: WorkerMethod;
  args: unknown[];
};

type WorkerSuccess = {
  id: number;
  ok: true;
  value: unknown;
};

type WorkerFailure = {
  id: number;
  ok: false;
  error: string;
};

type WorkerResponse = WorkerSuccess | WorkerFailure;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
};

export type WildbgEngine = {
  analyze: (pips: Int8Array, dieOne: number, dieTwo: number, onePointer: boolean) => Promise<unknown>;
  evaluate: (pips: Int8Array) => Promise<unknown>;
  cube_info: (pips: Int8Array) => Promise<unknown>;
  result: (pips: Int8Array) => Promise<string>;
  destroy: () => void;
};

type EngineInitialization = {
  engine: WildbgEngine;
  startingPosition: number[];
  revision: string;
};

export async function createWildbgEngine(): Promise<EngineInitialization> {
  const worker = new Worker('/wildbg_worker.js', {
    type: 'module',
    name: 'wildbg-engine',
  });
  const pending = new Map<number, PendingRequest>();
  let nextId = 0;
  let destroyed = false;

  const rejectPending = (message: string) => {
    for (const request of pending.values()) request.reject(new Error(message));
    pending.clear();
  };

  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.ok) request.resolve(event.data.value);
    else request.reject(new Error(event.data.error));
  });
  const stopWithError = (message: string) => {
    if (destroyed) return;
    destroyed = true;
    rejectPending(message);
    worker.terminate();
  };

  worker.addEventListener('error', (event) => {
    stopWithError(event.message || 'The WildBG worker stopped unexpectedly.');
  });
  worker.addEventListener('messageerror', () => {
    stopWithError('The browser could not read a response from the WildBG worker.');
  });

  const call = <T>(method: WorkerMethod, ...args: unknown[]) => {
    if (destroyed) return Promise.reject(new Error('The WildBG engine has been stopped.'));
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      const request: WorkerRequest = { id, method, args };
      worker.postMessage(request);
    });
  };

  try {
    const details = await call<{ startingPosition: number[]; revision: string }>('initialize');
    return {
      engine: {
        analyze: (pips, dieOne, dieTwo, onePointer) => call('analyze', pips, dieOne, dieTwo, onePointer),
        evaluate: (pips) => call('evaluate', pips),
        cube_info: (pips) => call('cube_info', pips),
        result: (pips) => call<string>('result', pips),
        destroy: () => {
          if (destroyed) return;
          destroyed = true;
          rejectPending('The WildBG engine has been stopped.');
          worker.terminate();
        },
      },
      ...details,
    };
  } catch (error) {
    if (!destroyed) {
      destroyed = true;
      worker.terminate();
    }
    throw error;
  }
}
