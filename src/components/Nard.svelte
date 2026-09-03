<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import {
    applyStep,
    expandMovePaths,
    samePlay,
    sameStep,
    type MovePath,
    type MoveStep,
  } from '../lib/movePaths';
  import {
    acceptDouble,
    canOfferDouble,
    gamePoints,
    type CubeOwner,
  } from '../lib/cubeRules';
  import { createWildbgEngine, type WildbgEngine } from '../lib/wildbgEngine';
  import {
    createStatsId,
    recordPlayerCubeDecision,
    recordPlayerDecision,
    recordPlayerGame,
    type CubeAction,
  } from '../lib/playerStats';
  import type {
    Analysis,
    BotMotion,
    Candidate,
    CubeDecision,
    CubeOffer,
    CubeReview,
    DieSlot,
    GameState,
    MoveArrow,
    PlayerMode,
    PlayerTurn,
    Review,
    ThemeMode,
  } from '../lib/gameTypes';
  import {
    applyBotStep,
    generateMoveArrows,
    getPipCount,
    notation,
    pointName,
    START_BOARD,
    switchSides,
    toInternalStep,
    toPhysicalStep,
  } from '../lib/boardUtils';
  import {
    calculatePlayerDieSlots,
    classifyGameResult,
    generateRandomDice,
    gradeLoss,
  } from '../lib/analysisFormatters';
  import { soundManager } from '../lib/soundEffects';

  import HeaderBar from './HeaderBar.svelte';
  import GameBoard from './GameBoard.svelte';
  import CoachSidebar from './CoachSidebar.svelte';
  import CubeOfferModal from './CubeOfferModal.svelte';
  import GameOverModal from './GameOverModal.svelte';

  const HINTS_STORAGE_KEY = 'nard:always-show-hints';
  const THEME_STORAGE_KEY = 'nard:theme-mode';
  const SOUND_STORAGE_KEY = 'nard:sound-muted';

  let engine: WildbgEngine | null = null;
  let state: GameState = 'loading';
  let playerMode: PlayerMode = 'ai';
  let turn: PlayerTurn = 'player1';
  let board: number[] = [...START_BOARD];
  let turnStart: number[] = [...START_BOARD];
  let workingBoard: number[] = [...START_BOARD];
  let shownBoard: number[] = [...START_BOARD];
  let candidates: Candidate[] = [];
  let movePaths: MovePath<Candidate>[] = [];
  let selectedSteps: MoveStep[] = [];
  let selectedSource: number | null = null;
  let nextMoves: MoveStep[] = [];
  let physicalNextMoves: MoveStep[] = [];
  let sources: number[] = [];
  let targets: number[] = [];
  let completeMove: Candidate | null = null;
  let dice: [number, number] | null = null;
  let botDice: [number, number] | null = null;
  let phase = 'contact';
  let onePointer = false;
  let alwaysShowHints = false;
  let showRanking = false;
  let preview: Candidate | null = null;
  let review: Review | null = null;
  let cubeReview: CubeReview | null = null;
  let cubeOffer: CubeOffer | null = null;
  let cubeValue = 1;
  let cubeOwner: CubeOwner = 'center';
  let canDouble = false;
  let winner: 'You' | 'WildBG' | 'Player 1' | 'Player 2' | null = null;
  let winnerPoints = 0;
  let lastBotMove = '';
  let botMotion: BotMotion | null = null;
  let engineError = '';
  let revision = '';
  let stats = { decisions: 0, mistakes: 0, blunders: 0, loss: 0 };
  let gameStats = { decisions: 0, mistakes: 0, blunders: 0, loss: 0, cubeDecisions: 0, cubeErrors: 0 };
  let currentGameId = createStatsId();
  let gameStartedAt: string | null = null;
  let gameRecorded = false;
  let dieSlots: DieSlot[] = [{ value: null, spent: false }, { value: null, spent: false }];
  let themeMode: ThemeMode = 'system';
  let isDark = true;
  let muted = false;
  let showThinkingOverlay = false;
  let thinkingOverlayTimer: ReturnType<typeof setTimeout> | null = null;
  let hintArrows: MoveArrow[] = [];
  let liveMessage = '';

  $: isP2 = playerMode === 'pvp' && turn === 'player2';
  $: shownBoard = preview
    ? (isP2 ? switchSides(preview.position) : preview.position)
    : workingBoard;
  $: {
    const activePaths = movePaths;
    const stepsSoFar = selectedSteps;
    nextMoves = state === 'moving' && !preview
      ? activePaths
          .filter((path) => stepsSoFar.every((step, index) => sameStep(path.play[index], step)) && path.play.length > stepsSoFar.length)
          .map((path) => path.play[stepsSoFar.length])
      : [];
    physicalNextMoves = nextMoves.map((step) => toPhysicalStep(step, isP2));
    sources = unique(physicalNextMoves.map((step) => step.from));
    targets = selectedSource === null
      ? []
      : unique(physicalNextMoves.filter((step) => step.from === selectedSource).map((step) => step.to));
  }
  $: completeMove = movePaths.find((path) => samePlay(path.play, selectedSteps))?.candidate ?? null;
  $: hintArrows = state === 'moving' && showRanking && !preview
    ? generateMoveArrows(candidates[0]?.play ?? [], isP2)
    : [];
  $: canDouble = state === 'ready' && canOfferDouble(cubeOwner, isP2 ? 'bot' : 'human', cubeValue, onePointer);
  $: dieSlots = dice
    ? calculatePlayerDieSlots(dice, selectedSteps, Boolean(completeMove))
    : botDice
      ? botDice.map((value) => ({ value, spent: false }))
      : [{ value: null, spent: false }, { value: null, spent: false }];
  $: liveMessage = buildLiveMessage(state, winner, winnerPoints, playerMode, cubeOffer, cubeValue, dice, review, lastBotMove, onePointer);

  onMount(async () => {
    try {
      alwaysShowHints = localStorage.getItem(HINTS_STORAGE_KEY) === 'true';
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    try {
      const initialized = await createWildbgEngine();
      engine = initialized.engine;
      board = initialized.startingPosition;
      workingBoard = [...board];
      revision = initialized.revision.slice(0, 7);
      state = 'ready';
    } catch (error) {
      handleError(error);
    }
  });

  onDestroy(() => {
    cancelThinkingOverlay();
    engine?.destroy();
  });

  onMount(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        themeMode = savedTheme;
      }
      muted = localStorage.getItem(SOUND_STORAGE_KEY) === 'true';
      soundManager.setMuted(muted);
    } catch {
      // The defaults still work when browser storage is unavailable.
    }

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (themeMode === 'system') applyTheme();
    };
    applyTheme();
    systemTheme.addEventListener('change', syncSystemTheme);

    return () => systemTheme.removeEventListener('change', syncSystemTheme);
  });

  function unique(values: number[]): number[] {
    return values.filter((value, index) => values.indexOf(value) === index);
  }

  function cancelThinkingOverlay() {
    if (thinkingOverlayTimer !== null) clearTimeout(thinkingOverlayTimer);
    thinkingOverlayTimer = null;
    showThinkingOverlay = false;
  }

  async function handleDiceAction() {
    if (state === 'ready') {
      await roll();
      return;
    }
    if (state === 'moving' && completeMove && !preview) {
      await commit();
    }
  }

  async function roll() {
    if (!engine || state !== 'ready') return;
    const activeEngine = engine;
    ensureGameStarted();
    soundManager.playSound('roll');
    dice = generateRandomDice();
    botDice = null;
    preview = null;
    review = null;
    showRanking = alwaysShowHints;
    state = 'thinking';
    cancelThinkingOverlay();
    thinkingOverlayTimer = setTimeout(() => {
      thinkingOverlayTimer = null;
      showThinkingOverlay = true;
    }, 1000);
    await tick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const isCurrentP2 = playerMode === 'pvp' && turn === 'player2';
      const positionToAnalyze = isCurrentP2 ? switchSides(board) : board;
      if (playerMode === 'ai' && canOfferDouble(cubeOwner, 'human', cubeValue, onePointer)) {
        const cubeDecision = await activeEngine.cube_info(Int8Array.from(positionToAnalyze)) as CubeDecision;
        if (cubeDecision.should_double) trackCubeDecision('no-double', false);
      }
      const analysis = await activeEngine.analyze(Int8Array.from(positionToAnalyze), dice[0], dice[1], onePointer) as Analysis;
      candidates = analysis.moves;
      phase = analysis.phase;
      turnStart = [...board];
      movePaths = expandMovePaths(candidates, positionToAnalyze, dice);
      workingBoard = [...board];
      selectedSteps = [];
      selectedSource = null;
      state = 'moving';
    } catch (error) {
      handleError(error);
    } finally {
      cancelThinkingOverlay();
    }
  }

  function selectPoint(point: number) {
    if (state !== 'moving' || preview || completeMove) return;

    if (selectedSource === null) {
      if (!sources.includes(point)) return;
      const pointTargets = unique(physicalNextMoves.filter((step) => step.from === point).map((step) => step.to));
      if (pointTargets.length === 1) {
        moveChecker({ from: point, to: pointTargets[0] });
      } else {
        selectedSource = point;
      }
      return;
    }

    if (targets.includes(point)) {
      moveChecker({ from: selectedSource, to: point });
    } else if (sources.includes(point)) {
      selectedSource = null;
      selectPoint(point);
    } else {
      selectedSource = null;
    }
  }

  function moveChecker(step: MoveStep) {
    soundManager.playSound('move');
    const internalStep = toInternalStep(step, isP2);
    const nextSteps = [...selectedSteps, internalStep];
    selectedSteps = nextSteps;
    if (playerMode === 'pvp' && turn === 'player2') {
      workingBoard = applyBotStep(workingBoard, internalStep);
    } else {
      workingBoard = applyStep(workingBoard, step);
    }
    selectedSource = null;
  }

  function undo() {
    if (!selectedSteps.length || preview) return;
    soundManager.playSound('undo');
    selectedSteps = selectedSteps.slice(0, -1);
    if (playerMode === 'pvp' && turn === 'player2') {
      workingBoard = selectedSteps.reduce((position, step) => applyBotStep(position, step), [...turnStart]);
    } else {
      workingBoard = selectedSteps.reduce((position, step) => applyStep(position, step), [...turnStart]);
    }
    selectedSource = null;
  }

  async function commit() {
    if (!completeMove || !engine || state !== 'moving') return;
    const activeEngine = engine;
    soundManager.playSound('confirm');
    const chosen = completeMove;
    const best = candidates[0];
    const loss = Math.max(0, best.score - chosen.score);
    review = { chosen, best, loss, phase };
    showRanking = true;

    if (playerMode === 'ai') {
      board = [...chosen.position];
      workingBoard = [...board];
      stats = {
        decisions: stats.decisions + 1,
        mistakes: stats.mistakes + (loss >= (onePointer ? 0.025 : 0.08) ? 1 : 0),
        blunders: stats.blunders + (loss >= (onePointer ? 0.06 : 0.2) ? 1 : 0),
        loss: stats.loss + loss,
      };
      gameStats = {
        ...gameStats,
        decisions: gameStats.decisions + 1,
        mistakes: gameStats.mistakes + (loss >= (onePointer ? 0.025 : 0.08) ? 1 : 0),
        blunders: gameStats.blunders + (loss >= (onePointer ? 0.06 : 0.2) ? 1 : 0),
        loss: gameStats.loss + loss,
      };
      recordPlayerDecision({ gameId: currentGameId, mode: onePointer ? 'one-point' : 'money', phase, loss });

      const result = await activeEngine.result(Int8Array.from(board));
      if (result !== 'ongoing') {
        finish('You', result);
        return;
      }
      await botTurn();
    } else {
      if (turn === 'player1') {
        board = [...chosen.position];
        workingBoard = [...board];
        const result = await activeEngine.result(Int8Array.from(board));
        if (result !== 'ongoing') {
          finish('Player 1', result);
          return;
        }
        turn = 'player2';
      } else {
        board = switchSides(chosen.position);
        workingBoard = [...board];
        const result = await activeEngine.result(Int8Array.from(board));
        if (result !== 'ongoing') {
          finish('Player 2', result);
          return;
        }
        turn = 'player1';
      }
      state = 'ready';
      dice = null;
      candidates = [];
      movePaths = [];
      selectedSteps = [];
      selectedSource = null;
      preview = null;
      showRanking = alwaysShowHints;
    }
  }

  async function botTurn(considerCube = true) {
    if (!engine) {
      handleError(new Error('WildBG is not ready.'));
      return;
    }
    const activeEngine = engine;
    state = 'bot';
    dice = null;
    botDice = null;
    botMotion = null;
    await wait(320);
    try {
      const botPosition = switchSides(board);
      if (considerCube && canOfferDouble(cubeOwner, 'bot', cubeValue, onePointer)) {
        const decision = await activeEngine.cube_info(Int8Array.from(botPosition)) as CubeDecision;
        if (decision.should_double) {
          cubeOffer = { shouldTake: decision.should_take };
          lastBotMove = `Offers ${cubeValue * 2}`;
          state = 'cube-offer';
          soundManager.playSound('confirm');
          return;
        }
      }

      botDice = generateRandomDice();
      const analysis = await activeEngine.analyze(Int8Array.from(botPosition), botDice[0], botDice[1], onePointer) as Analysis;
      const choice = analysis.moves[0];
      const played: MoveStep[] = [];
      workingBoard = [...board];

      for (const step of choice.play) {
        const motion = {
          from: 25 - step.from,
          to: step.to === 0 ? 25 : 25 - step.to,
          label: `${pointName(step.from)} → ${pointName(step.to)}`,
        };
        botMotion = { ...motion, stage: 'from' };
        await wait(260);

        workingBoard = applyBotStep(workingBoard, step);
        board = [...workingBoard];
        soundManager.playSound('bot-move');
        played.push(step);
        lastBotMove = notation(played);
        botMotion = { ...motion, stage: 'to' };
        await wait(380);
      }

      if (!choice.play.length) {
        lastBotMove = 'No move';
        await wait(450);
      }

      board = switchSides(choice.position);
      workingBoard = [...board];
      botMotion = null;
      const result = await activeEngine.result(Int8Array.from(board));
      if (result !== 'ongoing') {
        finish('WildBG', result);
        return;
      }
      await wait(180);
      botDice = null;
      candidates = [];
      selectedSteps = [];
      state = 'ready';
    } catch (error) {
      handleError(error);
    }
  }

  async function offerDouble() {
    if (!canDouble || !engine) return;
    const activeEngine = engine;
    ensureGameStarted();

    if (playerMode === 'pvp') {
      cubeOffer = { offeredBy: turn };
      state = 'cube-offer';
      soundManager.playSound('confirm');
      return;
    }

    state = 'cube-thinking';
    try {
      const decision = await activeEngine.cube_info(Int8Array.from(board)) as CubeDecision;
      trackCubeDecision('double', decision.should_double);
      state = 'ready';
      if (decision.should_take) {
        const accepted = acceptDouble(cubeValue, 'human');
        cubeValue = accepted.value;
        cubeOwner = accepted.owner;
        cubeReview = {
          title: 'WildBG takes',
          detail: decision.should_double
            ? `Good double. The cube is now ${cubeValue} and belongs to WildBG.`
            : `WildBG would wait before doubling. The cube is now ${cubeValue} and belongs to WildBG.`,
          correct: decision.should_double,
        };
        lastBotMove = `Takes ${cubeValue}`;
        soundManager.playSound('confirm');
      } else {
        cubeReview = {
          title: 'WildBG drops',
          detail: decision.should_double ? 'Good double — you cashed the game.' : 'WildBG drops the offered cube.',
          correct: decision.should_double,
        };
        finish('You', 'drop');
      }
    } catch (error) {
      handleError(error);
    }
  }

  function answerPvPDouble(take: boolean) {
    if (state !== 'cube-offer' || !cubeOffer || !cubeOffer.offeredBy) return;
    const offeredBy = cubeOffer.offeredBy;
    cubeOffer = null;

    if (!take) {
      finish(offeredBy === 'player1' ? 'Player 1' : 'Player 2', 'drop');
      return;
    }

    const accepted = acceptDouble(cubeValue, offeredBy === 'player1' ? 'human' : 'bot');
    cubeValue = accepted.value;
    cubeOwner = accepted.owner;
    state = 'ready';
    soundManager.playSound('confirm');
  }

  async function answerBotDouble(take: boolean) {
    if (state !== 'cube-offer' || !cubeOffer) return;
    const shouldTake = Boolean(cubeOffer.shouldTake);
    cubeOffer = null;
    trackCubeDecision(take ? 'take' : 'drop', take === shouldTake);

    if (!take) {
      cubeReview = {
        title: shouldTake ? 'Incorrect drop' : 'Correct drop',
        detail: shouldTake ? 'WildBG says this cube should be taken.' : 'WildBG agrees that passing is best.',
        correct: !shouldTake,
      };
      finish('WildBG', 'drop');
      return;
    }

    const accepted = acceptDouble(cubeValue, 'bot');
    cubeValue = accepted.value;
    cubeOwner = accepted.owner;
    cubeReview = {
      title: shouldTake ? 'Correct take' : 'Incorrect take',
      detail: shouldTake
        ? `WildBG agrees. The cube is now ${cubeValue} and belongs to you.`
        : 'WildBG says this position should be dropped.',
      correct: shouldTake,
    };
    lastBotMove = `Doubles to ${cubeValue}`;
    soundManager.playSound('confirm');
    await botTurn(false);
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  function buildLiveMessage(
    currentState: GameState,
    currentWinner: 'You' | 'WildBG' | 'Player 1' | 'Player 2' | null,
    points: number,
    mode: PlayerMode,
    offer: CubeOffer | null,
    cube: number,
    roll: [number, number] | null,
    moveReview: Review | null,
    botLabel: string,
    singlePoint: boolean,
  ): string {
    if (currentState === 'gameover' && currentWinner) {
      return `${currentWinner} won ${points} ${points === 1 ? 'point' : 'points'}.`;
    }
    if (currentState === 'cube-offer') {
      const offerer = mode === 'pvp' ? (offer?.offeredBy === 'player1' ? 'Player 1' : 'Player 2') : 'WildBG';
      return `${offerer} offers a double to ${cube * 2}. Take or drop?`;
    }
    if (currentState === 'bot' && botLabel) {
      return `${mode === 'pvp' ? 'Player 2' : 'WildBG'}: ${botLabel}.`;
    }
    if (currentState === 'thinking' && roll) {
      return `You rolled ${roll[0]} and ${roll[1]}.`;
    }
    if (currentState === 'moving' && moveReview) {
      const lossDetail = moveReview.loss < 0.0005
        ? 'No loss.'
        : `, ${singlePoint ? `${(moveReview.loss * 100).toFixed(1)} win-percent points lost` : `${Math.round(moveReview.loss * 1000)} millipoints lost`}.`;
      return `You played ${notation(moveReview.chosen.play)}: ${gradeLoss(moveReview.loss, singlePoint)}${lossDetail}`;
    }
    return '';
  }

  function finish(player: 'You' | 'WildBG' | 'Player 1' | 'Player 2', result: string) {
    soundManager.playSound(player === 'You' || player === 'Player 1' ? 'win' : 'loss');
    winner = player;
    winnerPoints = gamePoints(result, cubeValue, onePointer);
    ensureGameStarted();
    if (playerMode === 'ai' && !gameRecorded) {
      const endedAt = new Date();
      const startedAt = new Date(gameStartedAt!);
      recordPlayerGame({
        id: currentGameId,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)),
        mode: onePointer ? 'one-point' : 'money',
        winner: player === 'You' ? 'human' : 'bot',
        pointsFor: player === 'You' ? winnerPoints : 0,
        pointsAgainst: player === 'WildBG' ? winnerPoints : 0,
        result: classifyGameResult(result),
        cubeValue,
        checkerDecisions: gameStats.decisions,
        checkerLoss: gameStats.loss,
        mistakes: gameStats.mistakes,
        blunders: gameStats.blunders,
        cubeDecisions: gameStats.cubeDecisions,
        cubeErrors: gameStats.cubeErrors,
      });
      gameRecorded = true;
    }
    state = 'gameover';
    dice = null;
    botDice = null;
    botMotion = null;
  }

  function handleError(error: unknown) {
    engineError = error instanceof Error ? error.message : String(error);
    state = 'error';
    botMotion = null;
  }

  function reset() {
    cancelThinkingOverlay();
    soundManager.playSound('reset');
    board = [...START_BOARD];
    turnStart = [...START_BOARD];
    workingBoard = [...START_BOARD];
    turn = 'player1';
    candidates = [];
    movePaths = [];
    selectedSteps = [];
    selectedSource = null;
    dice = null;
    botDice = null;
    review = null;
    cubeReview = null;
    cubeOffer = null;
    preview = null;
    showRanking = alwaysShowHints;
    winner = null;
    winnerPoints = 0;
    lastBotMove = '';
    botMotion = null;
    cubeValue = 1;
    cubeOwner = 'center';
    gameStats = { decisions: 0, mistakes: 0, blunders: 0, loss: 0, cubeDecisions: 0, cubeErrors: 0 };
    currentGameId = createStatsId();
    gameStartedAt = null;
    gameRecorded = false;
    state = engine ? 'ready' : 'loading';
  }

  function togglePlayerMode() {
    if (gameStartedAt) return;
    playerMode = playerMode === 'ai' ? 'pvp' : 'ai';
    reset();
  }

  function toggleScoreMode() {
    if (gameStartedAt) return;
    onePointer = !onePointer;
    cubeValue = 1;
    cubeOwner = 'center';
    cubeReview = null;
  }

  function toggleHint() {
    showRanking = !showRanking;
    if (showRanking) soundManager.playSound('toggle');
  }

  function ensureGameStarted() {
    gameStartedAt ??= new Date().toISOString();
  }

  function trackCubeDecision(action: CubeAction, correct: boolean) {
    ensureGameStarted();
    recordPlayerCubeDecision({
      gameId: currentGameId,
      action,
      correct,
      cubeValue: cubeValue * 2,
    });
    gameStats = {
      ...gameStats,
      cubeDecisions: gameStats.cubeDecisions + 1,
      cubeErrors: gameStats.cubeErrors + (correct ? 0 : 1),
    };
  }

  function togglePreview(candidate: Candidate) {
    preview = preview === candidate ? null : candidate;
    selectedSource = null;
  }

  function toggleHints() {
    alwaysShowHints = !alwaysShowHints;
    showRanking = alwaysShowHints;
    try {
      localStorage.setItem(HINTS_STORAGE_KEY, String(alwaysShowHints));
    } catch {
      // The preference still applies for the current session.
    }
  }

  function applyTheme() {
    isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#101513' : '#f0ece4');
  }

  function cycleTheme() {
    themeMode = themeMode === 'system' ? 'dark' : themeMode === 'dark' ? 'light' : 'system';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // The choice still applies for the current session.
    }
    applyTheme();
  }

  function toggleMuted() {
    muted = !muted;
    soundManager.setMuted(muted);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(muted));
    } catch {
      // The choice still applies for the current session.
    }
    if (!muted) soundManager.playSound('toggle');
  }
