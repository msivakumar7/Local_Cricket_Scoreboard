// ============================================================
// LocalCricket — Core Domain Types
// ============================================================

export interface Player {
  id: string;
  name: string;
  isCaptain: boolean;
  isWicketkeeper: boolean;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface MatchFormat {
  oversPerInnings: number;
  maxOversPerBowler: number;
  playersPerSide: number;
}

export type PlayerEntryMode = 'dynamic' | 'pre_enter';

export type MatchStatus = 'setup' | 'live' | 'innings_break' | 'completed' | 'abandoned';

export interface MatchConfig {
  id: string;
  title: string;
  venue: string;
  date: string;
  format: MatchFormat;
  entryMode?: PlayerEntryMode;
  teamA: Team;
  teamB: Team;
  tossWinnerId: string; // team id
  tossDecision: 'bat' | 'bowl';
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Delivery Event Types
// ============================================================

export type DeliveryType = 'normal' | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'penalty';

export type DismissalType =
  | 'bowled'
  | 'caught'
  | 'caught_and_bowled'
  | 'lbw'
  | 'stumped'
  | 'run_out'
  | 'hit_wicket'
  | 'hit_ball_twice'
  | 'obstructing_field'
  | 'retired_out'
  | 'retired_hurt'
  | 'timed_out'
  | 'handled_ball';

export interface DismissalInfo {
  type: DismissalType;
  dismissedBatterId: string;
  fielderId?: string;       // fielder for caught / stumped
  bowlerCredited: boolean;  // true when dismissal counts as bowler wicket
  runOutBatterPosition?: 'striker' | 'non_striker';
  crossingOccurred?: boolean;
}

export interface DeliveryEvent {
  id: string;
  inningsId: string;
  overNumber: number;         // 0-based over index
  ballInOver: number;         // 0-based legal ball within the over
  legalBallSequence: number;  // monotonically increasing legal ball count (0-based)
  deliveryType: DeliveryType;
  batterRuns: number;         // runs credited to the striker
  completedRuns?: number;     // runs completed by batters on extras (e.g. wide)
  extras: number;             // extra runs on this delivery
  totalRuns: number;          // batterRuns + extras
  isLegal: boolean;           // false for wide / no-ball
  isBoundary: boolean;
  boundaryType?: 4 | 6;
  dismissal?: DismissalInfo;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  timestamp: string;
}

// ============================================================
// Statistics
// ============================================================

export interface BatterStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal?: DismissalInfo;
  dismissalText?: string;
  isOut: boolean;
  isRetiredHurt: boolean;
  battingPosition: number; // 1-based
  inningsId: string;
  didBat: boolean;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  legalBalls: number;
  maidens: number;
  runs: number;   // runs conceded (excl byes / leg-byes)
  wickets: number;
  economy: number;
  noBalls: number;
  wides: number;
  inningsId: string;
}

export interface FallOfWicket {
  wicketNumber: number;
  score: number;
  overText: string;
  batterId: string;
  batterName: string;
  dismissalText: string;
  partnershipRuns: number;
}

export interface Partnership {
  batterAId: string;
  batterBId: string;
  runs: number;
  balls: number;
  isActive: boolean;
  wicketNumber: number; // 0 = opening partnership
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalties: number;
  total: number;
}

// ============================================================
// Innings & Match State
// ============================================================

export interface InningsState {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  extras: ExtrasBreakdown;
  batterStats: Record<string, BatterStats>;
  bowlerStats: Record<string, BowlerStats>;
  fallOfWickets: FallOfWicket[];
  partnerships: Partnership[];
  deliveries: DeliveryEvent[];
  currentStrikerId: string;
  currentNonStrikerId: string;
  currentBowlerId: string;
  retiredHurtIds: string[];
  battingOrder: string[];  // player ids in batting order
  status: 'active' | 'completed';
  target?: number;
  completionReason?: 'all_out' | 'overs_complete' | 'target_reached' | 'manual' | 'declared';
  completedAt?: string;
}

export interface MatchStateSnapshot {
  innings: InningsState[];
  currentInningsIndex: number;
  status: MatchStatus;
  result?: MatchResult;
  snapshotAt: string;
}

export interface MatchResult {
  winner?: 'teamA' | 'teamB' | 'tie' | 'draw' | 'no_result';
  winnerName?: string;
  margin?: string;
  resultText: string;
}

export interface MatchState {
  config: MatchConfig;
  innings: InningsState[];
  currentInningsIndex: number;
  status: MatchStatus;
  result?: MatchResult;
  history: MatchStateSnapshot[];
}

// ============================================================
// Scoring Actions (UI → Engine)
// ============================================================

export type ScoringAction =
  | { type: 'NORMAL_DELIVERY'; runs: number; isBoundary?: boolean; boundaryType?: 4 | 6 }
  | { type: 'WIDE'; additionalRuns?: number; dismissal?: DismissalInfo }
  | { type: 'NO_BALL'; batterRuns?: number; extraType?: 'bye' | 'leg_bye'; extraRuns?: number; dismissal?: DismissalInfo }
  | { type: 'BYE'; runs: number }
  | { type: 'LEG_BYE'; runs: number }
  | { type: 'PENALTY'; runs: number }
  | { type: 'WICKET'; dismissal: DismissalInfo; runs?: number }
  | { type: 'ADD_BATTER'; batterId: string; newPlayerName?: string }
  | { type: 'UPDATE_PLAYER_NAME'; playerId: string; newName: string }
  | { type: 'ADD_BOWLER'; bowlerId: string; bowlerName: string }
  | { type: 'RETIRED_HURT'; batterId: string; replacementId: string }
  | { type: 'CHANGE_BOWLER'; bowlerId: string }
  | { type: 'SWAP_BATTERS' }
  | { type: 'EDIT_DELIVERY'; deliveryId: string; updatedDelivery: Partial<DeliveryEvent> }
  | { type: 'UNDO' }
  | { type: 'END_INNINGS' }
  | { type: 'START_NEXT_INNINGS'; strikerId: string; nonStrikerId: string; bowlerId: string }
  | { type: '_LOAD_STATE'; payload: MatchState };
