export type MoveStep = { from: number; to: number };

type MoveCandidate = {
  play: MoveStep[];
  position: number[];
};

export type MovePath<T extends MoveCandidate> = {
  candidate: T;
  play: MoveStep[];
};

type GeneratedPlay = {
  play: MoveStep[];
  position: number[];
};

export function sameStep(left: MoveStep | undefined, right: MoveStep | undefined) {
  return Boolean(left && right && left.from === right.from && left.to === right.to);
}

export function samePlay(left: MoveStep[], right: MoveStep[]) {
  return left.length === right.length && left.every((step, index) => sameStep(step, right[index]));
}

export function applyStep(position: number[], step: MoveStep) {
  const next = [...position];
  next[step.from] -= 1;
  if (step.to === 0) return next;
  if (next[step.to] === -1) {
    next[step.to] = 1;
    next[0] -= 1;
  } else {
    next[step.to] += 1;
  }
  return next;
}

/**
 * WildBG returns one canonical notation for each legal final position. A player
 * can sometimes reach that same position through a different order or stopover
 * (for example 13/8 8/5 instead of 13/10 10/5 with 5-3). Generate the actual
 * die-by-die paths so all equivalent legal interactions remain selectable.
 */
export function expandMovePaths<T extends MoveCandidate>(
  candidates: T[],
  position: number[],
  roll: [number, number],
): MovePath<T>[] {
  const paths: MovePath<T>[] = [];
  const seen = new Set<string>();
  const generatedByLength = new Map<number, GeneratedPlay[]>();

  for (const candidate of candidates) {
    const moveCount = candidate.play.length;
    let generated = generatedByLength.get(moveCount);
    if (!generated) {
      generated = generatePlays(position, roll, moveCount);
      generatedByLength.set(moveCount, generated);
    }

    for (const option of generated) {
      if (!samePosition(option.position, candidate.position)) continue;
      const key = option.play.map((step) => `${step.from}/${step.to}`).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      paths.push({ candidate, play: option.play });
    }
  }

  return paths;
}

function generatePlays(position: number[], roll: [number, number], moveCount: number) {
  if (moveCount === 0) return [{ play: [], position: [...position] }];

  const dice = roll[0] === roll[1] ? Array(4).fill(roll[0]) : [...roll];
  const plays: GeneratedPlay[] = [];

  function visit(current: number[], remainingDice: number[], play: MoveStep[]) {
    if (play.length === moveCount) {
      plays.push({ play, position: current });
      return;
    }

    const triedDice = new Set<number>();
    remainingDice.forEach((die, dieIndex) => {
      if (triedDice.has(die)) return;
      triedDice.add(die);
      const nextDice = [...remainingDice.slice(0, dieIndex), ...remainingDice.slice(dieIndex + 1)];
      for (const step of legalStepsForDie(current, die)) {
        visit(applyStep(current, step), nextDice, [...play, step]);
      }
    });
  }

  visit([...position], dice, []);
  return plays;
}

function legalStepsForDie(position: number[], die: number) {
  const steps: MoveStep[] = [];
  const sources = position[25] > 0
    ? [25]
    : Array.from({ length: 24 }, (_, index) => index + 1).filter((point) => position[point] > 0);

  for (const from of sources) {
    const destination = from - die;
    if (destination <= 0) {
      if (canBearOff(position, from, die)) steps.push({ from, to: 0 });
    } else if (position[destination] >= -1) {
      steps.push({ from, to: destination });
    }
  }

  return steps;
}

function canBearOff(position: number[], from: number, die: number) {
  if (from > 6 || position[25] > 0) return false;
  if (position.slice(7, 25).some((checkers) => checkers > 0)) return false;
  if (die === from) return true;
  if (die < from) return false;
  return position.slice(from + 1, 7).every((checkers) => checkers <= 0);
}

function samePosition(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
