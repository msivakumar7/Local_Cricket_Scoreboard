// ============================================================
// LocalCricket — Cricket Scoring Engine
// Pure functions, no React, no side effects
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchState, MatchConfig, InningsState, DeliveryEvent,
  ScoringAction, DismissalInfo, ExtrasBreakdown, BatterStats,
  BowlerStats, FallOfWicket, Partnership, MatchStateSnapshot,
  MatchResult, Player,
} from './types';
import {
  isBowlerCredited, shouldRotateStrike, getDismissalText,
  calculateSR, calculateEconomy, legalBallsToOverString,
} from './rules';

// ============================================================
// Initialisation
// ============================================================

export function getPlayerNameById(config: MatchConfig, id: string): string {
  const p = config.teamA.players.find(pl => pl.id === id) || config.teamB.players.find(pl => pl.id === id);
  return p?.name || id;
}

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
    openingStrikerId, openingNonStrikerId, openingBowlerId, config);

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
  config?: MatchConfig,
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
  const strikerName = config ? getPlayerNameById(config, strikerId) : '';
  const nonStrikerName = config ? getPlayerNameById(config, nonStrikerId) : '';
  const bowlerName = config ? getPlayerNameById(config, bowlerId) : '';
  innings.batterStats[strikerId] = makeBatterStats(strikerId, strikerName, 1, innings.id);
  innings.batterStats[nonStrikerId] = makeBatterStats(nonStrikerId, nonStrikerName, 2, innings.id);
  innings.bowlerStats[bowlerId] = makeBowlerStats(bowlerId, bowlerName, innings.id);
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
  if (action.type === 'UPDATE_PLAYER_NAME') {
    return updatePlayerName(state, action.playerId, action.newName);
  }

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
    case 'PENALTY':
      return applyPenalty(stateWithSnapshot, action.runs);
    case 'WICKET':
      return applyWicket(stateWithSnapshot, action.dismissal, action.runs ?? 0);
    case 'ADD_BATTER':
      return addNewBatter(stateWithSnapshot, action.batterId, action.newPlayerName);
    case 'ADD_BOWLER':
      return addBowler(stateWithSnapshot, action.bowlerId, action.bowlerName);
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
    case 'EDIT_DELIVERY':
      return applyEditDelivery(stateWithSnapshot, action.deliveryId, action.updatedDelivery);
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
  return checkAutoEndInnings(state, i);
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
    deliveryType: 'wide', batterRuns: 0, completedRuns: additionalRuns, extras: extrasTotal, totalRuns: extrasTotal,
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
    i = processWicket(i, dismissal, 0, state.config, false);
  } else {
    // Strike rotation on wide only if runs completed (batters crossed)
    if (additionalRuns % 2 !== 0) {
      [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
    }
  }

  return checkAutoEndInnings(state, i);
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
    ensureBatterStats(i, i.currentStrikerId, state.config);
    i.batterStats[i.currentStrikerId].runs += batterRuns;
    i.batterStats[i.currentStrikerId].balls += 1; // batter still faces the ball
    i.batterStats[i.currentStrikerId].didBat = true;
    if (batterRuns === 4) i.batterStats[i.currentStrikerId].fours += 1;
    if (batterRuns === 6) i.batterStats[i.currentStrikerId].sixes += 1;
    i.batterStats[i.currentStrikerId].strikeRate =
      calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);
  } else {
    // No-ball: batter faces ball but scores 0 — still increment balls
    ensureBatterStats(i, i.currentStrikerId, state.config);
    i.batterStats[i.currentStrikerId].balls += 1;
    i.batterStats[i.currentStrikerId].didBat = true;
    i.batterStats[i.currentStrikerId].strikeRate =
      calculateSR(i.batterStats[i.currentStrikerId].runs, i.batterStats[i.currentStrikerId].balls);
  }

  // Partnership
  updatePartnership(i, totalRuns, false);

  // Bowler charged (penalty + bat runs, not byes/leg-byes)
  ensureBowlerStats(i, i.currentBowlerId, state.config);
  i.bowlerStats[i.currentBowlerId].noBalls += 1;
  i.bowlerStats[i.currentBowlerId].runs += noBallPenalty + batterRuns;
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  // Dismissal on no-ball (run-out valid)
  if (dismissal) {
    i = processWicket(i, dismissal, 0, state.config, false);
  } else {
    // Strike rotation based on total bat+extra runs when no dismissal
    const runsForRotation = batterRuns + extraRuns;
    if (runsForRotation % 2 !== 0) {
      [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
    }
  }

  return checkAutoEndInnings(state, i);
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

  return checkAutoEndInnings(state, i);
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

  return checkAutoEndInnings(state, i);
}

