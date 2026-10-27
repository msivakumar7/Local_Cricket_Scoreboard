// ============================================================
// LocalCricket — Cricket Scoring Engine
// Pure functions, no React, no side effects
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchState, MatchConfig, InningsState, DeliveryEvent,
  ScoringAction, DismissalInfo, ExtrasBreakdown, BatterStats,
  BowlerStats, FallOfWicket, Partnership, MatchStateSnapshot,
  MatchResult,
} from './types';
import {
  isBowlerCredited, shouldRotateStrike, getDismissalText,
  calculateSR, calculateEconomy, legalBallsToOverString,
} from './rules';

// ============================================================
// Initialisation
// ============================================================

export function createInitialMatchState(
  config: MatchConfig,
  openingStrikerId: string,
  openingNonStrikerId: string,
  openingBowlerId: string,
): MatchState {
  const battingTeamId =
    config.tossDecision === 'bat' ? config.tossWinnerId
      : config.tossWinnerId === config.teamA.id ? config.teamB.id
      : config.teamA.id;

  const bowlingTeamId =
    battingTeamId === config.teamA.id ? config.teamB.id : config.teamA.id;

  const inningsId = uuidv4();
  const innings1 = createInnings(config.id, inningsId, 1, battingTeamId, bowlingTeamId,
    openingStrikerId, openingNonStrikerId, openingBowlerId);

  return {
    config,
    innings: [innings1],
    currentInningsIndex: 0,
    status: 'live',
    history: [],
  };
}

function createInnings(
  matchId: string,
  id: string,
  number: 1 | 2,
  battingTeamId: string,
  bowlingTeamId: string,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
  target?: number,
): InningsState {
  const innings: InningsState = {
    id,
    matchId,
    inningsNumber: number,
    battingTeamId,
    bowlingTeamId,
    totalRuns: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalties: 0, total: 0 },
    batterStats: {},
    bowlerStats: {},
    fallOfWickets: [],
    partnerships: [],
    deliveries: [],
    currentStrikerId: strikerId,
    currentNonStrikerId: nonStrikerId,
    currentBowlerId: bowlerId,
    retiredHurtIds: [],
    battingOrder: [strikerId, nonStrikerId],
    status: 'active',
    target,
  };
  innings.batterStats[strikerId] = makeBatterStats(strikerId, '', 1, innings.id);
  innings.batterStats[nonStrikerId] = makeBatterStats(nonStrikerId, '', 2, innings.id);
  innings.bowlerStats[bowlerId] = makeBowlerStats(bowlerId, '', innings.id);
  // Opening partnership
  innings.partnerships.push({
    batterAId: strikerId, batterBId: nonStrikerId,
    runs: 0, balls: 0, isActive: true, wicketNumber: 0,
  });
  return innings;
}

function makeBatterStats(id: string, name: string, pos: number, inningsId: string): BatterStats {
  return { playerId: id, playerName: name, runs: 0, balls: 0, fours: 0, sixes: 0,
    strikeRate: 0, isOut: false, isRetiredHurt: false, battingPosition: pos,
    inningsId, didBat: false };
}

function makeBowlerStats(id: string, name: string, inningsId: string): BowlerStats {
  return { playerId: id, playerName: name, legalBalls: 0, maidens: 0, runs: 0,
    wickets: 0, economy: 0, noBalls: 0, wides: 0, inningsId };
}

// ============================================================
// Main dispatcher
// ============================================================

