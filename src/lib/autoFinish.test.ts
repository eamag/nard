import { describe, expect, it } from 'bun:test';
import {
  playAutoFinish,
  type AutoFinishDeps,
  type AutoFinishOutcome,
  type AutoFinishSide,
} from './autoFinish';

function emptyBoard() {
  return Array(26).fill(0) as number[];
}

function onBoard(board: number[], sign: number) {
  return board.reduce((sum, value) => sum + (Math.sign(value) === sign ? Math.abs(value) : 0), 0);
}

describe('playAutoFinish', () => {
  it('alternates sides until the game ends and credits the winner to the last mover', async () => {
    const start = emptyBoard();
    start[6] = 3;
    start[24] = -3;

    const movers: AutoFinishSide[] = [];
    // `analyze` sees the position from the mover's perspective, so positive
    // checkers always belong to whoever is on roll.
    const deps: AutoFinishDeps = {
      rollDice: () => [6, 1],
      analyze: async (position) => {
        const next = [...position];
        const from = [6, 5, 4, 3, 2, 1].find((point) => next[point] > 0);
        if (from === undefined) return { moves: [] };
        next[from] -= 1;
        return { moves: [{ play: [{ from, to: 0 }], position: next }] };
      },
      getResult: async (physical) =>
        onBoard(physical, 1) === 0 || onBoard(physical, -1) === 0 ? 'win' : 'ongoing',
    };

    const outcome = await playAutoFinish(start, 'human', deps, {
      onTurn: ({ mover }) => {
        movers.push(mover);
      },
    });

    // Human empties their home on the fifth move, before the bot gets there.
    expect(movers).toEqual(['human', 'bot', 'human', 'bot', 'human']);
    expect(outcome.turns).toBe(5);
    expect(outcome.result).not.toBe('ongoing');
    expect(outcome.lastMover).toBe('human');
    expect(outcome.nextSide).toBeNull();
    expect(outcome.cancelled).toBe(false);
  });

  it('leaves the original side on roll when cancelled before any move', async () => {
    const start = emptyBoard();
    start[6] = 5;
    start[24] = -5;

    const outcome: AutoFinishOutcome = await playAutoFinish(start, 'human', {
      rollDice: () => [6, 6],
      analyze: async (position) => ({ moves: [{ play: [], position: [...position] }] }),
      getResult: async () => 'ongoing',
    }, { isCancelled: () => true });

    expect(outcome.cancelled).toBe(true);
    expect(outcome.turns).toBe(0);
    expect(outcome.nextSide).toBe('human');
  });

  it('hands the turn to the opponent when cancelled mid-race', async () => {
    const start = emptyBoard();
    start[6] = 5;
    start[24] = -5;
    let moves = 0;
    let cancelled = false;

    const outcome = await playAutoFinish(start, 'human', {
      rollDice: () => [6, 6],
      analyze: async (position) => ({ moves: [{ play: [], position: [...position] }] }),
      getResult: async () => 'ongoing',
    }, {
      isCancelled: () => cancelled,
      // Cancel only once the human has moved, so the bot is next.
      onTurn: () => {
        moves += 1;
        cancelled = moves === 1;
      },
    });

    expect(outcome.cancelled).toBe(true);
    expect(outcome.lastMover).toBe('human');
    expect(outcome.nextSide).toBe('bot');
    expect(outcome.turns).toBe(1);
  });

  it('reports the side on roll when the race runs past maxTurns, without claiming a cancel', async () => {
    const start = emptyBoard();
    start[6] = 5;
    start[24] = -5;

    const outcome = await playAutoFinish(start, 'bot', {
      rollDice: () => [6, 6],
      analyze: async (position) => ({ moves: [{ play: [], position: [...position] }] }),
      getResult: async () => 'ongoing',
    }, { maxTurns: 4 });

    expect(outcome.result).toBe('ongoing');
    expect(outcome.turns).toBe(4);
    // Running long is not a cancellation, so the caller can tell them apart.
    expect(outcome.cancelled).toBe(false);
    expect(outcome.nextSide).toBe('bot');
  });

  it('leaves the blocked side on roll when no move is legal', async () => {
    const start = emptyBoard();
    start[6] = 5;
    start[24] = -5;

    const outcome = await playAutoFinish(start, 'human', {
      rollDice: () => [6, 6],
      analyze: async () => ({ moves: [] }),
      getResult: async () => 'ongoing',
    });

    expect(outcome.result).toBe('ongoing');
    expect(outcome.cancelled).toBe(false);
    expect(outcome.turns).toBe(0);
    expect(outcome.nextSide).toBe('human');
  });
});
