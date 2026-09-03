import { describe, expect, test } from 'bun:test';
import { applyStep, expandMovePaths, type MoveStep } from './movePaths';

type Candidate = {
  play: MoveStep[];
  position: number[];
};

function emptyPosition() {
  return Array(26).fill(0) as number[];
}

describe('expandMovePaths', () => {
  test('includes an equivalent stopover that differs from WildBG notation', () => {
    const position = emptyPosition();
    position[13] = 1;
    const canonical = [{ from: 13, to: 10 }, { from: 10, to: 5 }];
    const candidate: Candidate = {
      play: canonical,
      position: canonical.reduce(applyStep, position),
    };

    const paths = expandMovePaths([candidate], position, [5, 3]).map(({ play }) => play);

    expect(paths).toContainEqual(canonical);
    expect(paths).toContainEqual([{ from: 13, to: 8 }, { from: 8, to: 5 }]);
  });

  test('does not include an equivalent route through a blocked point', () => {
    const position = emptyPosition();
    position[13] = 1;
    position[8] = -2;
    const canonical = [{ from: 13, to: 10 }, { from: 10, to: 5 }];
    const candidate: Candidate = {
      play: canonical,
      position: canonical.reduce(applyStep, position),
    };

    const paths = expandMovePaths([candidate], position, [5, 3]).map(({ play }) => play);

    expect(paths).toContainEqual(canonical);
    expect(paths).not.toContainEqual([{ from: 13, to: 8 }, { from: 8, to: 5 }]);
  });
});