export function applyAction(state: MatchState, action: ScoringAction): MatchState {
  if (action.type === '_LOAD_STATE') return action.payload;
  if (action.type === 'UNDO') return undoAction(state);

  // Snapshot before each action (for undo)
  const snapshot: MatchStateSnapshot = {
    innings: deepClone(state.innings),
    currentInningsIndex: state.currentInningsIndex,
    status: state.status,
    result: state.result,
    snapshotAt: new Date().toISOString(),
  };

  const stateWithSnapshot: MatchState = {
    ...state,
    history: [...state.history, snapshot],
  };

  switch (action.type) {
    case 'NORMAL_DELIVERY':
      return applyNormalDelivery(stateWithSnapshot, action.runs,
        action.isBoundary ?? false, action.boundaryType);
    case 'WIDE':
      return applyWide(stateWithSnapshot, action.additionalRuns ?? 0, action.dismissal);
    case 'NO_BALL':
      return applyNoBall(stateWithSnapshot, action.batterRuns ?? 0,
        action.extraType, action.extraRuns ?? 0, action.dismissal);
    case 'BYE':
      return applyBye(stateWithSnapshot, action.runs);
    case 'LEG_BYE':
      return applyLegBye(stateWithSnapshot, action.runs);
    case 'WICKET':
      return applyWicket(stateWithSnapshot, action.dismissal, action.runs ?? 0);
    case 'CHANGE_BOWLER':
      return applyChangeBowler(stateWithSnapshot, action.bowlerId);
    case 'SWAP_BATTERS':
      return applySwapBatters(stateWithSnapshot);
    case 'RETIRED_HURT':
      return applyRetiredHurt(stateWithSnapshot, action.batterId, action.replacementId);
    case 'END_INNINGS':
      return applyEndInnings(stateWithSnapshot, 'manual');
    case 'START_NEXT_INNINGS':
      return applyStartNextInnings(stateWithSnapshot,
        action.strikerId, action.nonStrikerId, action.bowlerId);
    default:
      return stateWithSnapshot;
  }
}

// ============================================================
// Action implementations
// ============================================================

