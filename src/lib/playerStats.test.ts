import { describe, expect, test } from 'bun:test';
import {
  decisionGrade,
  decisionSeverity,
  emptyPlayerHistory,
  parsePlayerStats,
  summarizePlayerStats,
  type PlayerCubeDecision,
  type PlayerDecision,
  type PlayerGame,
  type PlayerHistory,
} from './playerStats';

function decision(overrides: Partial<PlayerDecision> = {}): PlayerDecision {
  const loss = overrides.loss ?? 0;
  const mode = overrides.mode ?? 'money';
  return {
    id: overrides.id ?? crypto.randomUUID(),
    gameId: overrides.gameId,
    playedAt: overrides.playedAt ?? new Date().toISOString(),
    mode,
    phase: overrides.phase ?? 'contact',
    loss,
    grade: overrides.grade ?? decisionGrade(loss, mode),
  };
}

function cubeDecision(overrides: Partial<PlayerCubeDecision> = {}): PlayerCubeDecision {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    gameId: overrides.gameId ?? 'game-1',
    playedAt: overrides.playedAt ?? new Date().toISOString(),
    action: overrides.action ?? 'take',
    correct: overrides.correct ?? true,
    cubeValue: overrides.cubeValue ?? 2,
  };
}

function game(overrides: Partial<PlayerGame> = {}): PlayerGame {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    startedAt: overrides.startedAt ?? '2026-08-13T10:00:00.000Z',
    endedAt: overrides.endedAt ?? '2026-08-13T10:10:00.000Z',
    durationSeconds: overrides.durationSeconds ?? 600,
    mode: overrides.mode ?? 'money',
    winner: overrides.winner ?? 'human',
    pointsFor: overrides.pointsFor ?? 1,
    pointsAgainst: overrides.pointsAgainst ?? 0,
    result: overrides.result ?? 'normal',
    cubeValue: overrides.cubeValue ?? 1,
    checkerDecisions: overrides.checkerDecisions ?? 10,
    checkerLoss: overrides.checkerLoss ?? 0.1,
    mistakes: overrides.mistakes ?? 0,
    blunders: overrides.blunders ?? 0,
    cubeDecisions: overrides.cubeDecisions ?? 0,
    cubeErrors: overrides.cubeErrors ?? 0,
  };
}

function history(overrides: Partial<PlayerHistory> = {}): PlayerHistory {
  return { ...emptyPlayerHistory(), ...overrides };
}

describe('player history and statistics', () => {
  test('grades money and one-point decisions with their own thresholds', () => {
    expect(decisionGrade(0.002, 'money')).toBe('best');
    expect(decisionGrade(0.05, 'money')).toBe('good');
    expect(decisionGrade(0.1, 'money')).toBe('mistake');
    expect(decisionGrade(0.21, 'money')).toBe('blunder');
    expect(decisionGrade(0.03, 'one-point')).toBe('mistake');
    expect(decisionGrade(0.07, 'one-point')).toBe('blunder');
  });

  test('normalizes visual severity across game modes', () => {
    expect(decisionSeverity(decision({ mode: 'money', loss: 0.1 }))).toBeCloseTo(0.5);
    expect(decisionSeverity(decision({ mode: 'one-point', loss: 0.03 }))).toBeCloseTo(0.5);
    expect(decisionSeverity(decision({ loss: 4 }))).toBe(1);
  });

  test('summarizes checker play, phases, and recent trend', () => {
    const decisions = [
      ...Array.from({ length: 20 }, (_, index) => decision({
        id: `old-${index}`,
        loss: index < 10 ? 0.01 : 0.1,
        phase: index < 12 ? 'contact' : 'race',
      })),
      ...Array.from({ length: 20 }, (_, index) => decision({
        id: `new-${index}`,
        mode: 'one-point',
        loss: index < 15 ? 0.01 : 0.07,
        phase: index < 8 ? 'contact' : 'race',
      })),
    ];

    const summary = summarizePlayerStats(history({ decisions }));

    expect(summary.decisions).toBe(40);
    expect(summary.cleanRate).toBeCloseTo(0.625);
    expect(summary.averageMoneyLoss).toBeCloseTo(0.055);
    expect(summary.averageOnePointLoss).toBeCloseTo(0.025);
    expect(summary.trend).toBeCloseTo(0.25);
    expect(summary.phases.map((phase) => phase.phase)).toEqual(['contact', 'race']);
  });

  test('waits for two full windows before calling a change a trend', () => {
    const decisions = Array.from({ length: 39 }, (_, index) => decision({ id: String(index), loss: 0.01 }));

    expect(summarizePlayerStats(history({ decisions })).trend).toBeNull();
  });

  test('summarizes game results, points, streaks, and cube choices', () => {
    const games = [
      game({ id: '1', winner: 'human', pointsFor: 2, result: 'gammon' }),
      game({ id: '2', winner: 'human', pointsFor: 4, result: 'drop' }),
      game({ id: '3', winner: 'bot', pointsFor: 0, pointsAgainst: 2 }),
      game({ id: '4', winner: 'human', pointsFor: 3, result: 'backgammon' }),
    ];
    const cubeDecisions = [
      cubeDecision({ action: 'double', correct: true }),
      cubeDecision({ action: 'no-double', correct: false }),
      cubeDecision({ action: 'take', correct: false }),
      cubeDecision({ action: 'drop', correct: true }),
    ];

    const summary = summarizePlayerStats(history({ games, cubeDecisions }));

    expect(summary.games).toBe(4);
    expect(summary.wins).toBe(3);
    expect(summary.netPoints).toBe(7);
    expect(summary.gammonWins).toBe(1);
    expect(summary.backgammonWins).toBe(1);
    expect(summary.dropsWon).toBe(1);
    expect(summary.currentGameStreak).toEqual({ winner: 'human', count: 1 });
    expect(summary.longestWinStreak).toBe(2);
    expect(summary.cubeAccuracy).toBe(0.5);
    expect(summary.missedDoubles).toBe(1);
    expect(summary.wrongTakes).toBe(1);
  });

  test('migrates legacy decision-only data and ignores malformed records', () => {
    const valid = decision({ id: 'valid' });
    const parsed = parsePlayerStats(JSON.stringify({
      version: 1,
      decisions: [valid, { id: 'broken', loss: 'a lot' }],
    }));

    expect(parsed).toEqual({ decisions: [valid], cubeDecisions: [], games: [] });
    expect(parsePlayerStats('{not json')).toEqual(emptyPlayerHistory());
  });
});
