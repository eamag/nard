import { describe, expect, it } from 'bun:test';
import { isBusyState, winnerLabelFor } from './gameHelpers';

describe('gameHelpers', () => {
  it('maps the side that just moved to the winner label for each mode', () => {
    expect(winnerLabelFor('ai', 'human')).toBe('You');
    expect(winnerLabelFor('ai', 'bot')).toBe('WildBG');
    expect(winnerLabelFor('pvp', 'human')).toBe('Player 1');
    expect(winnerLabelFor('pvp', 'bot')).toBe('Player 2');
  });

  it('flags the states that block settings changes and auto-finish', () => {
    // 'auto' must stay in the set: the auto-finish loop blocks settings.
    for (const state of ['moving', 'bot', 'auto', 'thinking', 'cube-thinking', 'cube-offer'] as const) {
      expect(isBusyState(state)).toBe(true);
    }
    for (const state of ['loading', 'ready', 'gameover', 'error'] as const) {
      expect(isBusyState(state)).toBe(false);
    }
  });
});
