# Nard

A browser-based backgammon trainer powered by the [WildBG](https://github.com/carsten-wenderdel/wildbg) engine. It runs entirely in the browser via WebAssembly — no server, no account, your stats never leave your device.

Production: [nard.eamag.me](https://nard.eamag.me)

## Features

- Solo play against WildBG and local 2-player (pass & play)
- On-demand hints with move-trajectory arrows on the board
- Every move graded against WildBG's ranked candidates, with equity loss shown
- Doubling cube (money play and one-point modes)
- Progress tracking on `/stats`: results ledger, clean-decision rate, blunder rate, cube accuracy

## Quick start

Requirements: Bun 1.3+, Node.js 22.12+.

```sh
bun install
bun run dev
```

No engine setup needed: the prebuilt WildBG WebAssembly files in `public/wasm/` are committed, so the app works straight after install.

## How it works

The UI is a Svelte/Astro frontend. The neural-network evaluator, move generator, and cube logic all run locally in the browser: WildBG is compiled to WebAssembly and called off the main thread through a Web Worker (`public/wildbg_worker.js`), so analysis never freezes the UI. Dice are rolled in the frontend with `crypto.getRandomValues()`. Game orchestration lives in `src/components/Nard.svelte`; pure rules helpers live in `src/lib/`. Player history is versioned JSON in `localStorage` and is never sent anywhere.

## Upgrading the engine

You only need the WildBG source if you change the Rust adapter or want a newer upstream engine. The committed build was produced from upstream [`944085f`](https://github.com/carsten-wenderdel/wildbg/commit/944085fe213262d900b965b103d5be986e26bea4).

```sh
git clone https://github.com/carsten-wenderdel/wildbg.git wildbg
bun run build:wasm
```

This overwrites `public/wasm/wildbg_engine.js` and `public/wasm/wildbg_engine_bg.wasm`. Commit both. (Rust via rustup with the `wasm32-unknown-unknown` target is required; see the `build:wasm` script in `package.json`.)

## Checks and deployment

```sh
bun run deploy:check   # type checks, tests, production build, deploy dry-run
bun run deploy         # same, then deploy to Cloudflare
```

Deploying a fork: set `SITE_URL` to your public origin at build time, and change `name`/`routes` in `wrangler.jsonc` to your own Worker and domain.

## Credits

- Engine: [WildBG](https://github.com/carsten-wenderdel/wildbg) by Carsten Wenderdel
- Built with [Astro](https://astro.build), [Svelte](https://svelte.dev), [Cloudflare Workers](https://workers.cloudflare.com)

## License

MIT; see [LICENSE](LICENSE). WildBG itself is a separate work licensed `Apache-2.0 OR MIT`; the prebuilt files in `public/wasm/` are generated from its source.
