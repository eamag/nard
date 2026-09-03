export const PLAYER_STATS_STORAGE_KEY = 'nard:player-history-v2';
const LEGACY_PLAYER_STATS_STORAGE_KEY = 'nard:player-stats-v1';

export type DecisionMode = 'money' | 'one-point';
export type DecisionGrade = 'best' | 'good' | 'mistake' | 'blunder';
export type CubeAction = 'double' | 'no-double' | 'take' | 'drop';
export type GameResult = 'normal' | 'gammon' | 'backgammon' | 'drop';

export type PlayerDecision = {
  id: string;
  gameId?: string;
  playedAt: string;
  mode: DecisionMode;
  phase: string;
  loss: number;
  grade: DecisionGrade;
};

export type PlayerCubeDecision = {
  id: string;
  gameId: string;
  playedAt: string;
  action: CubeAction;
  correct: boolean;
  cubeValue: number;
};

export type PlayerGame = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  mode: DecisionMode;
  winner: 'human' | 'bot';
  pointsFor: number;
  pointsAgainst: number;
  result: GameResult;
  cubeValue: number;
  checkerDecisions: number;
  checkerLoss: number;
  mistakes: number;
  blunders: number;
  cubeDecisions: number;
  cubeErrors: number;
};

export type PlayerHistory = {
  decisions: PlayerDecision[];
  cubeDecisions: PlayerCubeDecision[];
  games: PlayerGame[];
};

export type DecisionInput = Pick<PlayerDecision, 'mode' | 'phase' | 'loss'> & { gameId?: string };
export type CubeDecisionInput = Omit<PlayerCubeDecision, 'id' | 'playedAt'>;
export type GameInput = Omit<PlayerGame, 'endedAt'> & { endedAt?: string };

export type PhaseSummary = {
  phase: string;
  decisions: number;
  cleanRate: number;
  blunderRate: number;
};

export type PlayerStatsSummary = {
  decisions: number;
  cleanDecisions: number;
  cleanRate: number;
  best: number;
  good: number;
  mistakes: number;
  blunders: number;
  blunderRate: number;
  cleanStreak: number;
  moneyDecisions: number;
  averageMoneyLoss: number | null;
  onePointDecisions: number;
  averageOnePointLoss: number | null;
  recentCleanRate: number | null;
  previousCleanRate: number | null;
  trend: number | null;
  phases: PhaseSummary[];
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  recentWinRate: number | null;
  pointsFor: number;
  pointsAgainst: number;
  netPoints: number;
  gammonWins: number;
  backgammonWins: number;
  dropsWon: number;
  currentGameStreak: { winner: 'human' | 'bot'; count: number } | null;
  longestWinStreak: number;
  averageGameSeconds: number | null;
  cubeDecisions: number;
  correctCubeDecisions: number;
  cubeAccuracy: number;
  doubles: number;
  takes: number;
  drops: number;
  missedDoubles: number;
  wrongDoubles: number;
  wrongTakes: number;
  wrongDrops: number;
};

const MAX_STORED_DECISIONS = 5_000;
const MAX_STORED_CUBE_DECISIONS = 5_000;
const MAX_STORED_GAMES = 1_000;

export function createStatsId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function decisionGrade(loss: number, mode: DecisionMode): DecisionGrade {
  if (loss < 0.003) return 'best';
  if (loss < (mode === 'one-point' ? 0.025 : 0.08)) return 'good';
  if (loss < (mode === 'one-point' ? 0.06 : 0.2)) return 'mistake';
  return 'blunder';
}

export function decisionSeverity(decision: Pick<PlayerDecision, 'loss' | 'mode'>) {
  const blunderThreshold = decision.mode === 'one-point' ? 0.06 : 0.2;
  return Math.min(1, Math.max(0, decision.loss / blunderThreshold));
}

export function emptyPlayerHistory(): PlayerHistory {
  return { decisions: [], cubeDecisions: [], games: [] };
}

export function parsePlayerStats(raw: string | null): PlayerHistory {
  if (!raw) return emptyPlayerHistory();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return emptyPlayerHistory();
    const value = parsed as Record<string, unknown>;

    return {
      decisions: Array.isArray(value.decisions)
        ? value.decisions.filter(isPlayerDecision).slice(-MAX_STORED_DECISIONS)
        : [],
      cubeDecisions: Array.isArray(value.cubeDecisions)
        ? value.cubeDecisions.filter(isPlayerCubeDecision).slice(-MAX_STORED_CUBE_DECISIONS)
        : [],
      games: Array.isArray(value.games)
        ? value.games.filter(isPlayerGame).slice(-MAX_STORED_GAMES)
        : [],
    };
  } catch {
    return emptyPlayerHistory();
  }
}

