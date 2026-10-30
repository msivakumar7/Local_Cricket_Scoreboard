// ============================================================
// LocalCricket — Cricket Rules
// ============================================================

import type { DismissalType, DeliveryType, InningsState, MatchFormat } from './types';

/** Dismissals valid for each delivery type */
export const VALID_DISMISSALS_ON_DELIVERY: Record<DeliveryType, DismissalType[]> = {
  normal: [
    'bowled', 'caught', 'caught_and_bowled', 'lbw', 'stumped',
    'run_out', 'hit_wicket', 'hit_ball_twice', 'obstructing_field',
    'retired_out', 'handled_ball',
  ],
  wide: ['run_out', 'obstructing_field', 'handled_ball', 'timed_out'],
  no_ball: ['run_out', 'hit_ball_twice', 'obstructing_field', 'handled_ball', 'retired_out'],
  bye: ['run_out', 'obstructing_field'],
  leg_bye: ['run_out', 'obstructing_field'],
  penalty: [],
};

/** Dismissals where the bowler is credited with the wicket */
export const BOWLER_CREDITED_DISMISSALS: DismissalType[] = [
  'bowled',
  'caught',
  'caught_and_bowled',
  'lbw',
  'stumped',
  'hit_wicket',
];

export function isBowlerCredited(type: DismissalType): boolean {
  return BOWLER_CREDITED_DISMISSALS.includes(type);
}

/**
 * Determines if strike should swap based on completed runs and end-of-over status.
 * - During an over: odd completed runs swap strike; even runs do not.
 * - At end of over: ends change. An odd run swaps physical ends AND the bowling end changes,
 *   meaning the batter who ran the single retains the strike for the new over.
 *   Conversely, on an even score/dot ball, the other batter faces the new over.
 */
export function shouldRotateStrike(
  completedRuns: number,
  isEndOfOver: boolean
): boolean {
  const oddRuns = completedRuns % 2 !== 0;
  if (isEndOfOver) {
    return !oddRuns;
  }
  return oddRuns;
}

/** Human-readable dismissal text */
export function getDismissalText(
  type: DismissalType,
  bowlerName?: string,
  fielderName?: string
): string {
  switch (type) {
    case 'bowled':
      return `b ${bowlerName ?? ''}`;
    case 'caught':
      return `c ${fielderName ?? ''} b ${bowlerName ?? ''}`;
    case 'caught_and_bowled':
      return `c & b ${bowlerName ?? ''}`;
    case 'lbw':
      return `lbw b ${bowlerName ?? ''}`;
    case 'stumped':
      return `st ${fielderName ?? ''} b ${bowlerName ?? ''}`;
    case 'run_out':
      return fielderName ? `run out (${fielderName})` : 'run out';
    case 'hit_wicket':
      return `hit wicket b ${bowlerName ?? ''}`;
    case 'hit_ball_twice':
      return 'hit ball twice';
    case 'obstructing_field':
      return 'obstructing the field';
    case 'retired_out':
      return 'retired out';
    case 'retired_hurt':
      return 'retired hurt';
    case 'timed_out':
      return 'timed out';
    case 'handled_ball':
      return 'handled the ball';
    default:
      return type;
  }
}

/** Calculate maximum overs permitted per bowler based on format */
export function getMaxOversPerBowler(format: MatchFormat): number {
  if (format.maxOversPerBowler && format.maxOversPerBowler > 0) {
    return format.maxOversPerBowler;
  }
  return Math.max(1, Math.ceil(format.oversPerInnings / 5));
}

/**
 * Check if the innings is currently awaiting a new bowler for the upcoming over.
 * Returns true if an over has just completed (6 legal balls), the innings is still active,
 * not all-out, innings overs limit not reached, and the bowler for the next over has not
 * yet been confirmed (currentBowlerId is still the bowler of the previous over).
 */
export function isAwaitingNextBowler(
  innings: InningsState,
  oversPerInnings: number,
  isAllOut: boolean = false
): boolean {
  if (innings.status !== 'active' || isAllOut) return false;
  if (innings.legalBalls === 0 || innings.legalBalls % 6 !== 0) return false;
  if (innings.legalBalls >= oversPerInnings * 6) return false;

  const completedOverIndex = Math.floor(innings.legalBalls / 6) - 1;
  const prevOverDeliveries = innings.deliveries.filter(d => d.overNumber === completedOverIndex);
  const lastOverBowlerId = prevOverDeliveries.length > 0 ? prevOverDeliveries[prevOverDeliveries.length - 1].bowlerId : null;

  const nextOverIndex = completedOverIndex + 1;
  const nextOverDeliveries = innings.deliveries.filter(d => d.overNumber === nextOverIndex);

  // If new over deliveries already exist, we are not awaiting a bowler
  if (nextOverDeliveries.length > 0) return false;

  // If current bowler is still the bowler of the last over, a new bowler must be chosen
  return lastOverBowlerId !== null && innings.currentBowlerId === lastOverBowlerId;
}

/** Check bowling quota */
export function validateBowlerChange(
  newBowlerId: string,
  lastOverBowlerId: string | null,
  legalBalls: number | undefined,
  maxOversPerBowler: number
): { valid: boolean; reason?: string } {
  if (newBowlerId === lastOverBowlerId) {
    return { valid: false, reason: 'The same bowler cannot bowl consecutive overs.' };
  }
  if (maxOversPerBowler > 0 && legalBalls !== undefined) {
    const oversCompleted = Math.floor(legalBalls / 6);
    if (oversCompleted >= maxOversPerBowler) {
      return {
        valid: false,
        reason: `This bowler has already bowled their quota of ${maxOversPerBowler} over${maxOversPerBowler !== 1 ? 's' : ''}.`,
      };
    }
  }
  return { valid: true };
}

/** Convert legal balls to display string e.g. 9 → "1.3" */
export function legalBallsToOverString(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

/** CRR = totalRuns × 6 / legalBalls */
export function calculateCRR(totalRuns: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  return (totalRuns * 6) / legalBalls;
}

/** RRR = requiredRuns × 6 / ballsRemaining */
export function calculateRRR(requiredRuns: number, ballsRemaining: number): number {
  if (ballsRemaining <= 0) return Infinity;
  return (requiredRuns * 6) / ballsRemaining;
}

/** Batter strike rate */
export function calculateSR(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return (runs / balls) * 100;
}

/** Bowling economy */
export function calculateEconomy(runs: number, legalBalls: number): number {
  if (legalBalls === 0) return 0;
  return (runs * 6) / legalBalls;
}
