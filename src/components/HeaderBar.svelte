<script lang="ts">
  import type { PlayerMode, ThemeMode } from '../lib/gameTypes';

  export let playerMode: PlayerMode;
  export let onePointer: boolean;
  export let themeMode: ThemeMode;
  export let isDark: boolean;
  export let muted: boolean;
  export let canChangeSettings: boolean;

  export let onTogglePlayerMode: () => void;
  export let onToggleScoreMode: () => void;
  export let onCycleTheme: () => void;
  export let onToggleMuted: () => void;
  export let onReset: () => void;
</script>

<header class="app-header">
  <a href="/" class="brand"><span class="brand-piece"></span><strong>NARD</strong></a>
  <div class="header-actions">
    <a class="stats-link" href="/stats" aria-label="View your player statistics">
      <span class="stats-icon" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="stats-link-label">Stats</span>
    </a>
    <button
      class="player-mode-button"
      onclick={onTogglePlayerMode}
      disabled={!canChangeSettings}
      aria-label={`Player mode: ${playerMode === 'ai' ? 'vs WildBG' : '2 Players'}. Activate to switch.`}
      title={!canChangeSettings ? 'Start a new game to change mode' : playerMode === 'ai' ? 'Switch to 2 Players (Pass & Play)' : 'Switch to vs WildBG'}
    >{playerMode === 'ai' ? 'vs WildBG' : '2 Players'}</button>
    <button
      class="score-mode-button"
      onclick={onToggleScoreMode}
      disabled={!canChangeSettings}
      aria-label={`Game mode: ${onePointer ? 'one-point' : 'money play'}. Activate to switch.`}
      title={!canChangeSettings ? 'Start a new game to change mode' : onePointer ? 'Switch to money play' : 'Switch to a one-point game'}
    >{onePointer ? '1-point' : 'Money'}</button>
    <button
      class="theme-button"
      onclick={onCycleTheme}
      aria-label={`Appearance: ${themeMode === 'system' ? `Auto, currently ${isDark ? 'dark' : 'light'}` : isDark ? 'dark' : 'light'}. Activate to change.`}
      title="Cycle appearance: Auto, Dark, Light"
    >
      <span class="theme-icon" class:dark={isDark} aria-hidden="true">{isDark ? '◐' : '☀'}</span>
      <span class="theme-label">{themeMode === 'system' ? 'Auto' : isDark ? 'Dark' : 'Light'}</span>
    </button>
    <button
      class="sound-button"
      class:muted
      aria-pressed={muted}
      onclick={onToggleMuted}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10v4h4l5 4V6l-5 4H4Z"></path>
        {#if muted}
          <path class="mute-slash" d="m16 9 4 4m0-4-4 4"></path>
        {:else}
          <path class="sound-wave" d="M16 9.5a4 4 0 0 1 0 5m2.5-7.5a7.5 7.5 0 0 1 0 10"></path>
        {/if}
      </svg>
    </button>
    <button class="quiet-button" onclick={onReset}>New game</button>
  </div>
</header>

<style>
  .app-header {
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(18px, 3.5vw, 52px);
    background: rgba(15, 20, 18, 0.96);
    border-bottom: 1px solid #28312e;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    color: var(--ink);
    text-decoration: none;
  }
  .brand strong {
    font-family: Georgia, serif;
    font-size: 18px;
    letter-spacing: 0.12em;
  }
  .brand-piece {
    width: 18px;
    height: 18px;
    display: block;
    border: 5px solid var(--green);
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--cream);
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .stats-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #c0c7c2;
    font-size: 11px;
    font-weight: 800;
    text-decoration: none;
    transition: color 0.18s ease;
  }
  .stats-link:hover {
    color: var(--ink);
  }
  .stats-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid #46504b;
    border-radius: 4px;
  }
  .stats-icon i {
    width: 2px;
    border-radius: 2px 2px 0 0;
    background: currentColor;
  }
  .stats-icon i:nth-child(1) { height: 4px; }
  .stats-icon i:nth-child(2) { height: 9px; }
  .stats-icon i:nth-child(3) { height: 6px; }
  .player-mode-button,
  .score-mode-button {
    border: 1px solid #39433f;
    border-radius: 999px;
    padding: 5px 9px;
    background: #202825;
    color: #c1c9c4;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }
  .player-mode-button:disabled,
  .score-mode-button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .theme-button {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    padding: 4px 0;
    background: transparent;
    color: #c0c7c2;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: color 0.18s ease;
  }
  .theme-button:hover {
    color: var(--ink);
  }
  .theme-icon {
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    border: 1px solid #46504b;
    border-radius: 50%;
    background: #252c29;
    color: #efd47b;
    font-size: 13px;
    line-height: 1;
  }
  .theme-icon.dark { color: #c7d9d1; }
  .sound-button {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border: 1px solid #39433f;
    border-radius: 50%;
    padding: 0;
    background: #202825;
    color: #d7ded9;
    cursor: pointer;
    transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }
  .sound-button:hover {
    border-color: #68746e;
    background: #29322f;
  }
  .sound-button.muted {
    color: #929b96;
    border-color: #47514c;
    background: transparent;
  }
  .sound-button svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }
  .sound-button .sound-wave,
  .sound-button .mute-slash {
    fill: none;
  }
  .stats-link:focus-visible,
  .player-mode-button:focus-visible,
  .score-mode-button:focus-visible,
  .theme-button:focus-visible,
  .sound-button:focus-visible,
  .quiet-button:focus-visible {
    outline: 2px solid #f3cc69;
    outline-offset: 3px;
  }
  .quiet-button {
    border: 1px solid #39433f;
    border-radius: 999px;
    padding: 5px 12px;
    background: #202825;
    color: #e8ece9;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }
  .quiet-button:hover {
    border-color: #68746e;
    background: #29322f;
    color: white;
  }

  @media (max-width: 680px) {
    .app-header {
      height: 58px;
      padding-inline: 14px;
    }
    .header-actions {
      gap: 11px;
    }
    .stats-link-label {
      display: none;
    }
    .stats-link {
      width: 24px;
      justify-content: center;
    }
  }

  :global(html[data-theme='light']) .app-header {
    background: rgba(251, 248, 241, 0.96);
    border-color: #d7d3c8;
  }
  :global(html[data-theme='light']) .player-mode-button,
  :global(html[data-theme='light']) .score-mode-button {
    border-color: #b7bcb4;
    background: #f3efe6;
    color: #45524b;
  }
  :global(html[data-theme='light']) .stats-link,
  :global(html[data-theme='light']) .theme-button,
  :global(html[data-theme='light']) .quiet-button {
    color: #3f4a44;
  }
  :global(html[data-theme='light']) .stats-link:hover,
  :global(html[data-theme='light']) .theme-button:hover {
    color: #16201b;
  }
  :global(html[data-theme='light']) .quiet-button {
    border-color: #b7bcb4;
    background: #f3efe6;
  }
  :global(html[data-theme='light']) .quiet-button:hover {
    border-color: #76877d;
    background: #eceae0;
    color: #16201b;
  }
  :global(html[data-theme='light']) .theme-icon {
    border-color: #b4bbb3;
    background: #f4f1e9;
    color: #9a6b17;
  }
  :global(html[data-theme='light']) .sound-button {
    border-color: #b7bcb4;
    background: #f7f4ed;
    color: #38443e;
  }
  :global(html[data-theme='light']) .sound-button:hover {
    border-color: #76877d;
    background: #eceae0;
  }
  :global(html[data-theme='light']) .sound-button.muted {
    color: #7b847d;
    background: transparent;
  }
</style>