export function loadPlayerStats(): PlayerHistory {
  if (typeof localStorage === 'undefined') return emptyPlayerHistory();
  try {
    const current = localStorage.getItem(PLAYER_STATS_STORAGE_KEY);
    if (current) return parsePlayerStats(current);
    return parsePlayerStats(localStorage.getItem(LEGACY_PLAYER_STATS_STORAGE_KEY));
  } catch {
    return emptyPlayerHistory();
  }
}

export function recordPlayerDecision(input: DecisionInput): PlayerDecision | null {
  const loss = Math.max(0, input.loss);
  const decision: PlayerDecision = {
    ...input,
    loss,
    grade: decisionGrade(loss, input.mode),
    id: createStatsId(),
    playedAt: new Date().toISOString(),
  };

  return updatePlayerHistory((history) => {
    history.decisions = [...history.decisions, decision].slice(-MAX_STORED_DECISIONS);
  }) ? decision : null;
}

export function recordPlayerCubeDecision(input: CubeDecisionInput): PlayerCubeDecision | null {
  const decision: PlayerCubeDecision = {
    ...input,
    id: createStatsId(),
    playedAt: new Date().toISOString(),
  };

  return updatePlayerHistory((history) => {
    history.cubeDecisions = [...history.cubeDecisions, decision].slice(-MAX_STORED_CUBE_DECISIONS);
  }) ? decision : null;
}

export function recordPlayerGame(input: GameInput): PlayerGame | null {
  const game: PlayerGame = {
    ...input,
    endedAt: input.endedAt ?? new Date().toISOString(),
  };

  return updatePlayerHistory((history) => {
    history.games = [...history.games.filter((item) => item.id !== game.id), game].slice(-MAX_STORED_GAMES);
  }) ? game : null;
}

export function clearPlayerStats() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(PLAYER_STATS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PLAYER_STATS_STORAGE_KEY);
  } catch {
    // Statistics remain available when browser storage cannot be changed.
  }
}

export function summarizePlayerStats(history: PlayerHistory): PlayerStatsSummary {
  const { decisions, cubeDecisions, games } = history;
  const counts: Record<DecisionGrade, number> = { best: 0, good: 0, mistake: 0, blunder: 0 };
  for (const decision of decisions) counts[decision.grade] += 1;

  const cleanDecisions = counts.best + counts.good;
  const money = decisions.filter((decision) => decision.mode === 'money');
  const onePoint = decisions.filter((decision) => decision.mode === 'one-point');
  const recent = decisions.slice(-20);
  const previous = decisions.slice(-40, -20);
  const recentCleanRate = recent.length === 20 ? rate(recent.filter(isClean).length, recent.length) : null;
  const previousCleanRate = previous.length === 20 ? rate(previous.filter(isClean).length, previous.length) : null;
  const wins = games.filter((game) => game.winner === 'human');
  const recentGames = games.slice(-20);
  const correctCubeDecisions = cubeDecisions.filter((decision) => decision.correct).length;

  const phaseGroups = new Map<string, PlayerDecision[]>();
  for (const decision of decisions) {
    const group = phaseGroups.get(decision.phase) ?? [];
    group.push(decision);
    phaseGroups.set(decision.phase, group);
  }

  return {
    decisions: decisions.length,
    cleanDecisions,
    cleanRate: rate(cleanDecisions, decisions.length),
    best: counts.best,
    good: counts.good,
    mistakes: counts.mistake,
    blunders: counts.blunder,
    blunderRate: rate(counts.blunder, decisions.length),
    cleanStreak: trailingCount(decisions, isClean),
    moneyDecisions: money.length,
    averageMoneyLoss: averageLoss(money),
    onePointDecisions: onePoint.length,
    averageOnePointLoss: averageLoss(onePoint),
    recentCleanRate,
    previousCleanRate,
    trend: recentCleanRate !== null && previousCleanRate !== null ? recentCleanRate - previousCleanRate : null,
    phases: [...phaseGroups.entries()]
      .map(([phase, group]) => ({
        phase,
        decisions: group.length,
        cleanRate: rate(group.filter(isClean).length, group.length),
        blunderRate: rate(group.filter((decision) => decision.grade === 'blunder').length, group.length),
      }))
      .sort((a, b) => b.decisions - a.decisions),
    games: games.length,
    wins: wins.length,
    losses: games.length - wins.length,
    winRate: rate(wins.length, games.length),
    recentWinRate: recentGames.length >= 5
      ? rate(recentGames.filter((game) => game.winner === 'human').length, recentGames.length)
      : null,
    pointsFor: games.reduce((sum, game) => sum + game.pointsFor, 0),
    pointsAgainst: games.reduce((sum, game) => sum + game.pointsAgainst, 0),
    netPoints: games.reduce((sum, game) => sum + game.pointsFor - game.pointsAgainst, 0),
    gammonWins: wins.filter((game) => game.result === 'gammon').length,
    backgammonWins: wins.filter((game) => game.result === 'backgammon').length,
    dropsWon: wins.filter((game) => game.result === 'drop').length,
    currentGameStreak: currentGameStreak(games),
    longestWinStreak: longestWinStreak(games),
    averageGameSeconds: games.length
      ? games.reduce((sum, game) => sum + game.durationSeconds, 0) / games.length
      : null,
    cubeDecisions: cubeDecisions.length,
    correctCubeDecisions,
    cubeAccuracy: rate(correctCubeDecisions, cubeDecisions.length),
    doubles: cubeDecisions.filter((decision) => decision.action === 'double').length,
    takes: cubeDecisions.filter((decision) => decision.action === 'take').length,
    drops: cubeDecisions.filter((decision) => decision.action === 'drop').length,
    missedDoubles: cubeDecisions.filter((decision) => decision.action === 'no-double' && !decision.correct).length,
    wrongDoubles: cubeDecisions.filter((decision) => decision.action === 'double' && !decision.correct).length,
    wrongTakes: cubeDecisions.filter((decision) => decision.action === 'take' && !decision.correct).length,
    wrongDrops: cubeDecisions.filter((decision) => decision.action === 'drop' && !decision.correct).length,
  };
}