function applyNormalDelivery(
  state: MatchState, runs: number, isBoundary: boolean, boundaryType?: 4 | 6,
): MatchState {
  const innings = currentInnings(state);
  const config = state.config;
  let i = deepClone(innings);

  const legalBallSeq = i.legalBalls;
  const overNumber = Math.floor(i.legalBalls / 6);
  const ballInOver = i.legalBalls % 6;

  // Delivery event
  const event: DeliveryEvent = {
    id: uuidv4(), inningsId: i.id, overNumber, ballInOver,
    legalBallSequence: legalBallSeq,
    deliveryType: 'normal', batterRuns: runs, extras: 0, totalRuns: runs,
    isLegal: true, isBoundary, boundaryType,
    strikerId: i.currentStrikerId, nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId, timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  // Update totals
  i.totalRuns += runs;
  i.legalBalls += 1;

  // Striker stats
  ensureBatterStats(i, i.currentStrikerId);
  i.batterStats[i.currentStrikerId].runs += runs;
  i.batterStats[i.currentStrikerId].balls += 1;
  i.batterStats[i.currentStrikerId].didBat = true;
  if (runs === 4) i.batterStats[i.currentStrikerId].fours += 1;
  if (runs === 6) i.batterStats[i.currentStrikerId].sixes += 1;
  i.batterStats[i.currentStrikerId].strikeRate =
    calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);

  // Partnership
  updatePartnership(i, runs, true);

  // Bowler stats
  ensureBowlerStats(i, i.currentBowlerId);
  i.bowlerStats[i.currentBowlerId].legalBalls += 1;
  i.bowlerStats[i.currentBowlerId].runs += runs;
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  // End of over?
  const isEndOfOver = i.legalBalls % 6 === 0;

  // Check maiden
  if (isEndOfOver) {
    checkMaiden(i, overNumber);
  }

  // Strike rotation
  if (shouldRotateStrike(runs, isEndOfOver)) {
    [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
  }

  // Check innings end
  const maxLegal = config.format.oversPerInnings * 6;
  if (i.legalBalls >= maxLegal) {
    return applyEndInnings({ ...state, innings: replaceInnings(state, i) }, 'overs_complete');
  }

  return { ...state, innings: replaceInnings(state, i) };
}

function applyWide(
  state: MatchState, additionalRuns: number, dismissal?: DismissalInfo,
): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);

  const overNumber = Math.floor(i.legalBalls / 6);
  const extrasTotal = 1 + additionalRuns;

  const event: DeliveryEvent = {
    id: uuidv4(), inningsId: i.id, overNumber, ballInOver: i.legalBalls % 6,
    legalBallSequence: i.legalBalls,
    deliveryType: 'wide', batterRuns: 0, extras: extrasTotal, totalRuns: extrasTotal,
    isLegal: false, isBoundary: additionalRuns === 4,
    boundaryType: additionalRuns === 4 ? 4 : undefined,
    dismissal,
    strikerId: i.currentStrikerId, nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId, timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  i.totalRuns += extrasTotal;
  i.extras.wides += extrasTotal;
  i.extras.total += extrasTotal;

  // Bowler charged
  ensureBowlerStats(i, i.currentBowlerId);
  i.bowlerStats[i.currentBowlerId].wides += extrasTotal;
  i.bowlerStats[i.currentBowlerId].runs += extrasTotal;
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  // Partnership
  updatePartnership(i, extrasTotal, false);

  // Handle dismissal on wide (run-out only)
  if (dismissal) {
    i = processWicket(i, dismissal, 0, state.config);
    // Don't change legalBalls - wide is illegal delivery
    // After run-out on wide: rotate strike based on completed runs if any
    if (additionalRuns % 2 !== 0) {
      [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
    }
  } else {
    // Strike rotation on wide only if runs completed (batters crossed)
    if (additionalRuns % 2 !== 0) {
      [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
    }
  }

  const ns = { ...state, innings: replaceInnings(state, i) };
  if (dismissal && isAllOut(i, state.config)) {
    return applyEndInnings(ns, 'all_out');
  }
  return ns;
}

function applyNoBall(
  state: MatchState,
  batterRuns: number,
  extraType?: 'bye' | 'leg_bye',
  extraRuns: number = 0,
  dismissal?: DismissalInfo,
): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);

  const overNumber = Math.floor(i.legalBalls / 6);
  const noBallPenalty = 1;
  const isBoundary = batterRuns === 4 || batterRuns === 6;
  const totalRuns = noBallPenalty + batterRuns + extraRuns;

  const event: DeliveryEvent = {
    id: uuidv4(), inningsId: i.id, overNumber, ballInOver: i.legalBalls % 6,
    legalBallSequence: i.legalBalls,
    deliveryType: 'no_ball', batterRuns, extras: noBallPenalty + extraRuns, totalRuns,
    isLegal: false, isBoundary, boundaryType: isBoundary ? (batterRuns === 4 ? 4 : 6) : undefined,
    dismissal,
    strikerId: i.currentStrikerId, nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId, timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  i.totalRuns += totalRuns;
  i.extras.noBalls += noBallPenalty;
  if (extraType === 'bye') i.extras.byes += extraRuns;
  if (extraType === 'leg_bye') i.extras.legByes += extraRuns;
  i.extras.total += noBallPenalty + extraRuns;

  // Credit batter runs
  if (batterRuns > 0) {
    ensureBatterStats(i, i.currentStrikerId);
    i.batterStats[i.currentStrikerId].runs += batterRuns;
    i.batterStats[i.currentStrikerId].balls += 1; // batter still faces the ball
    i.batterStats[i.currentStrikerId].didBat = true;
    if (batterRuns === 4) i.batterStats[i.currentStrikerId].fours += 1;
    if (batterRuns === 6) i.batterStats[i.currentStrikerId].sixes += 1;
    i.batterStats[i.currentStrikerId].strikeRate =
      calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);
  } else {
    // No-ball: batter faces ball but scores 0 — still increment balls
    ensureBatterStats(i, i.currentStrikerId);
    i.batterStats[i.currentStrikerId].balls += 1;
    i.batterStats[i.currentStrikerId].didBat = true;
    i.batterStats[i.currentStrikerId].strikeRate =
      calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);
  }

  // Partnership
  updatePartnership(i, totalRuns, false);

  // Bowler charged (penalty + bat runs, not byes/leg-byes)
  ensureBowlerStats(i, i.currentBowlerId);
  i.bowlerStats[i.currentBowlerId].noBalls += 1;
  i.bowlerStats[i.currentBowlerId].runs += noBallPenalty + batterRuns;
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  // Dismissal on no-ball (run-out valid)
  if (dismissal) {
    i = processWicket(i, dismissal, 0, state.config);
  }

  // Strike rotation based on total bat+extra runs
  const runsForRotation = batterRuns + extraRuns;
  if (runsForRotation % 2 !== 0) {
    [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
  }

  const ns = { ...state, innings: replaceInnings(state, i) };
  if (dismissal && isAllOut(i, state.config)) {
    return applyEndInnings(ns, 'all_out');
  }
  return ns;
}

