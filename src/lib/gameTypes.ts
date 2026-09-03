import type { MoveStep } from './movePaths';

export type Probabilities = {
  win: number;
  win_gammon: number;
  win_backgammon: number;
  lose_gammon: number;
  lose_backgammon: number;
};

export type Candidate = {
  play: MoveStep[];
  position: number[];
  equity: number;
  score: number;
  probabilities: Probabilities;
};

export type PlayerMode = 'ai' | 'pvp';
export type PlayerTurn = 'player1' | 'player2';

export type Analysis = {
  moves: Candidate[];
  phase: string;
};

export type Review = {
  chosen: Candidate;
  best: Candidate;
  loss: number;
  phase: string;
};

export type CubeDecision = {
  should_double: boolean;
  should_take: boolean;
};

export type CubeReview = {
  title: string;
  detail: string;
  correct: boolean;
};

export type CubeOffer = {
  shouldTake?: boolean;
  offeredBy?: PlayerTurn;
};

export type BotMotion = {
  from: number;
  to: number;
  label: string;
  stage: 'from' | 'to';
};

export type MoveArrow = {
  path: string;
  step: MoveStep;
};

export type DieSlot = {
  value: number | null;
  spent: boolean;
};

export type GameState =
  | 'loading'
  | 'ready'
  | 'thinking'
  | 'moving'
  | 'bot'
  | 'cube-thinking'
  | 'cube-offer'
  | 'gameover'
  | 'error';

export type ThemeMode = 'system' | 'light' | 'dark';

export type SoundName =
  | 'roll'
  | 'move'
  | 'undo'
  | 'confirm'
  | 'bot-move'
  | 'win'
  | 'loss'
  | 'reset'
  | 'toggle';
