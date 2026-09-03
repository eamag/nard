<script lang="ts">
  import { onMount } from 'svelte';
  import type { CubeReview, PlayerMode } from '../lib/gameTypes';

  export let winner: 'You' | 'WildBG' | 'Player 1' | 'Player 2' | null;
  export let winnerPoints: number;
  export let playerMode: PlayerMode;
  export let cubeReview: CubeReview | null;

  export let onReset: () => void;

  let primaryButton: HTMLButtonElement;
  let previousFocus: HTMLElement | null = null;

  onMount(() => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primaryButton.focus();
    return () => previousFocus?.focus();
  });

  function trapTabKey(event: KeyboardEvent) {
    if (event.key === 'Tab') event.preventDefault();
  }
</script>

<div class="modal" role="dialog" aria-modal="true" aria-labelledby="game-over-title" tabindex="-1" onkeydown={trapTabKey}>
  <section>
    <span>GAME OVER</span>
    <h2 id="game-over-title">{winner} won {winnerPoints} {winnerPoints === 1 ? 'point' : 'points'}.</h2>
    <p>
      {#if playerMode === 'pvp'}
        {winner === 'Player 1' ? 'Player 1 takes the game!' : 'Player 2 takes the game!'}
      {:else if cubeReview}
        {cubeReview.detail}
      {:else if winner === 'You'}
        Well played.
      {:else}
        Review your decisions and try another game.
      {/if}
    </p>
    <button class="primary" bind:this={primaryButton} onclick={onReset}>New game</button>
  </section>
</div>

<style>
  .modal {
    position: fixed;
    z-index: 80;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(4, 7, 6, 0.78);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
  }
  .modal section {
    width: min(390px, 100%);
    padding: 30px;
    border: 1px solid var(--line, #303a36);
    border-radius: 10px;
    background: var(--paper, #19201e);
    text-align: center;
  }
  .modal section > span {
    color: #8e9892;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.14em;
  }
  .modal h2 {
    margin: 8px 0;
    font-family: Georgia, serif;
    font-size: 28px;
    font-weight: 500;
  }
  .modal p {
    margin: 0 0 20px;
    color: #a4ada8;
    font-size: 11px;
  }
  .primary {
    min-height: 38px;
    border-radius: 6px;
    padding: 0 15px;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
    border: 1px solid #3f695c;
    background: var(--green, #264b40);
    color: white;
  }

  :global(html[data-theme='light']) .modal {
    background: rgba(44, 48, 42, 0.52);
  }
  :global(html[data-theme='light']) .modal section {
    background: #fbf8f1;
  }
  :global(html[data-theme='light']) .modal section > span,
  :global(html[data-theme='light']) .modal p {
    color: #66726b;
  }
</style>
