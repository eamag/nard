import init, {
  Wildbg,
  starting_position,
  wildbg_revision,
} from './wasm/wildbg_engine.js';

let enginePromise;

function loadEngine() {
  enginePromise ??= (async () => {
    await init({ module_or_path: './wasm/wildbg_engine_bg.wasm' });
    return new Wildbg();
  })();
  return enginePromise;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

self.addEventListener('message', (event) => {
  void (async () => {
    const { id, method, args } = event.data;
    try {
      const engine = await loadEngine();
      let value;

      switch (method) {
        case 'initialize':
          value = {
            startingPosition: Array.from(starting_position()),
            revision: wildbg_revision(),
          };
          break;
        case 'analyze':
          value = engine.analyze(args[0], args[1], args[2], args[3]);
          break;
        case 'evaluate':
          value = engine.evaluate(args[0]);
          break;
        case 'cube_info':
          value = engine.cube_info(args[0]);
          break;
        case 'result':
          value = engine.result(args[0]);
          break;
        default:
          throw new Error(`Unknown WildBG worker method: ${method}`);
      }

      self.postMessage({ id, ok: true, value });
    } catch (error) {
      self.postMessage({ id, ok: false, error: errorMessage(error) });
    }
  })();
});