function applyPenalty(state: MatchState, runs: number): MatchState {
  const innings = currentInnings(state);
  const i = deepClone(innings);
  const overNumber = Math.floor(i.legalBalls / 6);

  const event: DeliveryEvent = {
    id: uuidv4(),
    inningsId: i.id,
    overNumber,
    ballInOver: i.legalBalls % 6,
    legalBallSequence: i.legalBalls,
    deliveryType: 'penalty',
    batterRuns: 0,
    extras: runs,
    totalRuns: runs,
    isLegal: false,
    isBoundary: false,
    strikerId: i.currentStrikerId,
    nonStrikerId: i.currentNonStrikerId,
    bowlerId: i.currentBowlerId,
    timestamp: new Date().toISOString(),
  };
  i.deliveries.push(event);

  i.totalRuns += runs;
  i.extras.penalties += runs;
  i.extras.total += runs;

  updatePartnership(i, runs, false);

  return checkAutoEndInnings(state, i);
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

  // Batter stats: The striker always faces this delivery
  const strikerId = event.strikerId;
  ensureBatterStats(i, strikerId, state.config);
  i.batterStats[strikerId].balls += 1;
  i.batterStats[strikerId].didBat = true;
  if (runs > 0) {
    i.batterStats[strikerId].runs += runs;
  }
  i.batterStats[strikerId].strikeRate =
    calculateSR(i.batterStats[strikerId].runs, i.batterStats[strikerId].balls);

  // Ensure dismissed batter is marked didBat
  ensureBatterStats(i, dismissal.dismissedBatterId, state.config);
  i.batterStats[dismissal.dismissedBatterId].didBat = true;

  // Partnership update before wicket closes it
  updatePartnership(i, runs, true);

  // Bowler stats
  ensureBowlerStats(i, i.currentBowlerId, state.config);
  i.bowlerStats[i.currentBowlerId].legalBalls += 1;
  i.bowlerStats[i.currentBowlerId].runs += runs;
  if (dismissal.bowlerCredited) {
    i.bowlerStats[i.currentBowlerId].wickets += 1;
  }
  i.bowlerStats[i.currentBowlerId].economy =
    calculateEconomy(i.bowlerStats[i.currentBowlerId].runs, i.bowlerStats[i.currentBowlerId].legalBalls);

  const isEndOfOver = i.legalBalls % 6 === 0;
  if (isEndOfOver) checkMaiden(i, overNumber);

  // Process the dismissal and set crease / strike positions
  i = processWicket(i, dismissal, runs, state.config, isEndOfOver);

  return checkAutoEndInnings(state, i);
}

