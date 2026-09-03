<script lang="ts">
  import type { Candidate, CubeReview, GameState, Review } from '../lib/gameTypes';
  import { samePlay } from '../lib/movePaths';
  import { notation } from '../lib/boardUtils';
  import {
    explainMove,
    formatEquity,
    formatLoss,
    gradeLoss,
  } from '../lib/analysisFormatters';

  export let state: GameState;
  export let engineError: string;
  export let cubeReview: CubeReview | null;
  export let review: Review | null;
  export let candidates: Candidate[];
  export let phase: string;
  export let showRanking: boolean;
  export let alwaysShowHints: boolean;
  export let preview: Candidate | null;
  export let stats: { decisions: number; mistakes: number; blunders: number; loss: number };
  export let onePointer: boolean;
  export let revision: string;

  export let onToggleHints: () => void;
  export let onTogglePreview: (candidate: Candidate) => void;
  export let onToggleHint: () => void;
</script>

<aside class="coach">
  <div class="coach-title">
    <h2>Analysis <small>Multi-ply</small></h2>
    <button
      class="hints-toggle"
      class:active={alwaysShowHints}
      aria-pressed={alwaysShowHints}
      onclick={onToggleHints}
    >
      <i></i>Always show hints
    </button>
  </div>

  {#if state === 'error'}
    <section class="message error-message">
      <strong>Engine failed to load</strong>
      <p>{engineError}</p>
    </section>
  {:else if cubeReview}
    <section class:correct={cubeReview.correct} class:incorrect={!cubeReview.correct} class="cube-review">
      <strong>{cubeReview.title}</strong>
      <p>{cubeReview.detail}</p>
    </section>
  {:else if review}
    <section class={`result ${gradeLoss(review.loss, onePointer).toLowerCase().replace(' ', '-')}`}>
      <div>
        <span>{gradeLoss(review.loss, onePointer)}</span>
        <strong>
          {review.loss < 0.0005
            ? '0 loss'
            : onePointer
              ? `−${(review.loss * 100).toFixed(1)}pp`
              : `−${Math.round(review.loss * 1000)} mp`}
        </strong>
      </div>
      <p>{explainMove(review, onePointer)}</p>
      <div class="comparison">
        <button onclick={() => onTogglePreview(review!.chosen)}>
          <small>YOU PLAYED</small>
          <b>{notation(review.chosen.play)}</b>
          <span>{formatEquity(review.chosen.equity)}</span>
        </button>
        <button onclick={() => onTogglePreview(review!.best)}>
          <small>WILDBG</small>
          <b>{notation(review.best.play)}</b>
          <span>{formatEquity(review.best.equity)}</span>
        </button>
      </div>
    </section>
  {:else}
    <section class="message compact-message">
      <p>
        {onePointer
          ? 'Play a move to compare it with WildBG.'
          : 'Play a move, or use the cube before rolling, to compare with WildBG.'}
      </p>
    </section>
  {/if}

  {#if candidates.length && showRanking}
    <section class="ranking">
      <div class="ranking-head">
        <h2>Best moves</h2>
        <span>{phase} · {candidates.length}</span>
      </div>
      <div class="column-head">
        <span>MOVE</span>
        <span>WIN</span>
        <span>EQ.</span>
        <span>LOSS</span>
      </div>
      {#each candidates.slice(0, 6) as candidate, index}
        <button
          class="move-row"
          class:active={preview === candidate}
          class:played={Boolean(review && samePlay(review.chosen.play, candidate.play))}
          onclick={() => onTogglePreview(candidate)}
        >
          <span class="move">
            <i>{index + 1}</i>
            <b>{notation(candidate.play)}</b>
          </span>
          <span>{(candidate.probabilities.win * 100).toFixed(1)}%</span>
          <span>{formatEquity(candidate.equity)}</span>
          <span class="loss">{formatLoss(candidate, candidates[0], onePointer)}</span>
        </button>
      {/each}
    </section>
  {:else if state === 'moving' && !showRanking}
    <button class="reveal" onclick={onToggleHint}>
      <strong>Show hint & best moves</strong>
      <span class="reveal-bulb" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3.9 10.6c.8.7 1.4 1.5 1.6 2.4h4.6c.2-.9.8-1.7 1.6-2.4A6 6 0 0 0 12 3Z" />
        </svg>
      </span>
    </button>
  {/if}

  {#if stats.decisions}
    <section class="stats">
      <div>
        <strong>{stats.decisions}</strong>
        <span>moves</span>
      </div>
      <div>
        <strong>{Math.round((stats.loss / stats.decisions) * (onePointer ? 100 : 1000))}</strong>
        <span>avg loss</span>
      </div>
      <div>
        <strong>{stats.blunders}</strong>
        <span>blunders</span>
      </div>
    </section>
  {/if}

  <footer>
    <a href="https://en.wikipedia.org/wiki/Nard_(game)" target="_blank" rel="noreferrer">Why is it called Nard? ↗</a>
    <a href="https://github.com/carsten-wenderdel/wildbg" target="_blank" rel="noreferrer">WildBG {revision || ''} ↗</a>
  </footer>
</aside>

<style>
  .coach {
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .coach-title {
    min-height: 45px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .coach-title h2 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 23px;
    font-weight: 500;
  }
  .coach-title h2 small {
    margin-left: 5px;
    color: var(--muted, #929b96);
    font-family: Inter, sans-serif;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .hints-toggle {
    display: flex;
    align-items: center;
    gap: 7px;
    border: 0;
    padding: 4px 0;
    background: transparent;
    color: #8b9690;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .hints-toggle i {
    width: 19px;
    height: 11px;
    display: block;
    position: relative;
    border: 1px solid #46504b;
    border-radius: 999px;
    background: #252c29;
    transition: border-color 0.18s ease, background 0.18s ease;
  }
  .hints-toggle i::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #8b9690;
    transition: transform 0.18s ease, background 0.18s ease;
  }
  .hints-toggle.active {
    color: #d5dbd7;
  }
  .hints-toggle.active i {
    border-color: #967d3f;
    background: #5b4d2c;
  }
  .hints-toggle.active i::after {
    transform: translateX(8px);
    background: var(--accent, #e5b94e);
  }
  .message, .result, .cube-review, .ranking, .stats, .reveal {
    border: 1px solid var(--line, #303a36);
    border-radius: 7px;
    background: var(--paper, #19201e);
  }
  .message {
    padding: 16px;
  }
  .message > strong {
    display: block;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: 500;
  }
  .message p {
    margin: 6px 0 0;
    color: #a7b0ab;
    font-size: 11px;
    line-height: 1.5;
  }
  .compact-message {
    border-style: dashed;
    background: transparent;
  }
  .compact-message p {
    margin: 0;
  }
  .result {
    padding: 17px;
    border-left: 4px solid #348063;
  }
  .result.mistake, .result.blunder {
    border-left-color: #b94e42;
  }
  .result > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .result > div:first-child span {
    font-family: Georgia, serif;
    font-size: 21px;
  }
  .result > div:first-child strong {
    color: #9fa9a3;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
  }
  .result > p {
    margin: 12px 0;
    color: #abb3ae;
    font-size: 11px;
    line-height: 1.55;
  }
  .cube-review {
    padding: 16px;
    border-left: 4px solid #348063;
  }
  .cube-review.incorrect {
    border-left-color: #b94e42;
  }
  .cube-review strong {
    display: block;
    font-family: Georgia, serif;
    font-size: 19px;
    font-weight: 500;
  }
  .cube-review p {
    margin: 7px 0 0;
    color: #abb3ae;
    font-size: 11px;
    line-height: 1.55;
  }
  .comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }
  .comparison button {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    border: 1px solid #39433f;
    border-radius: 6px;
    padding: 10px;
    background: #202725;
    color: #e0e5e1;
    text-align: left;
    cursor: pointer;
  }
  .comparison button:last-child {
    background: #1d2b27;
    border-color: #335147;
  }
  .comparison small {
    color: #8f9994;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  .comparison b {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
  }
  .comparison span {
    color: #a5aea9;
    font-family: ui-monospace, monospace;
    font-size: 10px;
  }
  .ranking {
    overflow: hidden;
  }
  .ranking-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 13px 12px 10px;
  }
  .ranking-head h2 {
    margin: 0;
    font-family: Georgia, serif;
    font-size: 18px;
    font-weight: 500;
  }
  .ranking-head > span {
    color: #8b8e8a;
    font-size: 10px;
  }
  .column-head, .move-row {
    display: grid;
    grid-template-columns: minmax(120px, 1.4fr) 0.65fr 0.6fr 0.62fr;
    gap: 5px;
    align-items: center;
  }
  .column-head {
    padding: 7px 12px;
    border-block: 1px solid #303a36;
    color: #7f8984;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  .column-head span:not(:first-child) {
    text-align: right;
  }
  .move-row {
    width: 100%;
    min-height: 45px;
    border: 0;
    border-bottom: 1px solid #2b3430;
    padding: 7px 12px;
    background: transparent;
    color: #d8ded9;
    cursor: pointer;
  }
  .move-row:hover, .move-row.active {
    background: #22302b;
  }
  .move-row.played {
    box-shadow: inset 3px 0 #b84c40;
  }
  .move-row > span:not(:first-child) {
    text-align: right;
    font-family: ui-monospace, monospace;
    font-size: 10px;
  }
  .move {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .move i {
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 4px;
    background: #29322f;
    color: #a5aea9;
    font-size: 9px;
    font-style: normal;
  }
  .move b {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
  }
  .move-row .loss {
    color: #d78074;
  }
  .reveal {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 13px;
    color: #d0d7d2;
    cursor: pointer;
  }
  .reveal span {
    color: #87928c;
    font-size: 11px;
  }
  .reveal-bulb {
    display: grid;
    place-items: center;
    color: var(--accent, #e5b94e);
  }
  .reveal-bulb svg {
    width: 15px;
    height: 15px;
    display: block;
  }
  .reveal strong {
    font-size: 11px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    overflow: hidden;
  }
  .stats div {
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 10px 8px;
    border-right: 1px solid #303a36;
  }
  .stats div:last-child {
    border: 0;
  }
  .stats strong {
    font-family: Georgia, serif;
    font-size: 15px;
    font-weight: 500;
  }
  .stats span {
    color: #8e9993;
    font-size: 9px;
  }
  .coach footer {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    padding: 3px;
    font-size: 9px;
  }
  .coach footer a {
    color: #8d9892;
    text-decoration: none;
    font-weight: 700;
  }
  .coach footer a:hover {
    color: var(--ink, #eeeae1);
  }
  .coach footer a:focus-visible {
    outline: 2px solid #f3cc69;
    outline-offset: 3px;
  }
  .error-message {
    border-left: 4px solid #b94e42;
  }

  @media (max-width: 1030px) {
    .coach {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .coach-title, .coach footer, .stats {
      grid-column: 1 / -1;
    }
  }

  :global(html[data-theme='light']) .hints-toggle {
    color: #66726b;
  }
  :global(html[data-theme='light']) .hints-toggle i {
    border-color: #aeb8b1;
    background: #e6e6dd;
  }
  :global(html[data-theme='light']) .hints-toggle.active {
    color: #39463f;
  }
  :global(html[data-theme='light']) .hints-toggle.active i {
    border-color: #a48446;
    background: #ead8a8;
  }
  :global(html[data-theme='light']) .message p,
  :global(html[data-theme='light']) .result > p {
    color: #5a6660;
  }
  :global(html[data-theme='light']) .cube-review p {
    color: #5a6660;
  }
  :global(html[data-theme='light']) .comparison button {
    border-color: #d0cec4;
    background: #f4f1e9;
    color: #303c36;
  }
  :global(html[data-theme='light']) .comparison button:last-child {
    background: #e7f0ea;
    border-color: #bfd3c6;
  }
  :global(html[data-theme='light']) .comparison small,
  :global(html[data-theme='light']) .comparison span,
  :global(html[data-theme='light']) .ranking-head > span,
  :global(html[data-theme='light']) .column-head,
  :global(html[data-theme='light']) .stats span,
  :global(html[data-theme='light']) .coach footer a {
    color: #69756e;
  }
  :global(html[data-theme='light']) .column-head,
  :global(html[data-theme='light']) .move-row,
  :global(html[data-theme='light']) .stats div {
    border-color: #dedbd1;
  }
  :global(html[data-theme='light']) .move-row {
    color: #38443e;
  }
  :global(html[data-theme='light']) .move-row:hover,
  :global(html[data-theme='light']) .move-row.active {
    background: #edf3ec;
  }
  :global(html[data-theme='light']) .move i {
    background: #e3e7df;
    color: #56645c;
  }
  :global(html[data-theme='light']) .compact-message {
    background: transparent;
  }
</style>