function applyBye(state: MatchState, runs: number): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);
  const overNumber = Math.floor(i.legalBalls / 6);

  const event: DeliveryEvent = {
    id: uuidv4(), inningsId: i.id, overNumber, ballInOver: i.legalBalls % 6,
    legalBallSequence: i.legalBalls,
    deliveryType: 'bye', batterRuns: 0, extras: runs, totalRuns: runs,
    isLegal: true, isBoundary: false,
    strikerId: i.currentStrikerId, nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId, timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  i.totalRuns += runs;
  i.extras.byes += runs;
  i.extras.total += runs;
  i.legalBalls += 1;

  // Not charged to bowler, not credited to batter
  ensureBowlerStats(i, i.currentBowlerId);
  i.bowlerStats[i.currentBowlerId].legalBalls += 1;
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  // Batter still faces the ball
  ensureBatterStats(i, i.currentStrikerId);
  i.batterStats[i.currentStrikerId].balls += 1;
  i.batterStats[i.currentStrikerId].didBat = true;
  i.batterStats[i.currentStrikerId].strikeRate =
    calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);

  updatePartnership(i, runs, false);

  const isEndOfOver = i.legalBalls % 6 === 0;
  if (isEndOfOver) checkMaiden(i, overNumber);

  if (shouldRotateStrike(runs, isEndOfOver)) {
    [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
  }

  const maxLegal = state.config.format.oversPerInnings * 6;
  const ns = { ...state, innings: replaceInnings(state, i) };
  if (i.legalBalls >= maxLegal) return applyEndInnings(ns, 'overs_complete');
  return ns;
}

function applyLegBye(state: MatchState, runs: number): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);
  const overNumber = Math.floor(i.legalBalls / 6);

  const event: DeliveryEvent = {
    id: uuidv4(), inningsId: i.id, overNumber, ballInOver: i.legalBalls % 6,
    legalBallSequence: i.legalBalls,
    deliveryType: 'leg_bye', batterRuns: 0, extras: runs, totalRuns: runs,
    isLegal: true, isBoundary: false,
    strikerId: i.currentStrikerId, nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId, timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  i.totalRuns += runs;
  i.extras.legByes += runs;
  i.extras.total += runs;
  i.legalBalls += 1;

  ensureBowlerStats(i, i.currentBowlerId);
  i.bowlerStats[i.currentBowlerId].legalBalls += 1;
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  ensureBatterStats(i, i.currentStrikerId);
  i.batterStats[i.currentStrikerId].balls += 1;
  i.batterStats[i.currentStrikerId].didBat = true;
  i.batterStats[i.currentStrikerId].strikeRate =
    calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);

  updatePartnership(i, runs, false);

  const isEndOfOver = i.legalBalls % 6 === 0;
  if (isEndOfOver) checkMaiden(i, overNumber);

  if (shouldRotateStrike(runs, isEndOfOver)) {
    [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
  }

  const maxLegal = state.config.format.oversPerInnings * 6;
  const ns = { ...state, innings: replaceInnings(state, i) };
  if (i.legalBalls >= maxLegal) return applyEndInnings(ns, 'overs_complete');
  return ns;
}