function processWicket(
  i: InningsState,
  dismissal: DismissalInfo,
  _runs: number,
  config: MatchConfig,
  isEndOfOver: boolean = false,
): InningsState {
  // Close the active partnership
  const activePartnershipIdx = i.partnerships.findIndex(p => p.isActive);
  if (activePartnershipIdx >= 0) {
    i.partnerships[activePartnershipIdx].isActive = false;
  }

  const bowlerName = getPlayerNameById(config, i.currentBowlerId);
  const fielderName = dismissal.fielderId ? getPlayerNameById(config, dismissal.fielderId) : undefined;
  const dismissalText = getDismissalText(dismissal.type, bowlerName, fielderName);

  // Mark batter as out
  ensureBatterStats(i, dismissal.dismissedBatterId, config);
  i.batterStats[dismissal.dismissedBatterId].isOut = true;
  i.batterStats[dismissal.dismissedBatterId].dismissal = dismissal;
  i.batterStats[dismissal.dismissedBatterId].dismissalText = dismissalText;

  // Wickets
  if (dismissal.type !== 'retired_hurt') {
    i.wickets += 1;

    // Fall of wickets
    const fow: FallOfWicket = {
      wicketNumber: i.wickets,
      score: i.totalRuns,
      overText: legalBallsToOverString(i.legalBalls),
      batterId: dismissal.dismissedBatterId,
      batterName: getPlayerNameById(config, dismissal.dismissedBatterId),
      dismissalText,
      partnershipRuns: activePartnershipIdx >= 0 ? i.partnerships[activePartnershipIdx].runs : 0,
    };
    i.fallOfWickets.push(fow);
  }

  // Strike & Crease End Resolution
  const dismissedIsStriker = dismissal.dismissedBatterId === i.currentStrikerId;
  const survivingBatterId = dismissedIsStriker ? i.currentNonStrikerId : i.currentStrikerId;

  if (dismissal.type === 'run_out') {
    const crossing = dismissal.crossingOccurred ?? false;
    // When batters run:
    // If (striker out && !crossed) OR (non-striker out && crossed):
    // surviving batter is at non-striker end, new batter enters at striker end.
    if ((dismissedIsStriker && !crossing) || (!dismissedIsStriker && crossing)) {
      i.currentStrikerId = '';
      i.currentNonStrikerId = survivingBatterId;
    } else {
      // If (striker out && crossed) OR (non-striker out && !crossed):
      // surviving batter is at striker end, new batter enters at non-striker end.
      i.currentStrikerId = survivingBatterId;
      i.currentNonStrikerId = '';
    }

    // At end of over, the bowling end changes so ends swap
    if (isEndOfOver) {
      [i.currentStrikerId, i.currentNonStrikerId] = [i.currentNonStrikerId, i.currentStrikerId];
    }
  } else {
    // Non run-out dismissals (bowled, caught, lbw, stumped, hit wicket, etc.)
    // Under MCC Law 18.11: New batter always faces the next ball (striker's end),
    // UNLESS it was the end of the over (where ends change and the non-striker faces the next over).
    if (isEndOfOver) {
      // Over ended on wicket ball: ends swap.
      // Surviving batter moves to striker's end to face ball 1 of next over; new batter at non-striker end.
      i.currentStrikerId = survivingBatterId;
      i.currentNonStrikerId = '';
    } else {
      // Mid-over wicket: incoming batter is at striker's end to face next ball.
      i.currentStrikerId = '';
      i.currentNonStrikerId = survivingBatterId;
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
  const i = deepClone(innings);

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

  // Close previous partnership and start new one
  const activePartnershipIdx = i.partnerships.findIndex(p => p.isActive);
  if (activePartnershipIdx >= 0) {
    i.partnerships[activePartnershipIdx].isActive = false;
  }
  const newPartnership: Partnership = {
    batterAId: i.currentStrikerId,
    batterBId: i.currentNonStrikerId,
    runs: 0,
    balls: 0,
    isActive: true,
    wicketNumber: i.wickets,
  };
  i.partnerships.push(newPartnership);

  return { ...state, innings: replaceInnings(state, i) };
}

function checkAutoEndInnings(state: MatchState, i: InningsState): MatchState {
  const maxLegal = state.config.format.oversPerInnings * 6;
  const is2ndInnings = state.currentInningsIndex === 1;

  // 1. Target reached in 2nd innings
  if (is2ndInnings && i.target !== undefined && i.totalRuns >= i.target) {
    return applyEndInnings({ ...state, innings: replaceInnings(state, i) }, 'target_reached');
  }

  // 2. All out
  if (isAllOut(i, state.config)) {
    return applyEndInnings({ ...state, innings: replaceInnings(state, i) }, 'all_out');
  }

  // 3. Overs completed
  if (i.legalBalls >= maxLegal) {
    return applyEndInnings({ ...state, innings: replaceInnings(state, i) }, 'overs_complete');
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
    state.config,
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

function ensureBatterStats(i: InningsState, id: string, config?: MatchConfig): void {
  if (!i.batterStats[id]) {
    const name = config ? getPlayerNameById(config, id) : '';
    i.batterStats[id] = makeBatterStats(id, name, i.battingOrder.indexOf(id) + 1, i.id);
  }
}

function ensureBowlerStats(i: InningsState, id: string, config?: MatchConfig): void {
  if (!i.bowlerStats[id]) {
    const name = config ? getPlayerNameById(config, id) : '';
    i.bowlerStats[id] = makeBowlerStats(id, name, i.id);
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
  // An over is a maiden if NO runs were conceded by the bowler (bat runs, wides, no-balls).
  // Byes, leg byes, and penalties do NOT count against the bowler.
  const bowlerDeliveries = i.deliveries.filter(
    d => d.bowlerId === i.currentBowlerId && d.overNumber === overNumber
  );
  const runsConcededByBowler = bowlerDeliveries.reduce((sum, d) => {
    if (d.deliveryType === 'bye' || d.deliveryType === 'leg_bye' || d.deliveryType === 'penalty') {
      return sum;
    }
    if (d.deliveryType === 'no_ball') {
      return sum + 1 + d.batterRuns; // penalty 1 + bat runs (byes/leg byes off no ball not charged to bowler)
    }
    return sum + d.totalRuns;
  }, 0);

  if (runsConcededByBowler === 0 && bowlerDeliveries.some(d => d.isLegal)) {
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
    const maxLegalBalls = config.format.oversPerInnings * 6;
    const ballsRemaining = Math.max(0, maxLegalBalls - inn2.legalBalls);
    const margin = `${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
    const ballsText = ballsRemaining > 0 ? ` (with ${ballsRemaining} ball${ballsRemaining !== 1 ? 's' : ''} remaining)` : '';
    return {
      winner: inn2.battingTeamId === config.teamA.id ? 'teamA' : 'teamB',
      winnerName: team2Name,
      margin,
      resultText: `${team2Name} won by ${margin}${ballsText}`,
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
// New batter entry & Player Management
// ============================================================

export function addNewBatter(
  state: MatchState,
  batterId: string,
  newPlayerName?: string
): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);
  let config = deepClone(state.config);

  const battingTeamId = i.battingTeamId;
  const isTeamA = battingTeamId === config.teamA.id;
  const battingTeam = isTeamA ? config.teamA : config.teamB;

  let player = battingTeam.players.find(p => p.id === batterId);
  if (!player) {
    const assignedName = (newPlayerName && newPlayerName.trim())
      ? newPlayerName.trim()
      : `Batter ${i.battingOrder.length + 1}`;
    player = {
      id: batterId,
      name: assignedName,
      isCaptain: false,
      isWicketkeeper: false,
    };
    battingTeam.players.push(player);
  } else if (newPlayerName && newPlayerName.trim()) {
    player.name = newPlayerName.trim();
  }

  if (!i.battingOrder.includes(batterId)) {
    i.battingOrder.push(batterId);
  }
  ensureBatterStats(i, batterId, config);
  if (player && i.batterStats[batterId]) {
    i.batterStats[batterId].playerName = player.name;
  }
  i.batterStats[batterId].battingPosition = i.battingOrder.indexOf(batterId) + 1;
  i.batterStats[batterId].isRetiredHurt = false;
  i.batterStats[batterId].isOut = false;
  i.retiredHurtIds = i.retiredHurtIds.filter(id => id !== batterId);

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
    runs: 0,
    balls: 0,
    isActive: true,
    wicketNumber: i.wickets,
  };
  i.partnerships.push(newPartnership);

  return {
    ...state,
    config,
    innings: replaceInnings(state, i),
  };
}

export function addBowler(
  state: MatchState,
  bowlerId: string,
  bowlerName: string
): MatchState {
  const innings = currentInnings(state);
  let i = deepClone(innings);
  let config = deepClone(state.config);

  const bowlingTeamId = i.bowlingTeamId;
  const isTeamA = bowlingTeamId === config.teamA.id;
  const bowlingTeam = isTeamA ? config.teamA : config.teamB;

  let player = bowlingTeam.players.find(p => p.id === bowlerId);
  if (!player) {
    player = {
      id: bowlerId,
      name: bowlerName.trim(),
      isCaptain: false,
      isWicketkeeper: false,
    };
    bowlingTeam.players.push(player);
  } else {
    player.name = bowlerName.trim();
  }

  ensureBowlerStats(i, bowlerId, config);
  if (player && i.bowlerStats[bowlerId]) {
    i.bowlerStats[bowlerId].playerName = player.name;
  }
  i.currentBowlerId = bowlerId;

  return {
    ...state,
    config,
    innings: replaceInnings(state, i),
  };
}

export function updatePlayerName(
  state: MatchState,
  playerId: string,
  newName: string
): MatchState {
  const trimmed = newName.trim();
  if (!trimmed) return state;

  const config = deepClone(state.config);
  let playerFound = false;
  for (const p of config.teamA.players) {
    if (p.id === playerId) {
      p.name = trimmed;
      playerFound = true;
      break;
    }
  }
  if (!playerFound) {
    for (const p of config.teamB.players) {
      if (p.id === playerId) {
        p.name = trimmed;
        playerFound = true;
        break;
      }
    }
  }

  const updateInningsNames = (inn: InningsState): InningsState => {
    const updated = deepClone(inn);
    if (updated.batterStats[playerId]) {
      updated.batterStats[playerId].playerName = trimmed;
    }
    if (updated.bowlerStats[playerId]) {
      updated.bowlerStats[playerId].playerName = trimmed;
    }
    updated.fallOfWickets = updated.fallOfWickets.map(fow => {
      if (fow.batterId === playerId) {
        return { ...fow, batterName: trimmed };
      }
      return fow;
    });

    // Update dismissal texts if a bowler or fielder name changed
    for (const bId of Object.keys(updated.batterStats)) {
      const bStat = updated.batterStats[bId];
      if (bStat.dismissal) {
        if (
          bStat.dismissal.dismissedBatterId === playerId ||
          bStat.dismissal.fielderId === playerId
        ) {
          const bowlerDelivery = updated.deliveries.find(
            d => d.dismissal?.dismissedBatterId === bId
          );
          const bowlerName = bowlerDelivery
            ? getPlayerNameById(config, bowlerDelivery.bowlerId)
            : getPlayerNameById(config, updated.currentBowlerId);
          const fielderName = bStat.dismissal.fielderId
            ? getPlayerNameById(config, bStat.dismissal.fielderId)
            : undefined;
          bStat.dismissalText = getDismissalText(
            bStat.dismissal.type,
            bowlerName,
            fielderName
          );
        }
      }
    }

    return updated;
  };

  const newInnings = state.innings.map(updateInningsNames);
  const newHistory = state.history.map(snap => ({
    ...snap,
    innings: snap.innings.map(updateInningsNames),
  }));

  return {
    ...state,
    config,
    innings: newInnings,
    history: newHistory,
  };
}

// ============================================================
// Delivery Editing & Innings Recalculation
// ============================================================

function applyEditDelivery(
  state: MatchState,
  deliveryId: string,
  updatedDelivery: Partial<DeliveryEvent>
): MatchState {
  const innings = currentInnings(state);
  const deliveryIndex = innings.deliveries.findIndex(d => d.id === deliveryId);
  if (deliveryIndex === -1) return state;

  const updatedDeliveries = [...innings.deliveries];
  updatedDeliveries[deliveryIndex] = {
    ...updatedDeliveries[deliveryIndex],
    ...updatedDelivery,
  };

  const updatedInnings = recalculateInnings(
    { ...innings, deliveries: updatedDeliveries },
    state.config
  );

  const newInningsList = replaceInnings(state, updatedInnings);
  const result = newInningsList.length > 1
    ? calculateMatchResult(state.config, newInningsList)
    : undefined;

  return {
    ...state,
    innings: newInningsList,
    result: result ?? state.result,
  };
}

export function recalculateInnings(innings: InningsState, config: MatchConfig): InningsState {
  if (innings.deliveries.length === 0) return innings;

  const deliveries = [...innings.deliveries];
  const firstDel = deliveries[0];
  const openingStrikerId = firstDel.strikerId;
  const openingNonStrikerId = firstDel.nonStrikerId;
  const openingBowlerId = firstDel.bowlerId;

  let replayed = createInnings(
    innings.matchId,
    innings.id,
    innings.inningsNumber,
    innings.battingTeamId,
    innings.bowlingTeamId,
    openingStrikerId,
    openingNonStrikerId,
    openingBowlerId,
    config,
    innings.target
  );

  replayed.battingOrder = [...innings.battingOrder];

  let dummyState: MatchState = {
    config,
    innings: [replayed],
    currentInningsIndex: 0,
    status: 'live',
    history: [],
  };

  for (const del of deliveries) {
    if (del.deliveryType === 'normal') {
      if (del.dismissal) {
        dummyState = applyWicket(dummyState, del.dismissal, del.batterRuns);
      } else {
        dummyState = applyNormalDelivery(dummyState, del.batterRuns, del.isBoundary, del.boundaryType);
      }
    } else if (del.deliveryType === 'wide') {
      dummyState = applyWide(dummyState, Math.max(0, del.extras - 1), del.dismissal);
    } else if (del.deliveryType === 'no_ball') {
      dummyState = applyNoBall(dummyState, del.batterRuns, undefined, 0, del.dismissal);
    } else if (del.deliveryType === 'bye') {
      dummyState = applyBye(dummyState, del.extras);
    } else if (del.deliveryType === 'leg_bye') {
      dummyState = applyLegBye(dummyState, del.extras);
    } else if (del.deliveryType === 'penalty') {
      dummyState = applyPenalty(dummyState, del.extras);
    }
  }

  const finalInnings = dummyState.innings[0];
  finalInnings.id = innings.id;
  finalInnings.status = innings.status;
  finalInnings.completionReason = innings.completionReason;
  return finalInnings;
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
