<script lang="ts">
  import type { BotMotion, Candidate, DieSlot, GameState, MoveArrow, PlayerMode } from '../lib/gameTypes';
  import type { CubeOwner } from '../lib/cubeRules';
  import type { MoveStep } from '../lib/movePaths';
  import {
    BOTTOM_POINTS,
    getCheckerSlots,
    getOffCount,
    notation,
    TOP_POINTS,
  } from '../lib/boardUtils';

  export let shownBoard: number[];
  export let sources: number[];
  export let targets: number[];
  export let selectedSource: number | null;
  export let botMotion: BotMotion | null;
  export let hintArrows: MoveArrow[];
  export let cubeValue: number;
  export let cubeOwner: CubeOwner;
  export let canDouble: boolean;
  export let onePointer: boolean;
  export let playerMode: PlayerMode;
  export let isP2: boolean;
  export let state: GameState;
  export let completeMove: Candidate | null;
  export let preview: Candidate | null;
  export let dieSlots: DieSlot[];
  export let candidates: Candidate[];
  export let showThinkingOverlay: boolean;

  export let onSelectPoint: (point: number) => void;
  export let onOfferDouble: () => void;
  export let onMoveChecker: (step: MoveStep) => void;
  export let onDiceAction: () => void;
  export let onClosePreview: () => void;

  const DIE_PIPS: Record<number, number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
</script>