</script>

<div class="app-shell">
  <HeaderBar
    {playerMode}
    {onePointer}
    {themeMode}
    {isDark}
    {muted}
    canChangeSettings={!gameStartedAt && state !== 'moving' && state !== 'bot' && state !== 'thinking' && state !== 'cube-thinking' && state !== 'cube-offer'}
    onTogglePlayerMode={togglePlayerMode}
    onToggleScoreMode={toggleScoreMode}
    onCycleTheme={cycleTheme}
    onToggleMuted={toggleMuted}
    onReset={reset}
  />

  <main class="layout">
    <h1 class="sr-only">Nard — backgammon with WildBG analysis</h1>
    <section class="game-column">
      <div
        class="player-line opponent-line"
        class:active-turn={state !== 'gameover' && ((playerMode === 'ai' && state === 'bot') || (playerMode === 'pvp' && turn === 'player2'))}
      >
        <div class="player">
          <span class="player-disc bot-disc"></span>
          <div>
            <div class="player-heading">
              <strong>{playerMode === 'pvp' ? 'Player 2' : 'WildBG'}</strong>
              {#if playerMode === 'pvp' && turn === 'player2' && state !== 'gameover'}
                <span class="turn-pill">{state === 'ready' ? 'To roll' : 'Moving'}</span>
              {/if}
            </div>
            {#if playerMode === 'ai' && lastBotMove}<small>{lastBotMove}</small>{/if}
          </div>
        </div>
        <span class="pip"><small>PIPS</small>{getPipCount(shownBoard, 'bot')}</span>
      </div>

      <GameBoard
        {shownBoard}
        {sources}
        {targets}
        {selectedSource}
        {botMotion}
        {hintArrows}
        {cubeValue}
        {cubeOwner}
        {canDouble}
        {onePointer}
        {playerMode}
        {isP2}
        {state}
        {completeMove}
        {preview}
        {dieSlots}
        {candidates}
        {showThinkingOverlay}
        onSelectPoint={selectPoint}
        onOfferDouble={offerDouble}
        onMoveChecker={moveChecker}
        onDiceAction={handleDiceAction}
        onClosePreview={() => (preview = null)}
      />

      <div
        class="player-line you-line"
        class:active-turn={state !== 'gameover' && ((playerMode === 'ai' && state !== 'bot') || (playerMode === 'pvp' && turn === 'player1'))}
      >
        <div class="player">
          <span class="player-disc human-disc"></span>
          <div>
            <div class="player-heading">
              <strong>{playerMode === 'pvp' ? 'Player 1' : 'You'}</strong>
              {#if playerMode === 'pvp' && turn === 'player1' && state !== 'gameover'}
                <span class="turn-pill">{state === 'ready' ? 'To roll' : 'Moving'}</span>
              {/if}
            </div>
          </div>
        </div>
        <span class="pip"><small>PIPS</small>{getPipCount(shownBoard, 'human')}</span>
      </div>

      {#if state === 'moving' || state === 'gameover' || state === 'error'}
        <div class="controls guidance-hidden">
          <div class="control-buttons">
            {#if state === 'moving'}
              <button class="secondary" onclick={undo} disabled={!selectedSteps.length || Boolean(preview)}>Undo</button>
              <button
                class="secondary hint-btn"
                class:active={showRanking}
                onclick={toggleHint}
                aria-label={showRanking ? 'Hide hint' : 'Show hint'}
              >
                <span class="hint-bulb" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18h6" />
                    <path d="M10 21h4" />
                    <path d="M12 3a6 6 0 0 0-3.9 10.6c.8.7 1.4 1.5 1.6 2.4h4.6c.2-.9.8-1.7 1.6-2.4A6 6 0 0 0 12 3Z" />
                  </svg>
                </span>
                <span>{showRanking ? 'Hide hint' : 'Hint'}</span>
              </button>
            {:else if state === 'gameover'}
              <button class="primary" onclick={reset}>Play again</button>
            {:else if state === 'error'}
              <button class="primary" onclick={() => location.reload()}>Try again</button>
            {/if}
          </div>
        </div>
      {/if}
    </section>

    <CoachSidebar
      {state}
      {engineError}
      {cubeReview}
      {review}
      {candidates}
      {phase}
      {showRanking}
      {alwaysShowHints}
      {preview}
      {stats}
      {onePointer}
      {revision}
      onToggleHints={toggleHints}
      onTogglePreview={togglePreview}
      onToggleHint={toggleHint}
    />
  </main>

  {#if state === 'cube-offer'}
    <CubeOfferModal
      {cubeValue}
      {playerMode}
      {cubeOffer}
      onAnswer={(take) => (playerMode === 'pvp' ? answerPvPDouble(take) : answerBotDouble(take))}
    />
  {/if}

  {#if state === 'gameover'}
    <GameOverModal
      {winner}
      {winnerPoints}
      {playerMode}
      {cubeReview}
      onReset={reset}
    />
  {/if}

  <div class="sr-only" role="status" aria-live="polite">{liveMessage}</div>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  :global(html) { background: #0e1211; color-scheme: dark; }
  :global(body) { margin: 0; color: #eeeae1; background: #0e1211; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  :global(button) { font: inherit; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }

  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

  .app-shell { min-height: 100vh; color: var(--ink); --paper: #19201e; --paper-raised: #202825; --ink: #eeeae1; --muted: #929b96; --line: #303a36; --wood: #322720; --wood-dark: #171b19; --field: #756a52; --green: #264b40; --point-green: #235347; --point-clay: #a9584e; --cream: #eee7d7; --accent: #e5b94e; }
  .layout { width: min(1380px, 100%); margin: 0 auto; display: grid; grid-template-columns: minmax(620px, 1fr) 330px; gap: clamp(22px, 3vw, 38px); padding: clamp(16px, 2.4vw, 30px) clamp(14px, 3.2vw, 42px) 48px; }
  .game-column { min-width: 0; user-select: none; -webkit-user-select: none; }
  .player-line { min-height: 45px; display: flex; align-items: center; justify-content: space-between; padding: 3px 6px; border-radius: 6px; transition: background .18s ease; }
  .player-line.active-turn { background: rgba(229,185,78,.08); }
  .player { min-width: 0; display: flex; align-items: center; gap: 11px; }
  .player-disc { width: 25px; height: 25px; flex: 0 0 auto; border-radius: 50%; border: 1px solid rgba(0,0,0,.45); box-shadow: inset 0 0 0 2px rgba(255,255,255,.17); }
  .bot-disc { background: #163129; }.human-disc { background: var(--cream); border-color: #aca393; }
  .player div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .player-heading { display: flex; align-items: center; gap: 7px; }
  .player strong { font-size: 13px; }
  .turn-pill { border-radius: 999px; padding: 1px 6px; background: rgba(229,185,78,.18); color: var(--accent); font-family: Inter, sans-serif; font-size: 9px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .player small { max-width: 430px; color: #89938e; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pip { display: flex; align-items: baseline; gap: 7px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 700; }
  .pip small { color: #818b86; font-family: Inter, sans-serif; font-size: 9px; letter-spacing: .12em; }

  .controls { min-height: 62px; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 7px 3px; }
  .controls.guidance-hidden { min-height: 52px; justify-content: flex-end; }
  .control-buttons { display: flex; flex-shrink: 0; gap: 7px; }
  .primary, .secondary { min-height: 38px; border-radius: 6px; padding: 0 15px; font-size: 11px; font-weight: 800; cursor: pointer; }
  .primary { border: 1px solid #3f695c; background: var(--green); color: white; }.secondary { border: 1px solid var(--line); background: var(--paper); color: #d5dbd7; }
  .primary:disabled, .secondary:disabled { opacity: .38; cursor: not-allowed; }
  .hint-btn { display: inline-flex; align-items: center; gap: 5px; }
  .hint-btn.active { border-color: var(--accent); color: var(--accent); }
  .hint-bulb { display: grid; place-items: center; }
  .hint-bulb svg { width: 13px; height: 13px; display: block; }

  :global(html[data-theme='light']) { background: #f0ece4; color-scheme: light; }
  :global(html[data-theme='light'] body) { color: #27312d; background: #f0ece4; }
  :global(html[data-theme='light']) .app-shell { --paper: #fbf8f1; --paper-raised: #f3efe6; --ink: #27312d; --muted: #68736d; --line: #cfcdc2; --wood: #4c3628; --wood-dark: #30251f; --field: #a09070; --green: #356959; --point-green: #356b59; --point-clay: #ba6255; --cream: #faf3e5; --accent: #b5831f; }
  :global(html[data-theme='light']) .player small, :global(html[data-theme='light']) .pip small { color: #66726b; }
  :global(html[data-theme='light']) .player-line.active-turn { background: rgba(181,131,31,.1); }
  :global(html[data-theme='light']) .bot-disc { background: #24473d; }:global(html[data-theme='light']) .player-disc { box-shadow: inset 0 0 0 2px rgba(255,255,255,.34); }

  @media (max-width: 1030px) {
    .layout { grid-template-columns: 1fr; max-width: 890px; }
  }
  @media (max-width: 680px) {
    .layout { padding: 12px 8px 36px; }
  }
</style>
