import { describe, expect, test } from 'bun:test';
import { acceptDouble, canOfferDouble, gamePoints } from './cubeRules';

describe('doubling cube rules', () => {
  test('the centered cube can be offered by either player', () => {
    expect(canOfferDouble('center', 'human', 1, false)).toBe(true);
    expect(canOfferDouble('center', 'bot', 1, false)).toBe(true);
  });

  test('only the cube owner can redouble', () => {
    expect(canOfferDouble('human', 'human', 2, false)).toBe(true);
    expect(canOfferDouble('human', 'bot', 2, false)).toBe(false);
  });

  test('the cube is unavailable in one-point play and after 64', () => {
    expect(canOfferDouble('center', 'human', 1, true)).toBe(false);
    expect(canOfferDouble('human', 'human', 64, false)).toBe(false);
  });

  test('the taker owns the accepted cube', () => {
    expect(acceptDouble(1, 'human')).toEqual({ value: 2, owner: 'bot' });
    expect(acceptDouble(2, 'bot')).toEqual({ value: 4, owner: 'human' });
  });

  test('scores drops and completed games at the current cube value', () => {
    expect(gamePoints('drop', 4, false)).toBe(4);
    expect(gamePoints('win', 4, false)).toBe(4);
    expect(gamePoints('win-gammon', 4, false)).toBe(8);
    expect(gamePoints('loss-backgammon', 4, false)).toBe(12);
    expect(gamePoints('win-backgammon', 4, true)).toBe(1);
  });
});