<div class="board-wrap">
  <div class="board" class:previewing={Boolean(preview)}>
    <div class="playing-field">
      <div class="points-grid">
        {#each TOP_POINTS as point}
          <button
            class="point top-point"
            class:alternate={point % 2 === 0}
            class:source={sources.includes(point)}
            class:target={targets.includes(point)}
            class:selected={selectedSource === point}
            class:bot-origin={botMotion?.stage === 'from' && botMotion.from === point}
            class:bot-arrival={botMotion?.stage === 'to' && botMotion.to === point}
            onclick={() => onSelectPoint(point)}
            aria-label={`Point ${point}; ${Math.abs(shownBoard[point])} checkers`}
            aria-disabled={!sources.includes(point) && !targets.includes(point)}
          >
            <span class="point-label">{point}</span>
            <span class="triangle"></span>
            <span class="stack top-stack">
              {#each getCheckerSlots(shownBoard[point]) as _, checkerIndex}
                <span
                  class="checker"
                  class:human={shownBoard[point] > 0}
                  class:bot={shownBoard[point] < 0}
                  style={`--index:${checkerIndex}`}
                ></span>
              {/each}
              {#if Math.abs(shownBoard[point]) > 5}<b>{Math.abs(shownBoard[point])}</b>{/if}
            </span>
          </button>
        {/each}

        {#each BOTTOM_POINTS as point}
          <button
            class="point bottom-point"
            class:alternate={point % 2 === 0}
            class:source={sources.includes(point)}
            class:target={targets.includes(point)}
            class:selected={selectedSource === point}
            class:bot-origin={botMotion?.stage === 'from' && botMotion.from === point}
            class:bot-arrival={botMotion?.stage === 'to' && botMotion.to === point}
            onclick={() => onSelectPoint(point)}
            aria-label={`Point ${point}; ${Math.abs(shownBoard[point])} checkers`}
            aria-disabled={!sources.includes(point) && !targets.includes(point)}
          >
            <span class="triangle"></span>
            <span class="stack bottom-stack">
              {#each getCheckerSlots(shownBoard[point]) as _, checkerIndex}
                <span
                  class="checker"
                  class:human={shownBoard[point] > 0}
                  class:bot={shownBoard[point] < 0}
                  style={`--index:${checkerIndex}`}
                ></span>
              {/each}
              {#if Math.abs(shownBoard[point]) > 5}<b>{Math.abs(shownBoard[point])}</b>{/if}
            </span>
            <span class="point-label">{point}</span>
          </button>
        {/each}
      </div>

      {#if hintArrows.length}
        <svg
          class="move-arrows"
          viewBox="0 0 1200 620"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Best move: ${notation(candidates[0].play)}`}
        >
          {#each hintArrows as arrow}
            <path class="move-arrow-line" d={arrow.path}></path>
          {/each}
        </svg>
      {/if}

      <div class="center-bar">
        <button
          class="bar-half bot-bar"
          class:source={sources.includes(0)}
          class:bot-origin={botMotion?.stage === 'from' && botMotion.from === 0}
          onclick={() => isP2 && onSelectPoint(0)}
          aria-label={`${Math.abs(shownBoard[0])} ${playerMode === 'pvp' ? 'Player 2' : 'WildBG'} checkers on bar`}
        >
          {#each getCheckerSlots(shownBoard[0]) as _, checkerIndex}
            <span class="checker bot" style={`--index:${checkerIndex}`}></span>
          {/each}
          {#if Math.abs(shownBoard[0]) > 5}<b>{Math.abs(shownBoard[0])}</b>{/if}
        </button>
        <span>BAR</span>
        <button
          class="bar-half human-bar"
          class:source={sources.includes(25)}
          onclick={() => !isP2 && onSelectPoint(25)}
          aria-label={`${shownBoard[25]} of ${playerMode === 'pvp' ? 'Player 1' : 'your'} checkers on bar`}
        >
          {#each getCheckerSlots(shownBoard[25]) as _, checkerIndex}
            <span class="checker human" style={`--index:${checkerIndex}`}></span>
          {/each}
          {#if shownBoard[25] > 5}<b>{shownBoard[25]}</b>{/if}
        </button>
        {#if !onePointer}
          <button
            class="doubling-cube"
            class:centered={cubeOwner === 'center'}
            class:bot-owned={cubeOwner === 'bot'}
            class:human-owned={cubeOwner === 'human'}
            class:available={canDouble}
            onclick={onOfferDouble}
            disabled={!canDouble}
            aria-label={canDouble ? `Offer a double to ${cubeValue * 2}` : `Doubling cube at ${cubeValue}; ${cubeOwner === 'center' ? 'centered' : `owned by ${cubeOwner === 'human' ? (playerMode === 'pvp' ? 'Player 1' : 'you') : (playerMode === 'pvp' ? 'Player 2' : 'WildBG')}`}`}
            title={canDouble ? `Double to ${cubeValue * 2}` : `Cube: ${cubeValue}`}
          >{cubeValue}</button>
        {/if}
      </div>
    </div>

    <div class="off-tray">
      <button
        class="off-tray-box bot-off"
        class:bot-arrival={botMotion?.stage === 'to' && botMotion.to === 25}
        class:target={targets.includes(0) && isP2}
        class:hinted-off={hintArrows.some((arrow) => isP2 && arrow.step.to === 0)}
        onclick={() => isP2 && selectedSource !== null && targets.includes(0) && onMoveChecker({ from: selectedSource, to: 0 })}
        aria-label={`${getOffCount(shownBoard, 'bot')} checkers borne off for ${playerMode === 'pvp' ? 'Player 2' : 'WildBG'}`}
      >
        <small>OFF</small>
        <strong>{getOffCount(shownBoard, 'bot')}</strong>
      </button>
      <button
        class="off-tray-box human-off"
        class:target={targets.includes(0) && !isP2}
        class:hinted-off={hintArrows.some((arrow) => !isP2 && arrow.step.to === 0)}
        onclick={() => !isP2 && selectedSource !== null && targets.includes(0) && onMoveChecker({ from: selectedSource, to: 0 })}
        aria-label={`${getOffCount(shownBoard, 'human')} checkers borne off for ${playerMode === 'pvp' ? 'Player 1' : 'you'}`}
      >
        <strong>{getOffCount(shownBoard, 'human')}</strong>
        <small>OFF</small>
      </button>
    </div>

    <button
      class="dice-tray"
      class:confirmable={state === 'moving' && Boolean(completeMove) && !preview}
      class:rollable={state === 'ready'}
      class:bot-dice={state === 'bot'}
      class:p2-dice={isP2}
      onclick={onDiceAction}
      disabled={state !== 'ready' && (state !== 'moving' || !completeMove || Boolean(preview))}
      aria-label={state === 'ready' ? (playerMode === 'pvp' ? `${isP2 ? 'Player 2' : 'Player 1'} roll dice` : 'Roll dice') : state === 'moving' && completeMove ? (candidates[0]?.play.length ? 'Confirm move' : 'Confirm pass') : `Dice ${dieSlots.map((die) => die.value ?? 'loading').join(' and ')}`}
    >
      {#if state === 'moving' && completeMove && !preview}
        <span class="confirm-mark" aria-hidden="true">✓</span>
      {/if}
      <span class="dice-row">
        {#each dieSlots as die}
          <span class="die" class:spent={die.spent} class:empty={die.value === null}>
            {#if die.value !== null}
              <span class="pip-grid" aria-hidden="true">
                {#each Array(9) as _, pipIndex}
                  <i class:pip-on={DIE_PIPS[die.value].includes(pipIndex)}></i>
                {/each}
              </span>
            {/if}
          </span>
        {/each}
      </span>
    </button>

    {#if state === 'bot' && botMotion}
      <div class="bot-action"><i></i><span>{botMotion.label}</span></div>
    {/if}

    {#if preview}
      <button class="preview-pill" onclick={onClosePreview}>
        Preview: {notation(preview.play)} <b>Close</b>
      </button>
    {/if}

    {#if state === 'loading' || (state === 'thinking' && showThinkingOverlay) || state === 'cube-thinking'}
      <div class="loading-cover">
        <i></i>
        <strong>{state === 'loading' ? 'Starting WildBG' : state === 'thinking' ? 'Analysing roll' : 'Evaluating cube'}</strong>
      </div>
    {/if}
  </div>
</div>

<style>
  .board-wrap {
    min-width: 0;
  }
  .board {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(38px, 4.3vw, 54px);
    gap: 7px;
    aspect-ratio: 1.7;
    min-height: 380px;
    padding: clamp(7px, 1vw, 11px);
    border: 1px solid #090c0b;
    border-radius: 7px;
    background: var(--wood);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34);
    overflow: hidden;
  }
  .playing-field {
    position: relative;
    min-width: 0;
    border: 1px solid rgba(48, 39, 31, 0.38);
    border-radius: 2px;
    background: var(--field);
    overflow: hidden;
  }
  .points-grid {
    height: 100%;
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: 1fr 1fr;
  }
  .point {
    position: relative;
    min-width: 0;
    border: 0;
    padding: 0;
    background: transparent;
    color: #ece3cf;
    cursor: default;
  }
  .point[aria-disabled="false"] {
    cursor: pointer;
  }
  .point:focus {
    outline: none;
  }
  .point:focus-visible {
    box-shadow: inset 0 0 0 3px #ffd263;
  }
  .triangle {
    position: absolute;
    inset-inline: 4%;
    background: var(--point-clay);
    opacity: 0.98;
  }
  .point.alternate .triangle {
    background: var(--point-green);
  }
  .top-point .triangle {
    inset-block: 0 8%;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }
  .bottom-point .triangle {
    inset-block: 8% 0;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }
  .point-label {
    position: absolute;
    z-index: 8;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(245, 235, 213, 0.72);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: clamp(8px, 0.75vw, 10px);
    font-weight: 800;
  }
  .top-point .point-label { top: 3px; }
  .bottom-point .point-label { bottom: 3px; }
  .stack {
    position: absolute;
    z-index: 5;
    inset-inline: 9%;
    height: 91%;
    pointer-events: none;
  }
  .top-stack { top: clamp(12px, 1.35vw, 18px); }
  .bottom-stack { bottom: clamp(12px, 1.35vw, 18px); }
  .checker {
    position: absolute;
    z-index: calc(5 - var(--index));
    left: 50%;
    width: min(86%, 36px);
    aspect-ratio: 1;
    transform: translateX(-50%);
    border-radius: 50%;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.14), inset 0 -3px 6px rgba(0, 0, 0, 0.14), 0 2px 3px rgba(29, 23, 19, 0.26);
  }
  .top-stack .checker { top: calc(var(--index) * clamp(23px, 3.25vw, 36px)); }
  .bottom-stack .checker { bottom: calc(var(--index) * clamp(23px, 3.25vw, 36px)); }
  .checker.human {
    background: var(--cream);
    border: 1px solid #aaa293;
  }
  .checker.bot {
    background: #152f28;
    border: 1px solid #091712;
  }
  .stack b, .bar-half b {
    position: absolute;
    z-index: 12;
    left: 50%;
    top: 50%;
    width: 19px;
    height: 19px;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--accent);
    color: #2f291e;
    font-size: 9px;
  }
  .point.source .checker:first-of-type,
  .human-bar.source .checker:first-of-type,
  .bot-bar.source .checker:first-of-type {
    outline: 2px solid #f2ca69;
    outline-offset: 2px;
    animation: source-breathe 1.35s ease-in-out infinite;
  }
  .point.selected .checker:first-of-type {
    outline-color: #fff1b4;
    box-shadow: inset 0 0 0 2px var(--accent), 0 0 0 4px rgba(228, 185, 79, 0.27);
  }
  .point.target::after,
  .off-tray button.target::after {
    content: '';
    position: absolute;
    z-index: 9;
    left: 50%;
    width: clamp(13px, 1.7vw, 19px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #f4ca67;
    border: 2px solid #fff0bc;
    box-shadow: 0 2px 7px rgba(57, 40, 23, 0.2);
    pointer-events: none;
  }
  .top-point.target::after { top: 64%; }
  .bottom-point.target::after { top: 36%; }
  .point.bot-origin, .bot-bar.bot-origin { background: rgba(244, 202, 103, 0.13); }
  .point.bot-arrival { background: rgba(194, 225, 208, 0.2); }
  .point.bot-origin .checker:last-of-type,
  .bot-bar.bot-origin .checker:last-of-type {
    z-index: 18;
    animation: bot-lift 0.26s ease-out both;
  }
  .point.bot-arrival .checker:last-of-type {
    z-index: 18;
    animation: bot-land 0.38s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }
  .bot-off.bot-arrival {
    animation: off-land 0.38s ease-out both;
  }
  .move-arrows {
    position: absolute;
    z-index: 19;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .move-arrow-line {
    fill: none;
    stroke: rgba(255, 210, 104, 0.58);
    stroke-width: 14;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .center-bar {
    position: absolute;
    z-index: 10;
    left: 50%;
    inset-block: 0;
    width: clamp(28px, 4.6vw, 48px);
    transform: translateX(-50%);
    display: grid;
    grid-template-rows: 1fr auto 1fr;
    background: var(--wood);
    border-inline: 1px solid rgba(38, 31, 26, 0.3);
    color: rgba(255, 255, 255, 0.43);
  }
  .center-bar > span {
    padding: 6px 0;
    text-align: center;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.12em;
  }
  .bar-half {
    position: relative;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }
  .bar-half .checker {
    left: 50%;
    width: min(78%, 34px);
  }
  .bot-bar .checker { top: calc(var(--index) * 27px + 8px); }
  .human-bar .checker { bottom: calc(var(--index) * 27px + 8px); }
  .doubling-cube {
    position: absolute;
    z-index: 16;
    left: 50%;
    top: 50%;
    width: clamp(27px, 3.2vw, 35px);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    transform: translate(-50%, -50%);
    border: 1px solid #b9ae98;
    border-radius: 5px;
    padding: 0;
    background: #eee7d7;
    color: #26302b;
    font-family: Georgia, serif;
    font-size: clamp(13px, 1.65vw, 18px);
    font-weight: 700;
    box-shadow: inset 0 -3px 0 #c9bfad, 0 4px 9px rgba(0, 0, 0, 0.3);
    transition: top 0.3s ease, transform 0.18s ease, box-shadow 0.18s ease;
  }
  .doubling-cube.centered {
    transform: translate(-50%, calc(-50% - clamp(45px, 5.5vw, 62px)));
  }
  .doubling-cube.bot-owned { top: 20%; }
  .doubling-cube.human-owned { top: 80%; }
  .doubling-cube:disabled { opacity: 0.88; }
  .doubling-cube.available {
    cursor: pointer;
    box-shadow: inset 0 -3px 0 #c9bfad, 0 4px 9px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(229, 185, 78, 0.34);
    animation: cube-ready 1.8s ease-in-out infinite;
  }
  .doubling-cube.available:hover {
    transform: translate(-50%, -50%) scale(1.08);
  }
  .doubling-cube.centered.available:hover {
    transform: translate(-50%, calc(-50% - clamp(45px, 5.5vw, 62px))) scale(1.08);
  }
  .off-tray {
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: 9px;
  }
  .off-tray-box {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 3px;
    padding: 12px 2px;
    background: var(--wood-dark);
    color: var(--cream);
    cursor: default;
  }
  .off-tray-box.target {
    cursor: pointer;
    background: #58452f;
  }
  .off-tray-box.hinted-off {
    border-color: #f5cc62;
    box-shadow: inset 0 0 0 2px rgba(245, 204, 98, 0.22), 0 0 0 2px rgba(26, 29, 25, 0.52);
  }
  .off-tray small {
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.13em;
    opacity: 0.6;
  }
  .off-tray strong {
    font-family: Georgia, serif;
    font-size: clamp(18px, 2.3vw, 27px);
    font-weight: 500;
  }
  .off-tray button.target::after { top: 50%; }

  .dice-tray {
    position: absolute;
    z-index: 20;
    left: calc(50% - 22px);
    top: 50%;
    display: block;
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9px;
    padding: 5px;
    background: rgba(25, 29, 27, 0.88);
    color: inherit;
    box-shadow: 0 7px 18px rgba(0, 0, 0, 0.32);
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  }
  .dice-tray:disabled {
    opacity: 1;
    cursor: default;
  }
  .dice-row {
    display: flex;
    gap: 5px;
  }
  .die {
    width: clamp(29px, 3.5vw, 38px);
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 5px;
    background: #f1ecdf;
    color: #202723;
    border: 1px solid #b5ad9e;
    box-shadow: inset 0 -2px 0 #cec5b6;
    transition: filter 0.18s ease, opacity 0.18s ease, transform 0.18s ease, background 0.18s ease, color 0.18s ease;
  }
  .die.empty::after {
    content: '';
    width: 16%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.26;
  }
  .pip-grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    place-items: center;
    padding: 17%;
  }
  .pip-grid i {
    width: 100%;
    max-width: 7px;
    aspect-ratio: 1;
    border-radius: 50%;
  }
  .pip-grid i.pip-on {
    background: currentColor;
    box-shadow: inset 0 -1px rgba(0, 0, 0, 0.22);
  }
  .die.spent {
    background: #4a504d;
    color: #848b87;
    border-color: #555d59;
    box-shadow: inset 0 -2px 0 #3b413e;
    filter: saturate(0.2);
    opacity: 0.78;
    transform: scale(0.94);
  }
  .dice-tray.rollable {
    border-color: rgba(229, 185, 78, 0.45);
    cursor: pointer;
  }
  .dice-tray.rollable:hover {
    transform: translate(-50%, -50%) translateY(-2px);
    border-color: rgba(229, 185, 78, 0.75);
  }
  .dice-tray.rollable:focus-visible {
    outline: 3px solid #f3cc69;
    outline-offset: 4px;
  }
  .dice-tray.confirmable {
    border-color: rgba(229, 185, 78, 0.72);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.38), 0 0 0 3px rgba(229, 185, 78, 0.13);
    cursor: pointer;
  }
  .dice-tray.confirmable:hover {
    transform: translate(-50%, -50%) translateY(-2px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.42), 0 0 0 4px rgba(229, 185, 78, 0.17);
  }
  .dice-tray.confirmable:focus-visible {
    outline: 3px solid #f3cc69;
    outline-offset: 4px;
  }
  .confirm-mark {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: -19px;
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    transform: translateX(-50%);
    border: 2px solid #222923;
    border-radius: 50%;
    background: var(--accent);
    color: #20251f;
    font-size: 15px;
    font-weight: 950;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.38);
    animation: confirm-in 0.2s ease-out both;
  }
  .dice-tray.bot-dice .die,
  .dice-tray.p2-dice .die {
    background: #203b33;
    color: #f3ebdc;
    border-color: #315449;
    box-shadow: inset 0 -2px 0 #142820;
  }
  .bot-action {
    position: absolute;
    z-index: 24;
    left: calc(50% - 22px);
    top: 50%;
    display: flex;
    align-items: center;
    gap: 7px;
    transform: translate(-50%, 47px);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    padding: 7px 10px;
    background: rgba(31, 48, 42, 0.94);
    color: #fff8e8;
    box-shadow: 0 5px 14px rgba(35, 28, 23, 0.18);
    font-size: 11px;
    font-weight: 800;
  }
  .bot-action i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #efd06c;
    box-shadow: 0 0 0 4px rgba(239, 208, 108, 0.13);
  }
  .preview-pill {
    position: absolute;
    z-index: 25;
    bottom: 13px;
    left: calc(50% - 22px);
    transform: translateX(-50%);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    padding: 9px 13px;
    background: #282d2a;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  .preview-pill b {
    margin-left: 10px;
    color: #f6c957;
  }
  .loading-cover {
    position: absolute;
    z-index: 30;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(40, 35, 31, 0.84);
    color: white;
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
  }
  .loading-cover i {
    width: 28px;
    height: 28px;
    margin-bottom: 13px;
    border: 3px solid rgba(255, 255, 255, 0.2);
    border-top-color: #f6c957;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  .loading-cover strong {
    font-family: Georgia, serif;
    font-size: 20px;
    font-weight: 500;
  }

  @keyframes source-breathe {
    50% {
      filter: brightness(1.06);
      outline-offset: 4px;
    }
  }
  @keyframes bot-lift {
    from {
      transform: translateX(-50%) scale(1);
      filter: brightness(1);
    }
    to {
      transform: translateX(-50%) translateY(-7px) scale(1.1);
      filter: brightness(1.35);
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.22), 0 8px 12px rgba(28, 23, 19, 0.32), 0 0 0 3px rgba(244, 202, 103, 0.56);
    }
  }
  @keyframes bot-land {
    0% {
      transform: translateX(-50%) scale(0.68);
      filter: brightness(1.5);
    }
    65% {
      transform: translateX(-50%) scale(1.13);
    }
    100% {
      transform: translateX(-50%) scale(1);
      filter: brightness(1);
    }
  }
  @keyframes off-land {
    0% {
      box-shadow: inset 0 0 0 2px rgba(239, 208, 108, 0.8);
      filter: brightness(1.45);
    }
    100% {
      box-shadow: none;
      filter: none;
    }
  }
  @keyframes confirm-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(5px) scale(0.75);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }
  @keyframes cube-ready {
    50% {
      box-shadow: inset 0 -3px 0 #c9bfad, 0 5px 11px rgba(0, 0, 0, 0.36), 0 0 0 5px rgba(229, 185, 78, 0.17);
    }
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 680px) {
    .board {
      min-height: 300px;
      aspect-ratio: 1.35;
      grid-template-columns: minmax(0, 1fr) 34px;
      padding: 7px;
      gap: 6px;
    }
    .checker {
      width: min(90%, 28px);
    }
    .top-stack .checker {
      top: calc(var(--index) * clamp(18px, 5vw, 28px));
    }
    .bottom-stack .checker {
      bottom: calc(var(--index) * clamp(18px, 5vw, 28px));
    }
  }

  :global(html[data-theme='light']) .dice-tray {
    background: rgba(252, 249, 242, 0.9);
    border-color: rgba(55, 65, 59, 0.22);
    box-shadow: 0 7px 18px rgba(45, 35, 25, 0.22);
  }
  :global(html[data-theme='light']) .bot-action {
    border-color: #6c8679;
    background: rgba(231, 241, 235, 0.96);
    color: #25342d;
  }
  :global(html[data-theme='light']) .preview-pill {
    background: #f7f4ed;
    border-color: #bec6bd;
    color: #2b3832;
  }
</style>