function applyWicket(state: MatchState, dismissal: DismissalInfo, runs: number): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);
  const overNumber = Math.floor(i.legalBalls / 6);

  const event: DeliveryEvent = {
    id: uuidv4(), inningsId: i.id, overNumber, ballInOver: i.legalBalls % 6,
    legalBallSequence: i.legalBalls,
    deliveryType: 'normal', batterRuns: runs, extras: 0, totalRuns: runs,
    isLegal: true, isBoundary: false,
    dismissal,
    strikerId: i.currentStrikerId, nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId, timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  i.totalRuns += runs;
  i.legalBalls += 1;

  // Batter stats (for runs before dismissal)
  if (runs > 0) {
    ensureBatterStats(i, dismissal.dismissedBatterId);
    i.batterStats[dismissal.dismissedBatterId].runs += runs;
    i.batterStats[dismissal.dismissedBatterId].balls += 1;
    i.batterStats[dismissal.dismissedBatterId].didBat = true;
    i.batterStats[dismissal.dismissedBatterId].strikeRate =
      calculateSR(i.batterStats[dismissal.dismissedBatterId].runs, i.batterStats[dismissal.dismissedBatterId].balls);
  } else {
    ensureBatterStats(i, dismissal.dismissedBatterId);
    i.batterStats[dismissal.dismissedBatterId].balls += 1;
    i.batterStats[dismissal.dismissedBatterId].didBat = true;
    i.batterStats[dismissal.dismissedBatterId].strikeRate =
      calculateSR(i.batterStats[dismissal.dismissedBatterId].runs, i.batterStats[dismissal.dismissedBatterId].balls);
  }

  // Bowler stats
  ensureBowlerStats(i, i.currentBowlerId);
  i.bowlerStats[i.currentBowlerId].legalBalls += 1;
  i.bowlerStats[i.currentBowlerId].runs += runs;
  if (dismissal.bowlerCredited) {
    i.bowlerStats[i.currentBowlerId].wickets += 1;
  }
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  const isEndOfOver = i.legalBalls % 6 === 0;
  if (isEndOfOver) checkMaiden(i, overNumber);

  // Process the dismissal
  i = processWicket(i, dismissal, runs, state.config);

  // Strike rotation (after wicket, based on completed runs)
  // Non-dismissed batter retains or changes strike based on runs
  if (!isAllOut(i, state.config)) {
    // After run-out: complex — handled in processWicket for crossed batters
    // For other dismissals: rotate if odd runs completed
    if (dismissal.type !== 'run_out') {
      if (shouldRotateStrike(runs, isEndOfOver)) {
        [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
      }
    }
  }

  const ns = { ...state, innings: replaceInnings(state, i) };
  if (isAllOut(i, state.config)) {
    return applyEndInnings(ns, 'all_out');
  }

  const maxLegal = state.config.format.oversPerInnings * 6;
  if (i.legalBalls >= maxLegal) return applyEndInnings(ns, 'overs_complete');

  return ns;
}

function processWicket(
  i: InningsState, dismissal: DismissalInfo, _runs: number, _config: MatchState['config'],
): InningsState {
  // Close the active partnership
  const activePartnershipIdx = i.partnerships.findIndex(p => p.isActive);
  if (activePartnershipIdx >= 0) {
    i.partnerships[activePartnershipIdx].isActive = false;
  }

  // Mark batter as out
  ensureBatterStats(i, dismissal.dismissedBatterId);
  i.batterStats[dismissal.dismissedBatterId].isOut = true;
  i.batterStats[dismissal.dismissedBatterId].dismissal = dismissal;
  i.batterStats[dismissal.dismissedBatterId].dismissalText = getDismissalText(dismissal.type);

  // Wickets
  if (dismissal.type !== 'retired_hurt') {
    i.wickets += 1;

    // Fall of wickets
    const fow: FallOfWicket = {
      wicketNumber: i.wickets,
      score: i.totalRuns,
      overText: legalBallsToOverString(i.legalBalls),
      batterId: dismissal.dismissedBatterId,
      batterName: i.batterStats[dismissal.dismissedBatterId]?.playerName ?? dismissal.dismissedBatterId,
      dismissalText: getDismissalText(dismissal.type),
      partnershipRuns: activePartnershipIdx >= 0 ? i.partnerships[activePartnershipIdx].runs : 0,
    };
    i.fallOfWickets.push(fow);
  }

  // For run-out: determine who remains and handles strike
  if (dismissal.type === 'run_out') {
    const dismissedIsStriker = dismissal.dismissedBatterId === i.currentStrikerId;
    const crossing = dismissal.crossingOccurred ?? false;

    if (dismissedIsStriker) {
      // Striker dismissed. If crossing, non-striker ends up at striker end.
      if (crossing) {
        // Non-striker was running and has crossed — they should be at the striker's end
        // New batter comes in at non-striker end
        i.currentStrikerId = ''; // will be filled by UI prompting new batter
      } else {
        // No crossing — non-striker returns
        // New batter at striker end
        i.currentStrikerId = '';
      }
    } else {
      // Non-striker dismissed. Striker remains at their end.
      if (crossing) {
        // Batters had crossed — striker is now at non-striker end
        // New batter at striker end, old striker at non-striker end
        const tmpStriker = i.currentStrikerId;
        i.currentStrikerId = ''; // placeholder new batter
        i.currentNonStrikerId = tmpStriker;
      }
      // else: non-striker dismissed, striker stays, new batter at non-striker end
      // currentNonStrikerId = '' handled below
    }
  } else {
    // Non run-out: dismissed batter leaves, new batter comes in at their end
    if (dismissal.dismissedBatterId === i.currentStrikerId) {
      i.currentStrikerId = ''; // placeholder
    } else {
      i.currentNonStrikerId = ''; // placeholder
    }
  }

  return i;
}

function applyChangeBowler(state: MatchState, bowlerId: string): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);

  ensureBowlerStats(i, bowlerId);
  i.currentBowlerId = bowlerId;

  return { ...state, innings: replaceInnings(state, i) };
}

