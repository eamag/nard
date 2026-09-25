import type { MoveStep } from './movePaths';
import { switchSides } from './boardUtils';

export type AutoFinishSide = 'human' | 'bot';

export type AutoFinishCandidate = {
  play: MoveStep[];
  position: number[];
};

export type AutoFinishDeps = {
  rollDice: () => [number, number];
  analyze: (position: number[], dieOne: number, dieTwo: number) => Promise<{ moves: AutoFinishCandidate[] }>;
  getResult: (physicalBoard: number[]) => Promise<string>;
};

export type AutoFinishOptions = {
  maxTurns?: number;
  isCancelled?: () => boolean;
  onTurn?: (info: {
    board: number[];
    mover: AutoFinishSide;
    dice: [number, number];
    turnIndex: number;
  }) => void | Promise<void>;
};

export type AutoFinishOutcome = {
  board: number[];
  result: string;
  /** Side that played the final move, i.e. the winner. Null if the game never ended. */
  lastMover: AutoFinishSide | null;
  /**
   * Side that is on roll when the loop stopped, so a caller resuming manual
   * play hands the turn to the right player. Null once the game has ended.
   */
  nextSide: AutoFinishSide | null;
  turns: number;
  cancelled: boolean;
};

/**
 * Plays out a pure bearoff race by alternating WildBG top moves until the
 * engine reports a finished game. Boards are physical (human perspective);
 * the bot side is analyzed via switchSides, mirroring Nard.svelte.
 */
export async function playAutoFinish(
  startBoard: number[],
  startSide: AutoFinishSide,
  deps: AutoFinishDeps,
  options: AutoFinishOptions = {},
): Promise<AutoFinishOutcome> {
  const maxTurns = options.maxTurns ?? 200;
  let current = [...startBoard];
  let side: AutoFinishSide = startSide;
  let lastMover: AutoFinishSide | null = null;
  let turns = 0;

  for (let i = 0; i < maxTurns; i++) {
    if (options.isCancelled?.()) {
      return { board: current, result: 'ongoing', lastMover, nextSide: side, turns, cancelled: true };
    }
    const positionToAnalyze = side === 'bot' ? switchSides(current) : [...current];
    const [dieOne, dieTwo] = deps.rollDice();
    const analysis = await deps.analyze(positionToAnalyze, dieOne, dieTwo);
    const choice = analysis.moves[0];
    if (!choice) {
      return { board: current, result: 'ongoing', lastMover, nextSide: side, turns, cancelled: false };
    }
    current = side === 'bot' ? switchSides(choice.position) : [...choice.position];
    lastMover = side;
    turns += 1;
    await options.onTurn?.({ board: [...current], mover: side, dice: [dieOne, dieTwo], turnIndex: turns });
    const result = await deps.getResult(current);
    if (result !== 'ongoing') {
      return { board: current, result, lastMover, nextSide: null, turns, cancelled: false };
    }
    side = side === 'human' ? 'bot' : 'human';
  }

  // Ran out of turns without a result: not a cancellation, the race just ran long.
  return { board: current, result: 'ongoing', lastMover, nextSide: side, turns, cancelled: false };
}
