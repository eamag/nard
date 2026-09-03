import type { MoveStep } from './movePaths';
import type { MoveArrow } from './gameTypes';

export const START_BOARD: readonly number[] = [
  0, -2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5, 5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0, 2, 0,
];

export const TOP_POINTS: readonly number[] = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
export const BOTTOM_POINTS: readonly number[] = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

/**
 * Converts an internal engine step to physical board points.
 * For Player 2: point P in 1..24 maps to 25 - P; bar (25) maps to 0; bear off (0) remains 0.
 */
export function toPhysicalStep(step: MoveStep, isPlayer2: boolean): MoveStep {
  if (isPlayer2) {
    return {
      from: step.from === 25 ? 0 : 25 - step.from,
      to: step.to === 0 ? 0 : 25 - step.to,
    };
  }
  return step;
}

/**
 * Converts a physical board move to the internal engine step.
 * For Player 2: physical point P in 1..24 maps to 25 - P; physical top bar (0) maps to 25; bear off (0) remains 0.
 */
export function toInternalStep(physicalStep: MoveStep, isPlayer2: boolean): MoveStep {
  if (isPlayer2) {
    return {
      from: physicalStep.from === 0 ? 25 : 25 - physicalStep.from,
      to: physicalStep.to === 0 ? 0 : 25 - physicalStep.to,
    };
  }
  return physicalStep;
}

/**
 * Applies a step executed by Player 2 / Bot directly to the physical board array.
 * Negative checkers represent Player 2 / Bot; positive checkers represent Player 1.
 */
export function applyBotStep(position: number[], step: MoveStep): number[] {
  const next = [...position];
  const from = 25 - step.from;
  next[from] += 1;
  if (step.to === 0) return next;

  const to = 25 - step.to;
  if (next[to] === 1) {
    next[to] = -1;
    next[25] += 1;
  } else {
    next[to] -= 1;
  }
  return next;
}

/**
 * Inverts and reverses the 26-point board array for the opponent's perspective.
 */
export function switchSides(position: number[]): number[] {
  return [...position].reverse().map((value) => -value);
}

export function pointName(point: number): string {
  if (point === 25) return 'bar';
  if (point === 0) return 'off';
  return String(point);
}

export function notation(play: MoveStep[]): string {
  if (!play.length) return 'No move';
  return play.map((step) => `${pointName(step.from)}/${pointName(step.to)}`).join(' ');
}

/**
 * Computes SVG coordinates for arrow endpoints on the backgammon board.
 */
export function getArrowAnchor(point: number, isPlayer2 = false): { x: number; y: number } {
  if (!isPlayer2) {
    if (point === 25) return { x: 600, y: 535 };
    if (point === 0) return { x: 1182, y: 470 };
    if (point >= 13) return { x: (point - 12.5) * 100, y: 150 };
    return { x: (12.5 - point) * 100, y: 470 };
  } else {
    if (point === 25) return { x: 600, y: 150 };
    if (point === 0) return { x: 1182, y: 150 };
    const physical = 25 - point;
    if (physical >= 13) return { x: (physical - 12.5) * 100, y: 150 };
    return { x: (12.5 - physical) * 100, y: 470 };
  }
}

/**
 * Generates SVG path trajectories for candidate move steps.
 */
export function generateMoveArrows(play: MoveStep[], isPlayer2 = false): MoveArrow[] {
  return play.map((step, index) => {
    const start = getArrowAnchor(step.from, isPlayer2);
    const end = getArrowAnchor(step.to, isPlayer2);
    const overlapLevel = play.slice(0, index).filter((candidate) => candidate.to === step.to).length;
    const overlapOffsets = [0, -52, 52, -104, 104];
    const verticalOffset = overlapOffsets[overlapLevel] ?? overlapLevel * -52;
    const startX = start.x;
    const startY = start.y + verticalOffset;
    const endX = end.x;
    const endY = end.y + verticalOffset;
    const distance = Math.hypot(endX - startX, endY - startY) || 1;
    const directionX = (endX - startX) / distance;
    const directionY = (endY - startY) / distance;
    const normalX = -directionY;
    const normalY = directionX;
    const tipBaseX = endX - directionX * 22;
    const tipBaseY = endY - directionY * 22;
    const tipLeftX = tipBaseX + normalX * 9;
    const tipLeftY = tipBaseY + normalY * 9;
    const tipRightX = tipBaseX - normalX * 9;
    const tipRightY = tipBaseY - normalY * 9;

    return {
      path: `M ${startX} ${startY} L ${endX} ${endY} M ${tipLeftX} ${tipLeftY} L ${endX} ${endY} L ${tipRightX} ${tipRightY}`,
      step,
    };
  });
}

export function getCheckerSlots(value: number): number[] {
  return Array.from({ length: Math.min(5, Math.abs(value)) });
}

export function getOffCount(position: number[], side: 'human' | 'bot'): number {
  const onBoard = position.reduce((sum, value) => {
    if (side === 'human' && value > 0) return sum + value;
    if (side === 'bot' && value < 0) return sum + Math.abs(value);
    return sum;
  }, 0);
  return 15 - onBoard;
}

export function getPipCount(position: number[], side: 'human' | 'bot'): number {
  return position.reduce((sum, value, point) => {
    if (side === 'human' && value > 0) return sum + value * point;
    if (side === 'bot' && value < 0) return sum + Math.abs(value) * (25 - point);
    return sum;
  }, 0);
}

export function countBlots(position: number[]): number {
  return position.slice(1, 25).filter((value) => value === 1).length;
}

export function countPointsMade(position: number[]): number {
  return position.slice(1, 25).filter((value) => value >= 2).length;
}
