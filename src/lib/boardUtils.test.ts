import { describe, expect, it } from 'bun:test';
import {
  applyBotStep,
  getOffCount,
  getPipCount,
  isFinalBoard,
  notation,
  pointName,
  START_BOARD,
  switchSides,
  toInternalStep,
  toPhysicalStep,
} from './boardUtils';

describe('boardUtils', () => {
  it('converts steps between internal and physical representations for Player 2', () => {
    // Player 2 moves from point 24 (internal) -> physical point 1
    const p2Internal = { from: 24, to: 21 };
    const p2Physical = toPhysicalStep(p2Internal, true);
    expect(p2Physical).toEqual({ from: 1, to: 4 });

    const roundTrip = toInternalStep(p2Physical, true);
    expect(roundTrip).toEqual(p2Internal);

    // Player 2 bar step: internal 25 -> physical 0
    const barStep = toPhysicalStep({ from: 25, to: 22 }, true);
    expect(barStep).toEqual({ from: 0, to: 3 });
    expect(toInternalStep(barStep, true)).toEqual({ from: 25, to: 22 });

    // Player 2 bear-off: internal 3 -> 0 -> physical 22 -> 0
    const bearOffStep = toPhysicalStep({ from: 3, to: 0 }, true);
    expect(bearOffStep).toEqual({ from: 22, to: 0 });
    expect(toInternalStep(bearOffStep, true)).toEqual({ from: 3, to: 0 });

    // Player 1 steps remain identical
    expect(toPhysicalStep({ from: 24, to: 21 }, false)).toEqual({ from: 24, to: 21 });
    expect(toInternalStep({ from: 24, to: 21 }, false)).toEqual({ from: 24, to: 21 });
  });

  it('applies bot / player 2 steps directly to the physical board', () => {
    const board = [...START_BOARD];
    // Start board has 2 bot checkers on physical point 1 (board[1] = -2)
    // In internal coords, bot is at point 24, moving to 21
    const next = applyBotStep(board, { from: 24, to: 21 });
    expect(next[1]).toBe(-1);
    expect(next[4]).toBe(-1);

    // Test hitting a human blot
    next[4] = 1; // Human blot
    const hitBoard = applyBotStep(next, { from: 24, to: 21 });
    expect(hitBoard[4]).toBe(-1);
    expect(hitBoard[25]).toBe(1); // Human checker on bar
  });

  it('accurately computes pip and off counts', () => {
    const board = [...START_BOARD];
    expect(getPipCount(board, 'human')).toBe(167);
    expect(getPipCount(board, 'bot')).toBe(167);
    expect(getOffCount(board, 'human')).toBe(0);
    expect(getOffCount(board, 'bot')).toBe(0);
  });

  it('formats point names and notations cleanly', () => {
    expect(pointName(25)).toBe('bar');
    expect(pointName(0)).toBe('off');
    expect(pointName(13)).toBe('13');

    expect(notation([{ from: 24, to: 21 }, { from: 13, to: 10 }])).toBe('24/21 13/10');
    expect(notation([])).toBe('No move');
  });

  it('inverts and negates position on switchSides', () => {
    const switched = switchSides(START_BOARD as number[]);
    expect(switched.length).toBe(26);
    expect(getPipCount(switched, 'human')).toBe(167);
    expect(getPipCount(switched, 'bot')).toBe(167);
  });

  it('detects pure bearoff races and rejects positions with contact or bar checkers', () => {
    expect(isFinalBoard([...START_BOARD])).toBe(false);

    // Human home 1-6, bot home 19-24: a race with nothing outside either home.
    const race = Array(26).fill(0) as number[];
    race[6] = 3;
    race[5] = 2;
    race[24] = -4;
    race[23] = -3;
    expect(isFinalBoard(race)).toBe(true);

    // Human blot at 7 is outside its home, so the race is not pure.
    const humanOutside = [...race];
    humanOutside[7] = 1;
    expect(isFinalBoard(humanOutside)).toBe(false);

    // Bot blot at 18 is outside its home (19-24), so the race is not pure.
    const botOutside = [...race];
    botOutside[18] = -1;
    expect(isFinalBoard(botOutside)).toBe(false);

    // Either bar resets the race; human bar is index 25, bot bar is index 0.
    const humanOnBar = [...race];
    humanOnBar[25] = 1;
    expect(isFinalBoard(humanOnBar)).toBe(false);

    const botOnBar = [...race];
    botOnBar[0] = -1;
    expect(isFinalBoard(botOnBar)).toBe(false);
  });
});