function updatePlayerHistory(update: (history: PlayerHistory) => void) {
  if (typeof localStorage === 'undefined') return false;
  try {
    const history = loadPlayerStats();
    update(history);
    localStorage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify({ version: 2, ...history }));
    return true;
  } catch {
    return false;
  }
}

function isPlayerDecision(value: unknown): value is PlayerDecision {
  if (!value || typeof value !== 'object') return false;
  const decision = value as Record<string, unknown>;
  return typeof decision.id === 'string'
    && (decision.gameId === undefined || typeof decision.gameId === 'string')
    && typeof decision.playedAt === 'string'
    && (decision.mode === 'money' || decision.mode === 'one-point')
    && typeof decision.phase === 'string'
    && isFiniteNonNegative(decision.loss)
    && (decision.grade === 'best' || decision.grade === 'good' || decision.grade === 'mistake' || decision.grade === 'blunder');
}

function isPlayerCubeDecision(value: unknown): value is PlayerCubeDecision {
  if (!value || typeof value !== 'object') return false;
  const decision = value as Record<string, unknown>;
  return typeof decision.id === 'string'
    && typeof decision.gameId === 'string'
    && typeof decision.playedAt === 'string'
    && (decision.action === 'double' || decision.action === 'no-double' || decision.action === 'take' || decision.action === 'drop')
    && typeof decision.correct === 'boolean'
    && isFiniteNonNegative(decision.cubeValue);
}

function isPlayerGame(value: unknown): value is PlayerGame {
  if (!value || typeof value !== 'object') return false;
  const game = value as Record<string, unknown>;
  return typeof game.id === 'string'
    && typeof game.startedAt === 'string'
    && typeof game.endedAt === 'string'
    && isFiniteNonNegative(game.durationSeconds)
    && (game.mode === 'money' || game.mode === 'one-point')
    && (game.winner === 'human' || game.winner === 'bot')
    && isFiniteNonNegative(game.pointsFor)
    && isFiniteNonNegative(game.pointsAgainst)
    && (game.result === 'normal' || game.result === 'gammon' || game.result === 'backgammon' || game.result === 'drop')
    && isFiniteNonNegative(game.cubeValue)
    && isFiniteNonNegative(game.checkerDecisions)
    && isFiniteNonNegative(game.checkerLoss)
    && isFiniteNonNegative(game.mistakes)
    && isFiniteNonNegative(game.blunders)
    && isFiniteNonNegative(game.cubeDecisions)
    && isFiniteNonNegative(game.cubeErrors);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isClean(decision: PlayerDecision) {
  return decision.grade === 'best' || decision.grade === 'good';
}

function rate(count: number, total: number) {
  return total ? count / total : 0;
}

function averageLoss(decisions: PlayerDecision[]) {
  return decisions.length
    ? decisions.reduce((sum, decision) => sum + decision.loss, 0) / decisions.length
    : null;
}

function trailingCount(decisions: PlayerDecision[], predicate: (decision: PlayerDecision) => boolean) {
  let count = 0;
  for (let index = decisions.length - 1; index >= 0 && predicate(decisions[index]); index -= 1) count += 1;
  return count;
}

function currentGameStreak(games: PlayerGame[]) {
  const last = games.at(-1);
  if (!last) return null;
  let count = 0;
  for (let index = games.length - 1; index >= 0 && games[index].winner === last.winner; index -= 1) count += 1;
  return { winner: last.winner, count };
}

function longestWinStreak(games: PlayerGame[]) {
  let longest = 0;
  let current = 0;
  for (const game of games) {
    current = game.winner === 'human' ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}