function applySwapBatters(state: MatchState): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);
  [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
  return { ...state, innings: replaceInnings(state, i) };
}

function applyRetiredHurt(state: MatchState, batterId: string, replacementId: string): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);

  ensureBatterStats(i, batterId);
  i.batterStats[batterId].isRetiredHurt = true;
  i.retiredHurtIds.push(batterId);

  if (i.currentStrikerId === batterId) {
    i.currentStrikerId = replacementId;
  } else {
    i.currentNonStrikerId = replacementId;
  }

  ensureBatterStats(i, replacementId);
  i.batterStats[replacementId].battingPosition = i.battingOrder.length + 1;
  if (!i.battingOrder.includes(replacementId)) {
    i.battingOrder.push(replacementId);
  }

  return { ...state, innings: replaceInnings(state, i) };
}

function applyEndInnings(
  state: MatchState,
  reason: 'all_out' | 'overs_complete' | 'target_reached' | 'manual' | 'declared',
): MatchState {
  const innings = currentInnings(state);
  const i = deepClone(innings);
  i.status = 'completed';
  i.completionReason = reason;
  i.completedAt = new Date().toISOString();

  const newInnings = replaceInnings(state, i);

  if (state.currentInningsIndex === 0) {
    // First innings done → transition to innings break
    return {
      ...state,
      innings: newInnings,
      status: 'innings_break',
    };
  } else {
    // Second innings done → match complete
    const result = calculateMatchResult(state.config, newInnings);
    return {
      ...state,
      innings: newInnings,
      status: 'completed',
      result,
    };
  }
}

function applyStartNextInnings(
  state: MatchState,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
): MatchState {
  const firstInnings = state.innings[0];
  const target = firstInnings.totalRuns + 1;

  const battingTeamId = firstInnings.bowlingTeamId;
  const bowlingTeamId = firstInnings.battingTeamId;

  const innings2 = createInnings(
    state.config.id, uuidv4(), 2,
    battingTeamId, bowlingTeamId,
    strikerId, nonStrikerId, bowlerId,
    target,
  );

  return {
    ...state,
    innings: [...state.innings, innings2],
    currentInningsIndex: 1,
    status: 'live',
  };
}

function undoAction(state: MatchState): MatchState {
  if (state.history.length === 0) return state;
  const history = [...state.history];
  const snapshot = history.pop()!;
  return {
    ...state,
    innings: snapshot.innings,
    currentInningsIndex: snapshot.currentInningsIndex,
    status: snapshot.status,
    result: snapshot.result,
    history,
  };
}

// ============================================================
// Helpers
// ============================================================

export function currentInnings(state: MatchState): InningsState {
  return state.innings[state.currentInningsIndex];
}

function replaceInnings(state: MatchState, updated: InningsState): InningsState[] {
  return state.innings.map((inn, idx) =>
    idx === state.currentInningsIndex ? updated : inn
  );
}

