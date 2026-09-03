<script lang="ts">
  import { onMount } from 'svelte';
  import {
    clearPlayerStats,
    decisionSeverity,
    emptyPlayerHistory,
    loadPlayerStats,
    summarizePlayerStats,
    type PlayerDecision,
    type PlayerGame,
    type PlayerHistory,
  } from '../lib/playerStats';

  type ThemeMode = 'system' | 'light' | 'dark';

  const THEME_STORAGE_KEY = 'nard:theme-mode';

  let history: PlayerHistory = emptyPlayerHistory();
  let loaded = false;
  let confirmClear = false;
  let themeMode: ThemeMode = 'system';
  let isDark = true;

  $: summary = summarizePlayerStats(history);
  $: recentDecisions = history.decisions.slice(-24);
  $: recentGames = history.games.slice(-24);
  $: maxGamePoints = Math.max(1, ...recentGames.map((game) => Math.abs(game.pointsFor - game.pointsAgainst)));
  $: weakestPhase = [...summary.phases]
    .filter((item) => item.decisions >= 3)
    .sort((a, b) => a.cleanRate - b.cleanRate)[0] ?? null;

  onMount(() => {
    history = loadPlayerStats();
    loaded = true;

    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') themeMode = savedTheme;
    } catch {
      // The system preference remains the default when storage is unavailable.
    }

    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (themeMode === 'system') applyTheme();
    };
    applyTheme();
    systemTheme.addEventListener('change', syncSystemTheme);
    return () => systemTheme.removeEventListener('change', syncSystemTheme);
  });

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
      // The choice still applies for the current visit.
    }
    applyTheme();
  }

  function clearHistory() {
    clearPlayerStats();
    history = emptyPlayerHistory();
    confirmClear = false;
  }

  function percent(value: number) {
    return `${Math.round(value * 100)}%`;
  }

  function formatLoss(decision: PlayerDecision) {
    return decision.mode === 'one-point'
      ? `${(decision.loss * 100).toFixed(1)}pp`
      : `${Math.round(decision.loss * 1000)}mp`;
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
  }

  function gradeLabel(grade: PlayerDecision['grade']) {
    return grade === 'best' ? 'Best move' : grade[0].toUpperCase() + grade.slice(1);
  }

  function phaseLabel(phase: string) {
    return phase ? phase[0].toUpperCase() + phase.slice(1) : 'Unknown';
  }

  function gameNet(game: PlayerGame) {
    return game.pointsFor - game.pointsAgainst;
  }

  function signedPoints(value: number) {
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`;
  }

  function gameResultLabel(game: PlayerGame) {
    const outcome = game.winner === 'human' ? 'Won' : 'Lost';
    if (game.result === 'drop') return `${outcome} on a drop`;
    if (game.result === 'backgammon') return `${outcome} backgammon`;
    if (game.result === 'gammon') return `${outcome} gammon`;
    return outcome;
  }

  function gameErrorRate(game: PlayerGame) {
    if (!game.checkerDecisions) return '—';
    const average = game.checkerLoss / game.checkerDecisions;
    return game.mode === 'one-point' ? `${(average * 100).toFixed(1)}pp` : `${Math.round(average * 1000)}mp`;
  }

  function formatDuration(seconds: number | null) {
    if (seconds === null) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
</script>

<div class="stats-shell">
  <header class="app-header">
    <a href="/" class="brand"><span class="brand-piece"></span><strong>NARD</strong></a>
    <div class="header-actions">
      <nav aria-label="Primary navigation">
        <a href="/">Board</a>
        <a href="/stats" class="active" aria-current="page">Stats</a>
      </nav>
      <button class="theme-button" onclick={cycleTheme} aria-label={`Appearance: ${themeMode === 'system' ? `Auto, currently ${isDark ? 'dark' : 'light'}` : isDark ? 'dark' : 'light'}. Activate to change.`} title="Cycle appearance: Auto, Dark, Light">
        <span class="theme-icon" class:dark={isDark} aria-hidden="true">{isDark ? '◐' : '☀'}</span>
        <span>{themeMode === 'system' ? 'Auto' : isDark ? 'Dark' : 'Light'}</span>
      </button>
    </div>
  </header>

  <main>
    <section class="page-heading">
      <div>
        <span class="eyebrow">PLAYER STATISTICS</span>
        <h1>Your record,<br />over time.</h1>
      </div>
      <p>A private ledger for every game against WildBG: results, points, checker play, cube choices, streaks, and recent form—all stored in this browser.</p>
    </section>

    {#if !loaded}
      <section class="loading-card" aria-label="Loading statistics"><i></i><span>Reading your games</span></section>
    {:else if !summary.decisions && !summary.games}
      <section class="empty-state">
        <div class="empty-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="eyebrow">NO GAMES YET</span>
        <h2>Your first game becomes the baseline.</h2>
        <p>Play on the board and Nard will build a private history of results, points, cube choices, accuracy, mistakes, and improvement.</p>
        <a class="primary-link" href="/">Play against WildBG <span>→</span></a>
      </section>
    {:else}
      <section class="overview-grid" aria-label="Decision quality overview">
        <article class="accuracy-card">
          <div class="accuracy-copy">
            <span class="eyebrow">CLEAN DECISION RATE</span>
            <h2>{percent(summary.cleanRate)}</h2>
            <p>{summary.cleanDecisions} of {summary.decisions} plays were rated good or best by WildBG.</p>
          </div>
          <div class="accuracy-ring" style={`--rate:${summary.cleanRate * 360}deg`} aria-label={`${percent(summary.cleanRate)} clean decisions`}>
            <div><strong>{percent(summary.cleanRate)}</strong><span>clean</span></div>
          </div>
        </article>

        <article class="metric-card">
          <span>Games</span>
          <strong>{summary.games}</strong>
          <small>{summary.wins}–{summary.losses} record</small>
        </article>
        <article class="metric-card">
          <span>Win rate</span>
          <strong>{summary.games ? percent(summary.winRate) : '—'}</strong>
          <small>{summary.recentWinRate === null ? 'Needs 5 completed games' : `${percent(summary.recentWinRate)} over the last ${Math.min(20, summary.games)}`}</small>
        </article>
        <article class="metric-card">
          <span>Net points</span>
          <strong class:positive-number={summary.netPoints > 0} class:negative-number={summary.netPoints < 0}>{signedPoints(summary.netPoints)}</strong>
          <small>{summary.pointsFor} for · {summary.pointsAgainst} against</small>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel game-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">RESULTS</span><h2>Points by game</h2></div>
            <span class:positive={summary.netPoints > 0} class:negative={summary.netPoints < 0} class="trend-pill">Net {signedPoints(summary.netPoints)}</span>
          </div>
          {#if recentGames.length}
            <div class="game-chart" role="img" aria-label="Points won or lost in each of your last 24 games, from oldest to newest">
              <span class="zero-line"></span>
              {#each recentGames as game}
                <span class="game-column" title={`${gameResultLabel(game)}, ${signedPoints(gameNet(game))} points`}>
                  <i
                    class:win={gameNet(game) > 0}
                    class:loss={gameNet(game) < 0}
                    style={`height:${Math.max(7, Math.abs(gameNet(game)) / maxGamePoints * 46)}%`}
                  ></i>
                </span>
              {/each}
            </div>
            <div class="chart-scale"><span>Older</span><span>Wins above · losses below</span><span>Latest</span></div>
          {:else}
            <div class="panel-empty"><strong>Finish a game to start the chart.</strong><span>Existing move history is preserved below.</span></div>
          {/if}
          <div class="record-strip">
            <div><span>Current streak</span><strong>{summary.currentGameStreak ? `${summary.currentGameStreak.winner === 'human' ? 'W' : 'L'}${summary.currentGameStreak.count}` : '—'}</strong></div>
            <div><span>Best win streak</span><strong>{summary.longestWinStreak || '—'}</strong></div>
            <div><span>Average game</span><strong>{formatDuration(summary.averageGameSeconds)}</strong></div>
          </div>
        </article>

        <article class="panel cube-panel">
          <div class="panel-heading"><div><span class="eyebrow">CUBE PLAY</span><h2>Decision record</h2></div></div>
          {#if summary.cubeDecisions}
            <div class="cube-score"><strong>{percent(summary.cubeAccuracy)}</strong><span>correct · {summary.correctCubeDecisions}/{summary.cubeDecisions}</span></div>
            <div class="cube-breakdown">
              <div><span>Doubles made</span><strong>{summary.doubles}</strong></div>
              <div><span>Missed doubles</span><strong class:error={summary.missedDoubles > 0}>{summary.missedDoubles}</strong></div>
              <div><span>Wrong doubles</span><strong class:error={summary.wrongDoubles > 0}>{summary.wrongDoubles}</strong></div>
              <div><span>Wrong takes / drops</span><strong class:error={summary.wrongTakes + summary.wrongDrops > 0}>{summary.wrongTakes + summary.wrongDrops}</strong></div>
            </div>
          {:else}
            <div class="panel-empty"><strong>No cube choices yet.</strong><span>Money games track doubles, missed doubles, takes, and drops.</span></div>
          {/if}
          <p class="panel-note">Only actual choices and missed doubles count; routine no-double positions are excluded.</p>
        </article>

        <article class="panel trend-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">RECENT FORM</span><h2>Decision cost</h2></div>
            {#if summary.trend !== null}
              <span class:positive={summary.trend > 0} class:negative={summary.trend < 0} class="trend-pill">
                {summary.trend > 0 ? '↑' : summary.trend < 0 ? '↓' : '→'} {Math.abs(Math.round(summary.trend * 100))}pp clean rate
              </span>
            {:else}
              <span class="trend-pill neutral">Baseline forming</span>
            {/if}
          </div>

          <div class="decision-chart" role="img" aria-label="Loss severity for your last 24 decisions, from oldest to newest">
            {#each recentDecisions as decision}
              <span
                class={`decision-bar ${decision.grade}`}
                style={`height:${Math.max(8, decisionSeverity(decision) * 100)}%`}
                title={`${gradeLabel(decision.grade)}, ${formatLoss(decision)}`}
              ></span>
            {/each}
          </div>
          <div class="chart-scale"><span>Older</span><span>Lower bars are better</span><span>Latest</span></div>

          <div class="loss-legend">
            <span><i class="best"></i>Best</span>
            <span><i class="good"></i>Good</span>
            <span><i class="mistake"></i>Mistake</span>
            <span><i class="blunder"></i>Blunder</span>
          </div>
        </article>

        <article class="panel averages-panel">
          <div class="panel-heading"><div><span class="eyebrow">AVERAGE COST</span><h2>By game mode</h2></div></div>
          <div class="average-row">
            <div><span>Money play</span><small>{summary.moneyDecisions} decisions</small></div>
            <strong>{summary.averageMoneyLoss === null ? '—' : `${Math.round(summary.averageMoneyLoss * 1000)}mp`}</strong>
          </div>
          <div class="average-row">
            <div><span>One-point</span><small>{summary.onePointDecisions} decisions</small></div>
            <strong>{summary.averageOnePointLoss === null ? '—' : `${(summary.averageOnePointLoss * 100).toFixed(1)}pp`}</strong>
          </div>
          <p class="panel-note">The units stay separate because money equity and one-point win probability measure different things.</p>
          <div class="checker-strip"><span>Clean streak <strong>{summary.cleanStreak}</strong></span><span>Blunder rate <strong>{percent(summary.blunderRate)}</strong></span></div>
        </article>

        <article class="panel phases-panel">
          <div class="panel-heading"><div><span class="eyebrow">POSITION TYPE</span><h2>Where errors happen</h2></div></div>
          <div class="phase-table">
            <div class="phase-head"><span>Phase</span><span>Decisions</span><span>Clean</span><span>Blunders</span></div>
            {#each summary.phases as item}
              <div class="phase-row">
                <strong>{phaseLabel(item.phase)}</strong>
                <span>{item.decisions}</span>
                <span>{percent(item.cleanRate)}</span>
                <span>{percent(item.blunderRate)}</span>
              </div>
            {/each}
          </div>
          {#if weakestPhase}
            <p class="focus-note"><i></i><span><strong>Training focus:</strong> {phaseLabel(weakestPhase.phase)} positions have your lowest clean rate so far.</span></p>
          {:else}
            <p class="panel-note">A focus area appears after at least three decisions in a position type.</p>
          {/if}
        </article>

        {#if history.games.length}
        <article class="panel recent-panel game-history-panel">
          <div class="panel-heading"><div><span class="eyebrow">GAME LOG</span><h2>Recent results</h2></div><a href="/">Keep playing →</a></div>
          <div class="game-list">
            <div class="game-list-head"><span>Result</span><span>Points</span><span>Checker avg.</span><span>Duration</span><span>Date</span></div>
            {#each history.games.slice(-8).reverse() as game}
              <div class="game-row">
                <div><i class:win={game.winner === 'human'} class:loss={game.winner === 'bot'}></i><span><strong>{gameResultLabel(game)}</strong><small>{game.mode === 'money' ? `Money · cube ${game.cubeValue}` : '1-point'}</small></span></div>
                <b class:win={gameNet(game) > 0} class:loss={gameNet(game) < 0}>{signedPoints(gameNet(game))}</b>
                <span>{gameErrorRate(game)}</span>
                <span>{formatDuration(game.durationSeconds)}</span>
                <time datetime={game.endedAt}>{formatDate(game.endedAt)}</time>
              </div>
            {/each}
          </div>
        </article>
        {/if}

        {#if history.decisions.length}
        <article class="panel recent-panel recent-moves-panel">
          <div class="panel-heading"><div><span class="eyebrow">LATEST DECISIONS</span><h2>Recent moves</h2></div><a href="/">Keep playing →</a></div>
          <div class="recent-list">
            {#each history.decisions.slice(-6).reverse() as decision}
              <div class="recent-row">
                <i class={decision.grade}></i>
                <div><strong>{gradeLabel(decision.grade)}</strong><small>{phaseLabel(decision.phase)} · {decision.mode === 'money' ? 'Money' : '1-point'}</small></div>
                <span>{formatLoss(decision)}</span>
                <time datetime={decision.playedAt}>{formatDate(decision.playedAt)}</time>
              </div>
            {/each}
          </div>
        </article>
        {/if}
      </section>

      <section class="privacy-row">
        <div><strong>Private by default</strong><span>Your game history stays in this browser and is not sent to a server. Dice-luck analysis is not recorded yet.</span></div>
        {#if confirmClear}
          <div class="clear-confirm"><span>Clear all history?</span><button onclick={() => (confirmClear = false)}>Cancel</button><button class="danger" onclick={clearHistory}>Clear</button></div>
        {:else}
          <button class="clear-button" onclick={() => (confirmClear = true)}>Clear history</button>
        {/if}
      </section>
    {/if}
  </main>
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

  .stats-shell { min-height: 100vh; color: var(--ink); background: var(--canvas); --canvas: #0e1211; --paper: #19201e; --paper-raised: #202825; --ink: #eeeae1; --muted: #929b96; --line: #303a36; --green: #264b40; --green-bright: #4c987e; --clay: #b95b50; --accent: #e5b94e; }
  .app-header { height: 58px; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(18px, 3.5vw, 52px); border-bottom: 1px solid #28312e; background: rgba(15,20,18,.96); }
  .brand { display: flex; align-items: center; gap: 9px; color: var(--ink); text-decoration: none; }
  .brand strong { font: 600 18px Georgia, serif; letter-spacing: .12em; }
  .brand-piece { width: 18px; height: 18px; display: block; border: 5px solid var(--green); border-radius: 50%; box-shadow: inset 0 0 0 1px #eee7d7; }
  .header-actions { display: flex; align-items: center; gap: 25px; }
  nav { display: flex; gap: 5px; }
  nav a { border-radius: 5px; padding: 7px 10px; color: var(--muted); font-size: 11px; font-weight: 800; text-decoration: none; }
  nav a:hover, nav a.active { color: var(--ink); background: var(--paper-raised); }
  .theme-button { display: flex; align-items: center; gap: 6px; border: 0; padding: 4px 0; color: #c0c7c2; background: transparent; font-size: 10px; font-weight: 800; letter-spacing: .06em; cursor: pointer; }
  .theme-icon { width: 18px; height: 18px; display: grid; place-items: center; border: 1px solid #46504b; border-radius: 50%; color: #efd47b; background: #252c29; font-size: 13px; line-height: 1; }.theme-icon.dark { color: #c7d9d1; }
  a:focus-visible, button:focus-visible { outline: 2px solid #f3cc69; outline-offset: 3px; }

  main { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: clamp(48px, 8vw, 92px) 0 54px; }
  .page-heading { display: grid; grid-template-columns: 1.15fr .85fr; align-items: end; gap: 64px; margin-bottom: 56px; }
  .eyebrow { display: block; color: #86a498; font-size: 10px; font-weight: 900; letter-spacing: .18em; }
  h1 { margin: 16px 0 0; font: 500 clamp(46px, 7.2vw, 78px)/.98 Georgia, serif; letter-spacing: -.035em; }
  .page-heading p { max-width: 29rem; margin: 0 0 8px; color: var(--muted); font-size: 14px; line-height: 1.7; }

  .loading-card { min-height: 300px; display: grid; place-items: center; align-content: center; gap: 15px; border: 1px solid var(--line); border-radius: 11px; color: var(--muted); background: var(--paper); font-size: 11px; }
  .loading-card i { width: 28px; height: 28px; border: 3px solid #ffffff20; border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .empty-state { min-height: 390px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid var(--line); border-radius: 11px; padding: 48px 24px; background: radial-gradient(circle at 50% 20%, #263a33, var(--paper) 54%); text-align: center; }
  .empty-mark { height: 72px; display: flex; align-items: flex-end; gap: 7px; margin-bottom: 27px; }
  .empty-mark span { width: 14px; border-radius: 3px 3px 0 0; background: #3e5d52; }.empty-mark span:nth-child(1) { height: 28px; }.empty-mark span:nth-child(2) { height: 52px; background: var(--accent); }.empty-mark span:nth-child(3) { height: 39px; }
  .empty-state h2 { margin: 13px 0 10px; font: 500 clamp(27px, 4vw, 40px) Georgia, serif; }
  .empty-state p { max-width: 34rem; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
  .primary-link { display: flex; align-items: center; gap: 26px; margin-top: 27px; border-radius: 6px; padding: 13px 16px; color: white; background: var(--green); font-size: 11px; font-weight: 850; text-decoration: none; }
  .primary-link span { color: #bdd6cc; font-size: 17px; }

  .overview-grid { display: grid; grid-template-columns: 2.25fr repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
  .overview-grid article, .panel { border: 1px solid var(--line); border-radius: 9px; background: var(--paper); }
  .accuracy-card { min-height: 205px; display: flex; align-items: center; justify-content: space-between; gap: 25px; padding: 29px 30px; }
  .accuracy-copy h2 { margin: 9px 0 2px; font: 500 52px Georgia, serif; letter-spacing: -.04em; }
  .accuracy-copy p { max-width: 17rem; margin: 0; color: var(--muted); font-size: 11px; line-height: 1.55; }
  .accuracy-ring { width: 124px; aspect-ratio: 1; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: conic-gradient(var(--green-bright) var(--rate), #2b3733 0); transform: rotate(-90deg); }
  .accuracy-ring::before { content: ''; width: 94px; aspect-ratio: 1; border-radius: 50%; background: var(--paper); }
  .accuracy-ring div { position: absolute; display: flex; flex-direction: column; align-items: center; transform: rotate(90deg); }
  .accuracy-ring strong { font: 500 25px Georgia, serif; }.accuracy-ring span { color: var(--muted); font-size: 8px; font-weight: 800; text-transform: uppercase; }
  .metric-card { min-width: 0; display: flex; flex-direction: column; justify-content: center; padding: 25px 20px; }
  .metric-card > span { color: var(--muted); font-size: 9px; font-weight: 850; text-transform: uppercase; letter-spacing: .09em; }
  .metric-card > strong { margin: 12px 0 3px; font: 500 38px Georgia, serif; }
  .metric-card small { color: var(--muted); font-size: 10px; }
  .metric-card > strong.positive-number { color: #7fc0a8; }.metric-card > strong.negative-number { color: #d9857a; }

  .dashboard-grid { display: grid; grid-template-columns: 1.65fr 1fr; gap: 12px; }
  .panel { padding: 25px; }
  .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
  .panel-heading h2 { margin: 6px 0 0; font: 500 24px Georgia, serif; }
  .panel-heading > a { color: #a9bbb4; font-size: 9px; font-weight: 800; text-decoration: none; }
  .trend-pill { border: 1px solid #46675c; border-radius: 999px; padding: 6px 9px; color: #95c8b5; background: #24372f; font-size: 8px; font-weight: 850; }
  .trend-pill.negative { border-color: #6f4742; color: #dea39a; background: #392522; }.trend-pill.neutral { border-color: var(--line); color: var(--muted); background: transparent; }
  .game-chart { position: relative; height: 175px; display: flex; gap: clamp(3px, .65vw, 8px); padding: 0 4px; }
  .zero-line { position: absolute; inset: 50% 0 auto; height: 1px; background: #45514c; }
  .game-column { position: relative; min-width: 4px; max-width: 19px; height: 100%; flex: 1 1 0; }
  .game-column i { position: absolute; inset-inline: 0; border-radius: 3px; }.game-column i.win { bottom: 50%; background: #58a98c; }.game-column i.loss { top: 50%; background: #bd6258; }
  .record-strip { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 20px; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; }
  .record-strip div { display: flex; flex-direction: column; gap: 5px; padding: 12px; border-right: 1px solid var(--line); }.record-strip div:last-child { border: 0; }.record-strip span { color: var(--muted); font-size: 8px; font-weight: 850; letter-spacing: .07em; text-transform: uppercase; }.record-strip strong { font: 500 18px Georgia, serif; }
  .panel-empty { min-height: 154px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px dashed var(--line); border-radius: 6px; color: var(--muted); text-align: center; }.panel-empty strong { color: var(--ink); font: 500 17px Georgia, serif; }.panel-empty span { max-width: 18rem; font-size: 9px; line-height: 1.5; }
  .cube-score { display: flex; align-items: baseline; gap: 9px; padding-bottom: 17px; border-bottom: 1px solid var(--line); }.cube-score strong { font: 500 39px Georgia, serif; }.cube-score span { color: var(--muted); font-size: 8px; }
  .cube-breakdown div { display: flex; align-items: center; justify-content: space-between; min-height: 38px; border-bottom: 1px solid var(--line); }.cube-breakdown span { color: var(--muted); font-size: 9px; }.cube-breakdown strong { font: 500 16px Georgia, serif; }.cube-breakdown strong.error { color: #d9857a; }
  .decision-chart { height: 175px; display: flex; align-items: flex-end; gap: clamp(3px, .6vw, 7px); border-bottom: 1px solid #3a4641; padding: 17px 3px 0; background-image: linear-gradient(to bottom, transparent 24%, #ffffff0b 25%, transparent 26%, transparent 49%, #ffffff0b 50%, transparent 51%, transparent 74%, #ffffff0b 75%, transparent 76%); }
  .decision-bar { min-width: 4px; flex: 1 1 0; max-width: 17px; border-radius: 3px 3px 0 0; background: #58a98c; transition: filter .18s ease; }.decision-bar:hover { filter: brightness(1.3); }.decision-bar.good { background: #83a798; }.decision-bar.mistake { background: #d19a58; }.decision-bar.blunder { background: #bd6258; }
  .chart-scale { display: flex; justify-content: space-between; margin-top: 8px; color: #707c76; font-size: 8px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
  .loss-legend { display: flex; flex-wrap: wrap; gap: 17px; margin-top: 19px; color: var(--muted); font-size: 9px; font-weight: 800; }
  .loss-legend span { display: flex; align-items: center; gap: 5px; }.loss-legend i { width: 7px; height: 7px; border-radius: 2px; background: #58a98c; }.loss-legend i.good { background: #83a798; }.loss-legend i.mistake { background: #d19a58; }.loss-legend i.blunder { background: #bd6258; }
  .average-row { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; border-top: 1px solid var(--line); }
  .average-row div { display: flex; flex-direction: column; gap: 4px; }.average-row span { font-size: 11px; font-weight: 800; }.average-row small { color: var(--muted); font-size: 9px; }.average-row strong { font: 500 23px Georgia, serif; }
  .checker-strip { display: flex; justify-content: space-between; gap: 10px; margin-top: 18px; border-top: 1px solid var(--line); padding-top: 14px; color: var(--muted); font-size: 8px; }.checker-strip strong { margin-left: 4px; color: var(--ink); font: 500 14px Georgia, serif; }
  .panel-note { margin: 17px 0 0; color: var(--muted); font-size: 10px; line-height: 1.55; }
  .phases-panel { grid-column: 1 / -1; }
  .phase-table { overflow: hidden; border: 1px solid var(--line); border-radius: 6px; }
  .phase-head, .phase-row { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); gap: 10px; align-items: center; }
  .phase-head { padding: 9px 14px; color: #77837d; background: var(--paper-raised); font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
  .phase-row { min-height: 47px; padding: 9px 14px; border-top: 1px solid var(--line); font-size: 10px; }.phase-row strong { font-size: 11px; }.phase-row span { color: #bdc6c1; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .focus-note { display: flex; align-items: center; gap: 10px; margin: 17px 0 0; color: var(--muted); font-size: 9px; }.focus-note i { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px #e5b94e1a; }.focus-note strong { color: var(--ink); }
  .recent-panel { grid-column: 1 / -1; }
  .game-list { border-top: 1px solid var(--line); }
  .game-list-head, .game-row { display: grid; grid-template-columns: minmax(190px, 1.4fr) .55fr .8fr .65fr .65fr; gap: 13px; align-items: center; }
  .game-list-head { min-height: 31px; color: #77837d; font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.game-list-head span:not(:first-child) { text-align: right; }
  .game-row { min-height: 59px; border-top: 1px solid var(--line); }.game-row > div { display: flex; align-items: center; gap: 10px; }.game-row > div > i { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; }.game-row > div > i.win { background: #58a98c; }.game-row > div > i.loss { background: #bd6258; }.game-row > div > span { display: flex; flex-direction: column; gap: 4px; }.game-row strong { font-size: 10px; }.game-row small { color: var(--muted); font-size: 9px; }.game-row > b, .game-row > span, .game-row time { color: #b7c0bb; font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; }.game-row > b.win { color: #76b9a0; }.game-row > b.loss { color: #d9857a; }.game-row time { color: var(--muted); }
  .recent-list { border-top: 1px solid var(--line); }
  .recent-row { display: grid; grid-template-columns: 10px minmax(150px, 1fr) 90px 70px; gap: 13px; align-items: center; min-height: 57px; border-bottom: 1px solid var(--line); }
  .recent-row > i { width: 7px; height: 7px; border-radius: 50%; background: #58a98c; }.recent-row > i.good { background: #83a798; }.recent-row > i.mistake { background: #d19a58; }.recent-row > i.blunder { background: #bd6258; }
  .recent-row div { display: flex; flex-direction: column; gap: 4px; }.recent-row strong { font-size: 10px; }.recent-row small { color: var(--muted); font-size: 8px; }.recent-row > span, .recent-row time { color: #b7c0bb; font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; }.recent-row time { color: var(--muted); }
  .privacy-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; padding: 0 4px; }
  .privacy-row > div:first-child { display: flex; flex-direction: column; gap: 4px; }.privacy-row strong { font-size: 9px; }.privacy-row span { color: var(--muted); font-size: 8px; }
  .clear-button, .clear-confirm button { border: 0; padding: 7px; color: var(--muted); background: transparent; font-size: 9px; font-weight: 800; cursor: pointer; }
  .clear-confirm { display: flex; align-items: center; gap: 8px; }.clear-confirm .danger { border-radius: 4px; color: #f4d6d2; background: #763e38; }

  :global(html[data-theme='light']) { background: #f0ece4; color-scheme: light; }
  :global(html[data-theme='light'] body) { color: #27312d; background: #f0ece4; }
  :global(html[data-theme='light']) .stats-shell { --canvas: #f0ece4; --paper: #fbf8f1; --paper-raised: #f3efe6; --ink: #27312d; --muted: #68736d; --line: #cfcdc2; --green: #356959; --green-bright: #4b8b72; }
  :global(html[data-theme='light']) .app-header { border-color: #d7d3c8; background: rgba(251,248,241,.96); }
  :global(html[data-theme='light']) .theme-button { color: #3f4a44; }:global(html[data-theme='light']) .theme-icon { border-color: #b4bbb3; color: #9a6b17; background: #f4f1e9; }
  :global(html[data-theme='light']) .accuracy-ring { background: conic-gradient(var(--green-bright) var(--rate), #deded5 0); }
  :global(html[data-theme='light']) .decision-chart { border-color: #c8cac1; background-image: linear-gradient(to bottom, transparent 24%, #27312d0b 25%, transparent 26%, transparent 49%, #27312d0b 50%, transparent 51%, transparent 74%, #27312d0b 75%, transparent 76%); }
  :global(html[data-theme='light']) .trend-pill { border-color: #b9cec3; color: #356b58; background: #e4efe8; }:global(html[data-theme='light']) .trend-pill.negative { border-color: #dec2bd; color: #994e45; background: #f4e6e2; }:global(html[data-theme='light']) .trend-pill.neutral { border-color: var(--line); color: var(--muted); background: transparent; }
  :global(html[data-theme='light']) .zero-line { background: #c5c9c1; }:global(html[data-theme='light']) .metric-card > strong.positive-number, :global(html[data-theme='light']) .game-row > b.win { color: #3e7a63; }:global(html[data-theme='light']) .metric-card > strong.negative-number, :global(html[data-theme='light']) .game-row > b.loss, :global(html[data-theme='light']) .cube-breakdown strong.error { color: #a64f45; }
  :global(html[data-theme='light']) .empty-state { background: radial-gradient(circle at 50% 20%, #e0ece5, var(--paper) 54%); }
  :global(html[data-theme='light']) .phase-row span, :global(html[data-theme='light']) .recent-row > span { color: #4f5e56; }

  @media (max-width: 930px) {
    .overview-grid { grid-template-columns: repeat(3, 1fr); }.accuracy-card { grid-column: 1 / -1; }.dashboard-grid { grid-template-columns: 1fr; }.phases-panel, .recent-panel { grid-column: auto; }
  }
  @media (max-width: 680px) {
    main { width: min(100% - 24px, 1180px); padding-top: 42px; }.app-header { padding-inline: 14px; }.header-actions { gap: 12px; }.theme-button > span:last-child { display: none; }.page-heading { grid-template-columns: 1fr; gap: 25px; margin-bottom: 36px; }.page-heading p { font-size: 12px; }.overview-grid { grid-template-columns: 1fr 1fr; }.accuracy-card { grid-column: 1 / -1; }.metric-card:last-child { grid-column: 1 / -1; }.panel { padding: 20px 16px; }.panel-heading { align-items: flex-start; }.decision-chart, .game-chart { height: 150px; }.recent-row { grid-template-columns: 10px minmax(120px, 1fr) 70px; }.recent-row time { display: none; }.game-list-head, .game-row { grid-template-columns: minmax(145px, 1.3fr) .5fr .8fr; }.game-list-head span:nth-child(4), .game-list-head span:nth-child(5), .game-row > span:nth-child(4), .game-row time { display: none; }.privacy-row { align-items: flex-start; flex-direction: column; }.clear-confirm { flex-wrap: wrap; }.phase-head, .phase-row { grid-template-columns: 1.3fr repeat(3, .85fr); }
  }
  @media (max-width: 430px) {
    nav a { padding-inline: 7px; }.accuracy-card { align-items: flex-start; }.accuracy-ring { width: 98px; }.accuracy-ring::before { width: 74px; }.accuracy-ring strong { font-size: 20px; }.accuracy-copy h2 { font-size: 42px; }.metric-card { padding: 20px 16px; }.metric-card > strong { font-size: 32px; }.record-strip div { padding-inline: 8px; }.record-strip strong { font-size: 16px; }.phase-head, .phase-row { grid-template-columns: 1.4fr .7fr .8fr; }.phase-head span:last-child, .phase-row span:last-child { display: none; }.chart-scale span:nth-child(2) { display: none; }.game-list-head, .game-row { grid-template-columns: minmax(130px, 1.4fr) .5fr .75fr; gap: 8px; }
  }
</style>
