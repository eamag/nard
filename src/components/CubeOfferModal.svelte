<script lang="ts">
  import { onMount } from 'svelte';
  import type { CubeOffer, PlayerMode } from '../lib/gameTypes';

  export let cubeValue: number;
  export let playerMode: PlayerMode;
  export let cubeOffer: CubeOffer | null;

  export let onAnswer: (take: boolean) => void;

  let takeButton: HTMLButtonElement;
  let dropButton: HTMLButtonElement;
  let previousFocus: HTMLElement | null = null;

  onMount(() => {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    takeButton.focus();
    return () => previousFocus?.focus();
  });

  function trapTabKey(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const next = document.activeElement === takeButton ? dropButton : takeButton;
    next.focus();
  }
</script>

<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cube-offer-title" tabindex="-1" onkeydown={trapTabKey}>
  <section class="cube-offer-modal">
    <span>DOUBLE OFFERED</span>
    <div class="offer-cube" aria-hidden="true">{cubeValue * 2}</div>
    {#if playerMode === 'pvp'}
      {#if cubeOffer?.offeredBy === 'player1'}
        <h2 id="cube-offer-title">Player 1 doubles.</h2>
        <p>Player 2: Take and play for {cubeValue * 2} points, or drop and lose {cubeValue} {cubeValue === 1 ? 'point' : 'points'}.</p>
        <div class="modal-actions">
          <button class="secondary" onclick={() => onAnswer(false)} bind:this={dropButton}>Drop</button>
          <button class="primary" onclick={() => onAnswer(true)} bind:this={takeButton}>Take</button>
        </div>
      {:else}
        <h2 id="cube-offer-title">Player 2 doubles.</h2>
        <p>Player 1: Take and play for {cubeValue * 2} points, or drop and lose {cubeValue} {cubeValue === 1 ? 'point' : 'points'}.</p>
        <div class="modal-actions">
          <button class="secondary" onclick={() => onAnswer(false)} bind:this={dropButton}>Drop</button>
          <button class="primary" onclick={() => onAnswer(true)} bind:this={takeButton}>Take</button>
        </div>
      {/if}
    {:else}
      <h2 id="cube-offer-title">WildBG doubles.</h2>
      <p>Take and play for {cubeValue * 2} points, or drop and lose {cubeValue}.</p>
      <div class="modal-actions">
        <button class="secondary" onclick={() => onAnswer(false)} bind:this={dropButton}>Drop</button>
        <button class="primary" onclick={() => onAnswer(true)} bind:this={takeButton}>Take</button>
      </div>
    {/if}
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
  .offer-cube {
    width: 58px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    margin: 17px auto 14px;
    border: 1px solid #b9ae98;
    border-radius: 8px;
    background: #eee7d7;
    color: #26302b;
    font-family: Georgia, serif;
    font-size: 28px;
    font-weight: 700;
    box-shadow: inset 0 -4px 0 #c9bfad, 0 8px 17px rgba(0, 0, 0, 0.32);
    transform: rotate(-4deg);
  }
  .cube-offer-modal h2 {
    margin-top: 0;
  }
  .modal-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9px;
  }
  .primary, .secondary {
    min-height: 38px;
    border-radius: 6px;
    padding: 0 15px;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .primary {
    border: 1px solid #3f695c;
    background: var(--green, #264b40);
    color: white;
  }
  .secondary {
    border: 1px solid var(--line, #303a36);
    background: var(--paper, #19201e);
    color: #d5dbd7;
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