function isAllOut(i: InningsState, config: MatchState['config']): boolean {
  return i.wickets >= config.format.playersPerSide - 1;
}

function ensureBatterStats(i: InningsState, id: string): void {
  if (!i.batterStats[id]) {
    i.batterStats[id] = makeBatterStats(id, '', i.battingOrder.indexOf(id) + 1, i.id);
  }
}

function ensureBowlerStats(i: InningsState, id: string): void {
  if (!i.bowlerStats[id]) {
    i.bowlerStats[id] = makeBowlerStats(id, '', i.id);
  }
}

function updatePartnership(i: InningsState, runs: number, isLegal: boolean): void {
  const activeIdx = i.partnerships.findIndex(p => p.isActive);
  if (activeIdx >= 0) {
    i.partnerships[activeIdx].runs += runs;
    if (isLegal) i.partnerships[activeIdx].balls += 1;
  }
}

function checkMaiden(i: InningsState, overNumber: number): void {
  // Sum all runs conceded by current bowler in this over
  const bowlerDeliveries = i.deliveries.filter(
    d => d.bowlerId === i.currentBowlerId && d.overNumber === overNumber
  );
  const runsInOver = bowlerDeliveries.reduce((sum, d) => sum + d.totalRuns, 0);
  if (runsInOver === 0) {
    i.bowlerStats[i.currentBowlerId].maidens += 1;
  }
}

function calculateMatchResult(config: MatchConfig, innings: InningsState[]): MatchResult {
  if (innings.length < 2) return { resultText: 'Match in progress' };

  const inn1 = innings[0];
  const inn2 = innings[1];
  const team1Name = config.teamA.id === inn1.battingTeamId ? config.teamA.name : config.teamB.name;
  const team2Name = config.teamA.id === inn2.battingTeamId ? config.teamA.name : config.teamB.name;

  if (inn2.totalRuns > inn1.totalRuns) {
    const wicketsRemaining = config.format.playersPerSide - 1 - inn2.wickets;
    const margin = `${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
    return {
      winner: inn2.battingTeamId === config.teamA.id ? 'teamA' : 'teamB',
      winnerName: team2Name,
      margin,
      resultText: `${team2Name} won by ${margin}`,
    };
  } else if (inn2.totalRuns < inn1.totalRuns) {
    const margin = `${inn1.totalRuns - inn2.totalRuns} run${inn1.totalRuns - inn2.totalRuns !== 1 ? 's' : ''}`;
    return {
      winner: inn1.battingTeamId === config.teamA.id ? 'teamA' : 'teamB',
      winnerName: team1Name,
      margin,
      resultText: `${team1Name} won by ${margin}`,
    };
  } else {
    return { winner: 'tie', resultText: 'Match tied' };
  }
}

// ============================================================
// New batter entry
// ============================================================

export function addNewBatter(state: MatchState, batterId: string): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);

  if (!i.battingOrder.includes(batterId)) {
    i.battingOrder.push(batterId);
  }
  ensureBatterStats(i, batterId);
  i.batterStats[batterId].battingPosition = i.battingOrder.indexOf(batterId) + 1;

  // Place in the empty slot
  if (!i.currentStrikerId || i.currentStrikerId === '') {
    i.currentStrikerId = batterId;
  } else if (!i.currentNonStrikerId || i.currentNonStrikerId === '') {
    i.currentNonStrikerId = batterId;
  }

  // Restart partnership
  const newPartnership: Partnership = {
    batterAId: i.currentStrikerId,
    batterBId: i.currentNonStrikerId,
    runs: 0, balls: 0, isActive: true, wicketNumber: i.wickets,
  };
  i.partnerships.push(newPartnership);

  return { ...state, innings: replaceInnings(state, i) };
}

// ============================================================
// Target check (for 2nd innings)
// ============================================================

export function checkTargetReached(state: MatchState): boolean {
  if (state.currentInningsIndex !== 1) return false;
  const i = currentInnings(state);
  if (!i.target) return false;
  return i.totalRuns >= i.target;
}

// ============================================================
// Utility
// ============================================================

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export { deepClone };
