import type { GameState, PlayerMode } from './gameTypes';

export type WinnerLabel = 'You' | 'WildBG' | 'Player 1' | 'Player 2';

/** Maps the side that just moved to the displayed winner label. */
export function winnerLabelFor(playerMode: PlayerMode, lastMover: 'human' | 'bot'): WinnerLabel {
  if (playerMode === 'ai') return lastMover === 'human' ? 'You' : 'WildBG';
  return lastMover === 'human' ? 'Player 1' : 'Player 2';
}

const BUSY_STATES: readonly GameState[] = [
  'moving',
  'bot',
  'auto',
  'thinking',
  'cube-thinking',
  'cube-offer',
];

/** States that block settings changes and the auto-finish button. */
export function isBusyState(state: GameState): boolean {
  return BUSY_STATES.includes(state);
}
