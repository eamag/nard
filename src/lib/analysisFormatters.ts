import type { MoveStep } from './movePaths';
import type { Candidate, DieSlot, Review } from './gameTypes';
import type { GameResult } from './playerStats';
import { countBlots, countPointsMade, notation } from './boardUtils';

export function formatEquity(value: number): string {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(3)}`;
}

export function formatLoss(
  candidate: Candidate,
  bestCandidate: Candidate,
  isOnePointer: boolean,
): string {
  const loss = Math.max(0, bestCandidate.score - candidate.score);
  if (loss < 0.0005) return '—';
  return isOnePointer ? `−${(loss * 100).toFixed(1)}pp` : `−${Math.round(loss * 1000)}mp`;
}

export function gradeLoss(loss: number, isOnePointer: boolean): string {
  if (loss < 0.003) return 'Best move';
  if (loss < (isOnePointer ? 0.025 : 0.08)) return 'Good';
  if (loss < (isOnePointer ? 0.06 : 0.2)) return 'Mistake';
  return 'Blunder';
}

export function explainMove(review: Review, isOnePointer: boolean): string {
  if (review.loss < 0.003) {
    return `You matched WildBG: ${notation(review.best.play)} is the top-ranked play.`;
  }
  const reasons: string[] = [];
  if (Math.abs(review.best.position[0]) > Math.abs(review.chosen.position[0])) {
    reasons.push('hits a blot');
  }
  if (countPointsMade(review.best.position) > countPointsMade(review.chosen.position)) {
    reasons.push('makes an extra point');
  }
  if (countBlots(review.best.position) < countBlots(review.chosen.position)) {
    reasons.push('leaves fewer blots');
  }
  if (!reasons.length) {
    reasons.push(
      review.phase === 'race'
        ? 'creates a cleaner racing distribution'
        : 'keeps a better-balanced position',
    );
  }
  const amount = isOnePointer
    ? `${(review.loss * 100).toFixed(1)} win-percentage points`
    : `${Math.round(review.loss * 1000)} millipoints`;
  return `${notation(review.best.play)} ${reasons.slice(0, 2).join(' and ')}. WildBG values it ${amount} higher.`;
}

export function calculatePlayerDieSlots(
  roll: [number, number],
  steps: MoveStep[],
  isComplete: boolean,
): DieSlot[] {
  const values = roll[0] === roll[1] ? Array(4).fill(roll[0]) : [...roll];
  const used = new Set<number>();

  for (const step of steps) {
    const distance = step.from - step.to;
    let index = values.findIndex((value, dieIndex) => !used.has(dieIndex) && value === distance);
    if (index === -1 && step.to === 0) {
      index = values.findIndex((value, dieIndex) => !used.has(dieIndex) && value >= step.from);
    }
    if (index === -1) {
      index = values.findIndex((_, dieIndex) => !used.has(dieIndex));
    }
    if (index !== -1) {
      used.add(index);
    }
  }

  return values.map((value, index) => ({
    value,
    spent: isComplete || used.has(index),
  }));
}

export function generateRandomDice(): [number, number] {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return [(values[0] % 6) + 1, (values[1] % 6) + 1];
}

export function classifyGameResult(result: string): GameResult {
  if (result === 'drop') return 'drop';
  if (result.includes('backgammon')) return 'backgammon';
  if (result.includes('gammon')) return 'gammon';
  return 'normal';
}
