import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  RotateCcw, ArrowLeftRight, ChevronLeft, MoreVertical,
  FileText, AlertCircle, RefreshCw, UserMinus, Edit2, Users, Check, UserPlus
} from 'lucide-react';
import { useMatch } from '../hooks/useMatch';
import { Button, Card, SaveStatus, Modal } from '../components/common/index';
import { legalBallsToOverString, calculateCRR, calculateRRR, isAwaitingNextBowler, getMaxOversPerBowler } from '../domain/rules';
import WicketDialog from '../components/scoring/WicketDialog';
import RunOutDialog from '../components/scoring/RunOutDialog';
import ExtrasDialog from '../components/scoring/ExtrasDialog';
import NextBowlerBottomSheet from '../components/scoring/NextBowlerBottomSheet';
import WideBottomSheet from '../components/scoring/WideBottomSheet';
import NewBatterDialog from '../components/scoring/NewBatterDialog';
import RetiredHurtDialog from '../components/scoring/RetiredHurtDialog';
import type { DismissalInfo, InningsState, Player } from '../domain/types';

export default function LiveScoring() {
  const navigate = useNavigate();
  const { state, dispatch, addBatter, updatePlayerName, addBowler, saveStatus } = useMatch();
  const [showWicket, setShowWicket] = useState(false);
  const [showRunOut, setShowRunOut] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [showWideBottomSheet, setShowWideBottomSheet] = useState(false);
  const [showManualBowlerChange, setShowManualBowlerChange] = useState(false);
  const [showNewBatter, setShowNewBatter] = useState(false);
  const [showRetiredHurt, setShowRetiredHurt] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showAllPlayersEdit, setShowAllPlayersEdit] = useState(false);
  const [quickEditPlayer, setQuickEditPlayer] = useState<Player | null>(null);
  const [quickEditName, setQuickEditName] = useState('');
  const [pendingDismissal, setPendingDismissal] = useState<Partial<DismissalInfo> | null>(null);
  const [showInningsBreak, setShowInningsBreak] = useState(false);
  const [showMatchResult, setShowMatchResult] = useState(false);

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }
    if (state.status === 'innings_break') {
      setShowInningsBreak(true);
    } else {
      setShowInningsBreak(false);
    }
    if (state.status === 'completed') {
      setShowMatchResult(true);
    } else {
      setShowMatchResult(false);
    }
  }, [state?.status, state, navigate]);

  if (!state) {
    return (
      <div className="min-h-screen bg-[#F5F9FF] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle size={48} className="text-[#60758A] mx-auto mb-4" />
          <p className="text-[#172B4D] font-semibold mb-4">No active match found</p>
          <Button variant="primary" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const innings = state.innings[state.currentInningsIndex];
  if (!innings) {
    return (
      <div className="min-h-screen bg-[#F5F9FF] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle size={48} className="text-[#60758A] mx-auto mb-4" />
          <p className="text-[#172B4D] font-semibold mb-4">Innings not found</p>
          <Button variant="primary" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const config = state.config;
  const battingTeam = innings.battingTeamId === config.teamA.id ? config.teamA : config.teamB;
  const bowlingTeam = innings.bowlingTeamId === config.teamA.id ? config.teamA : config.teamB;

  const striker = battingTeam.players.find(p => p.id === innings.currentStrikerId);
  const nonStriker = battingTeam.players.find(p => p.id === innings.currentNonStrikerId);
  const bowler = bowlingTeam.players.find(p => p.id === innings.currentBowlerId);

  const legalBalls = innings.legalBalls;
  const maxLegalBalls = config.format.oversPerInnings * 6;
  const ballsRemaining = Math.max(0, maxLegalBalls - legalBalls);
  const crr = calculateCRR(innings.totalRuns, legalBalls);
  const isChasing = state.currentInningsIndex === 1 && innings.target !== undefined;
  const target = innings.target ?? 0;
  const runsNeeded = isChasing ? target - innings.totalRuns : 0;
  const rrr = isChasing ? calculateRRR(runsNeeded, ballsRemaining) : 0;

  // Need new batter?
  const isAllOut = innings.wickets >= config.format.playersPerSide - 1;
  const needsNewBatter = !isAllOut && innings.status === 'active' && (!innings.currentStrikerId || !innings.currentNonStrikerId);

  const strikerStats = innings.batterStats[innings.currentStrikerId];
  const nonStrikerStats = innings.batterStats[innings.currentNonStrikerId];
  const bowlerStats = innings.bowlerStats[innings.currentBowlerId];

  // Current over deliveries
  const currentOverNumber = Math.floor(legalBalls / 6);
  const currentOverDeliveries = innings.deliveries.filter(d => d.overNumber === currentOverNumber);

  // Check if an over just completed and bowler for next over must be chosen
  const isWaitingForBowler = isAwaitingNextBowler(innings, config.format.oversPerInnings, isAllOut);
  const maxOversPerBowler = getMaxOversPerBowler(config.format);
  const showAutoBowlerBottomSheet = isWaitingForBowler && !needsNewBatter;

  function handleRun(runs: number, isBoundary = false) {
    if (needsNewBatter) { setShowNewBatter(true); return; }
    if (isWaitingForBowler) { return; }
    dispatch({ type: 'NORMAL_DELIVERY', runs, isBoundary, boundaryType: runs === 4 ? 4 : runs === 6 ? 6 : undefined });
  }

  function handleWideClick() {
    if (needsNewBatter) { setShowNewBatter(true); return; }
    if (isWaitingForBowler) { return; }
    setShowWideBottomSheet(true);
  }

  function handleWideConfirm(additionalRuns: number, dismissal?: DismissalInfo) {
    setShowWideBottomSheet(false);
    dispatch({ type: 'WIDE', additionalRuns, dismissal });
    if (dismissal) {
      const willBeAllOut = innings.wickets + 1 >= config.format.playersPerSide - 1;
      if (!willBeAllOut) setShowNewBatter(true);
    }
  }

  function handleWicketConfirm(dismissal: DismissalInfo) {
    setShowWicket(false);
    if (dismissal.type === 'run_out') {
      setPendingDismissal(dismissal);
      setShowRunOut(true);
    } else {
      dispatch({ type: 'WICKET', dismissal, runs: 0 });
      const willBeAllOut = innings.wickets + 1 >= config.format.playersPerSide - 1;
      if (!willBeAllOut) setShowNewBatter(true);
    }
  }

  function handleRunOutConfirm(dismissal: DismissalInfo, runs: number) {
    setShowRunOut(false);
    setPendingDismissal(null);
    dispatch({ type: 'WICKET', dismissal, runs });
    const willBeAllOut = innings.wickets + 1 >= config.format.playersPerSide - 1;
    if (!willBeAllOut) setShowNewBatter(true);
  }

  function handleUndo() {
    dispatch({ type: 'UNDO' });
  }

  function handleStartNextInnings(strikerId: string, nonStrikerId: string, bowlerId: string) {
    setShowInningsBreak(false);
    dispatch({ type: 'START_NEXT_INNINGS', strikerId, nonStrikerId, bowlerId });
  }

  function openQuickEdit(player: Player) {
    setQuickEditPlayer(player);
    setQuickEditName(player.name);
  }

  function saveQuickEdit() {
    if (quickEditPlayer && quickEditName.trim()) {
      updatePlayerName(quickEditPlayer.id, quickEditName.trim());
      setQuickEditPlayer(null);
      setQuickEditName('');
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF] flex flex-col pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0D47A1] text-white px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Go home"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center justify-center gap-2 flex-1 mx-2 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Logo"
              className="w-7 h-7 object-contain rounded-md drop-shadow-sm flex-shrink-0"
            />
            <div className="text-center min-w-0">
              <p className="text-xs font-medium text-blue-200 uppercase tracking-wider truncate">
                {config.title} · Innings {innings.inningsNumber}
              </p>
              <p className="text-sm font-bold truncate">{battingTeam.name} batting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatus status={saveStatus} />
            <button
              onClick={() => setShowMore(true)}
              className="p-2 rounded-lg hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="More options"
            >
              <MoreVertical size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Main score card */}
        <Card className="p-5 bg-gradient-to-br from-[#1565C0] to-[#0D47A1] text-white border-0 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">{battingTeam.name}</p>
              <p className="text-5xl sm:text-6xl font-extrabold tabular-nums leading-none mt-1">
                {innings.totalRuns}<span className="text-blue-300 text-3xl sm:text-4xl">/{innings.wickets}</span>
              </p>
              <p className="text-blue-200 text-sm mt-1 font-medium">
                {legalBallsToOverString(legalBalls)} / {config.format.oversPerInnings} overs
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs font-medium">CRR</p>
              <p className="text-xl font-bold tabular-nums">{crr.toFixed(2)}</p>
              {isChasing && runsNeeded > 0 && (
                <>
                  <p className="text-blue-200 text-xs font-medium mt-2">TARGET</p>
                  <p className="text-lg font-bold tabular-nums">{target}</p>
                </>
              )}
            </div>
          </div>
          {isChasing && (
            <div className="bg-white/10 rounded-lg px-3 py-2 mt-2">
              {runsNeeded > 0 ? (
                <p className="text-sm font-semibold text-center">
                  Need <span className="text-white font-extrabold">{runsNeeded}</span> from{' '}
                  <span className="text-white font-extrabold">{ballsRemaining}</span> ball{ballsRemaining !== 1 ? 's' : ''} · RRR{' '}
                  <span className="text-white font-extrabold">{rrr === Infinity ? '∞' : rrr.toFixed(2)}</span>
                </p>
              ) : (
                <p className="text-sm font-bold text-center text-green-300">🎉 Target reached!</p>
              )}
            </div>
          )}
        </Card>

        {/* Current over */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-xs font-bold text-[#60758A] whitespace-nowrap flex-shrink-0">
            Over {currentOverNumber + 1}:
          </span>
          <div className="flex gap-1.5 flex-shrink-0">
            {currentOverDeliveries.map((d, i) => {
              const chip = getBallChipInfo(d);
              return (
                <span key={i} className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 ${chip.className}`}>
                  {chip.label}
                </span>
              );
            })}
            {currentOverDeliveries.length === 0 && (
              <span className="text-xs text-[#60758A]">No balls yet</span>
            )}
          </div>
        </div>

        {/* Batters */}
        <Card className="divide-y divide-[#DCE7F5] overflow-hidden">
          <div className="px-4 py-2 bg-[#F5F9FF]">
            <div className="grid grid-cols-6 gap-1 text-[10px] font-bold text-[#60758A] uppercase tracking-wider">
              <span className="col-span-2">Batter</span>
              <span className="text-right">R</span>
              <span className="text-right">B</span>
              <span className="text-right">4s</span>
              <span className="text-right">SR</span>
            </div>
          </div>
          {[
            { player: striker, stats: strikerStats, isStriker: true },
            { player: nonStriker, stats: nonStrikerStats, isStriker: false },
          ].map(({ player, stats, isStriker }) => (
            <div
              key={isStriker ? 'striker' : 'nonstriker'}
              className={`px-4 py-3 grid grid-cols-6 gap-1 items-center ${isStriker ? 'border-l-4 border-l-[#42A5F5] bg-[#E3F2FD]/40' : ''}`}
            >
              <div className="col-span-2 flex items-center gap-1.5 min-w-0">
                {isStriker && <span className="text-[#1565C0] font-bold text-xs flex-shrink-0" aria-label="Current striker">★</span>}
                <span className={`text-sm font-semibold truncate ${isStriker ? 'text-[#172B4D]' : 'text-[#60758A]'}`}>
                  {player?.name ?? (isStriker ? 'Choose Striker' : 'Choose Non-striker')}
                </span>
                {player && (
                  <button
                    type="button"
                    onClick={() => openQuickEdit(player)}
                    className="p-1 text-[#60758A] hover:text-[#1565C0] rounded flex-shrink-0"
                    title="Edit player name"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums text-right">{stats?.runs ?? 0}</span>
              <span className="text-sm tabular-nums text-right text-[#60758A]">{stats?.balls ?? 0}</span>
              <span className="text-sm tabular-nums text-right text-[#60758A]">{stats?.fours ?? 0}</span>
              <span className="text-sm tabular-nums text-right text-[#60758A]">{stats?.strikeRate?.toFixed(0) ?? '0'}</span>
            </div>
          ))}
        </Card>

        {/* Bowler */}
        <Card className="px-4 py-3">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#DCE7F5]">
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <div>
                <p className="text-[10px] font-bold text-[#60758A] uppercase tracking-wider mb-0.5">Current Bowler</p>
                <p className="text-sm font-bold text-[#172B4D] truncate">{bowler?.name ?? '—'}</p>
              </div>
              {bowler && (
                <button
                  type="button"
                  onClick={() => openQuickEdit(bowler)}
                  className="p-1 text-[#60758A] hover:text-[#1565C0] rounded mt-2"
                  title="Edit bowler name"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {config.format.maxOversPerBowler > 0 && (
                <span className="text-xs bg-[#E3F2FD] text-[#1565C0] font-semibold px-2 py-0.5 rounded-full">
                  Quota: {Math.max(0, config.format.maxOversPerBowler - Math.floor((bowlerStats?.legalBalls ?? 0) / 6))} ov left
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowManualBowlerChange(true)}
                className="text-xs bg-white border border-[#1565C0] text-[#1565C0] hover:bg-[#E3F2FD] font-bold px-2 py-0.5 rounded-full min-h-[26px]"
              >
                Change
              </button>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            {[
              { label: 'O', value: legalBallsToOverString(bowlerStats?.legalBalls ?? 0) },
              { label: 'M', value: String(bowlerStats?.maidens ?? 0) },
              { label: 'R', value: String(bowlerStats?.runs ?? 0) },
              { label: 'W', value: String(bowlerStats?.wickets ?? 0) },
              { label: 'ECON', value: (bowlerStats?.economy ?? 0).toFixed(2) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-bold text-[#60758A] uppercase">{label}</p>
                <p className="text-sm font-bold tabular-nums text-[#172B4D]">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Over Complete Banner */}
        {isWaitingForBowler && (
          <div className="bg-[#E3F2FD] border-2 border-[#1565C0] rounded-xl p-3.5 flex items-center justify-between shadow-sm animate-pulse">
            <div>
              <p className="text-xs font-bold text-[#1565C0] uppercase tracking-wider">Over Complete</p>
              <p className="text-sm font-bold text-[#172B4D]">Select bowler for Over {currentOverNumber + 1}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowManualBowlerChange(true)}>
              Choose Bowler
            </Button>
          </div>
        )}

        {/* Scoring keypad */}
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => handleRun(r)}
                className="aspect-square flex items-center justify-center text-2xl font-extrabold
                  bg-white border-2 border-[#DCE7F5] rounded-xl text-[#172B4D]
                  hover:border-[#1565C0] hover:bg-[#E3F2FD] active:bg-[#BBDEFB]
                  transition-colors min-h-[60px] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#42A5F5]"
                aria-label={`${r} run${r !== 1 ? 's' : ''}`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[4, 5, 6].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => handleRun(r, r === 4 || r === 6)}
                className={`aspect-square flex items-center justify-center text-2xl font-extrabold rounded-xl
                  transition-colors min-h-[60px] select-none focus:outline-none focus-visible:ring-2
                  ${r === 4 || r === 6
                    ? 'bg-white border-2 border-[#16803C] text-[#16803C] hover:bg-[#EBF7EE] active:bg-green-200 focus-visible:ring-green-400'
                    : 'bg-white border-2 border-[#DCE7F5] text-[#172B4D] hover:border-[#1565C0] hover:bg-[#E3F2FD] active:bg-[#BBDEFB] focus-visible:ring-[#42A5F5]'
                  }`}
                aria-label={`${r} run${r !== 1 ? 's' : ''}${r === 4 || r === 6 ? ' (boundary)' : ''}`}
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={handleWideClick}
              className="aspect-square flex flex-col items-center justify-center rounded-xl
                bg-[#EBF5FE] border-2 border-[#2196F3] text-[#0D47A1] hover:bg-[#D8ECFE] active:bg-[#BBDEFB]
                transition-colors min-h-[60px] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#42A5F5]"
              aria-label="Record wide delivery"
            >
              <span className="text-base sm:text-lg font-black tracking-wider">WIDE</span>
              <span className="text-[10px] font-bold text-[#1976D2] opacity-80">+runs</span>
            </button>
          </div>
        </div>

        {/* Action buttons row: WICKET, EXTRAS, UNDO, MORE */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (needsNewBatter) { setShowNewBatter(true); return; }
              if (isWaitingForBowler) { return; }
              setShowWicket(true);
            }}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[#D32F2F] text-white
              hover:bg-[#B71C1C] active:bg-[#B71C1C] transition-colors min-h-[58px]
              font-bold text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label="Record wicket"
          >
            <span className="text-base">⚾</span>
            <span>WICKET</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (needsNewBatter) { setShowNewBatter(true); return; }
              if (isWaitingForBowler) { return; }
              setShowExtras(true);
            }}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-amber-500 text-white
              hover:bg-amber-600 active:bg-amber-700 transition-colors min-h-[58px]
              font-bold text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Record extras"
          >
            <span className="text-base font-extrabold">+</span>
            <span>EXTRAS</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={state.history.length === 0}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl bg-[#60758A] text-white
              hover:bg-[#172B4D] active:bg-[#172B4D] transition-colors min-h-[58px]
              font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60758A]"
            aria-label="Undo last delivery"
          >
            <RotateCcw size={16} />
            <span>UNDO</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl
              bg-[#E3F2FD] border-2 border-[#DCE7F5] text-[#1565C0]
              hover:bg-[#BBDEFB] active:bg-[#BBDEFB]
              transition-colors min-h-[58px] font-bold text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#42A5F5]"
            aria-label="More options"
          >
            <MoreVertical size={16} />
            <span>MORE</span>
          </button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setShowManualBowlerChange(true)} size="sm" fullWidth>
            <RefreshCw size={14} className="mr-1.5" />
            Change Bowler
          </Button>
          <Button variant="secondary" onClick={() => dispatch({ type: 'SWAP_BATTERS' })} size="sm" fullWidth>
            <ArrowLeftRight size={14} className="mr-1.5" />
            Swap Batters
          </Button>
        </div>

        {/* View scorecard */}
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={() => navigate(`/scorecard/${config.id}`)}
          className="text-[#60758A]"
        >
          <FileText size={16} className="mr-2" />
          View Complete Scorecard
        </Button>
      </div>

      {/* Dialogs */}
      <WicketDialog
        isOpen={showWicket}
        onClose={() => setShowWicket(false)}
        onConfirm={handleWicketConfirm}
        innings={innings}
        battingTeam={battingTeam}
        bowlingTeam={bowlingTeam}
      />

      {showRunOut && (
        <RunOutDialog
          isOpen={showRunOut}
          onClose={() => { setShowRunOut(false); setPendingDismissal(null); }}
          onConfirm={handleRunOutConfirm}
          innings={innings}
          battingTeam={battingTeam}
        />
      )}

      <ExtrasDialog
        isOpen={showExtras}
        onClose={() => setShowExtras(false)}
        onConfirm={(action) => { setShowExtras(false); dispatch(action); }}
        innings={innings}
        battingTeam={battingTeam}
        bowlingTeam={bowlingTeam}
      />

      <WideBottomSheet
        isOpen={showWideBottomSheet}
        onClose={() => setShowWideBottomSheet(false)}
        onConfirm={handleWideConfirm}
        striker={striker}
        nonStriker={nonStriker}
      />

      <NextBowlerBottomSheet
        isOpen={showAutoBowlerBottomSheet || showManualBowlerChange}
        onClose={() => setShowManualBowlerChange(false)}
        onConfirm={(bowlerId) => {
          setShowManualBowlerChange(false);
          dispatch({ type: 'CHANGE_BOWLER', bowlerId });
        }}
        innings={innings}
        bowlingTeam={bowlingTeam}
        maxOversPerBowler={maxOversPerBowler}
        onAddBowler={addBowler}
        onUpdatePlayerName={updatePlayerName}
        onUndo={handleUndo}
        isManualChange={showManualBowlerChange && !isWaitingForBowler}
      />

      <NewBatterDialog
        isOpen={showNewBatter || needsNewBatter}
        onConfirm={(batterId, newName) => {
          addBatter(batterId, newName);
          setShowNewBatter(false);
        }}
        innings={innings}
        battingTeam={battingTeam}
        onUpdatePlayerName={updatePlayerName}
      />

      <RetiredHurtDialog
        isOpen={showRetiredHurt}
        onClose={() => setShowRetiredHurt(false)}
        onConfirm={(batterId, replacementId) => {
          setShowRetiredHurt(false);
          dispatch({ type: 'RETIRED_HURT', batterId, replacementId });
        }}
        innings={innings}
        battingTeam={battingTeam}
      />

      {/* Innings Break Modal */}
      {showInningsBreak && state.innings[0] && (
        <InningsBreakModal
          innings1={state.innings[0]}
          config={config}
          onStart={handleStartNextInnings}
          bowlingTeam={bowlingTeam}
          battingTeam={battingTeam}
          onAddPlayer={(teamId, player) => {
            if (teamId === config.teamA.id) {
              config.teamA.players.push(player);
            } else {
              config.teamB.players.push(player);
            }
          }}
        />
      )}

      {/* Match Result Modal */}
      {showMatchResult && state.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D47A1]/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-4">🏆</p>
            <h2 className="text-2xl font-extrabold text-[#172B4D] mb-2">Match Finished!</h2>
            <p className="text-lg font-bold text-[#1565C0] mb-4">{state.result.resultText}</p>
            <div className="space-y-2">
              <Button variant="primary" fullWidth onClick={() => navigate(`/scorecard/${config.id}`)}>
                View Scorecard
              </Button>
              <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Edit Single Player Modal */}
      {quickEditPlayer && (
        <Modal
          isOpen={true}
          onClose={() => setQuickEditPlayer(null)}
          title={`Edit Player Name`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#60758A]">
              Correcting this name updates it across all live scores, statistics, and history without affecting any runs or balls.
            </p>
            <div>
              <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
                Player Name
              </label>
              <input
                type="text"
                value={quickEditName}
                onChange={e => setQuickEditName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveQuickEdit()}
                className="input-field"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setQuickEditPlayer(null)} fullWidth>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveQuickEdit} disabled={!quickEditName.trim()} fullWidth>
                Save Name
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full Squad Name Editor Modal */}
      {showAllPlayersEdit && (
        <AllPlayersEditModal
          isOpen={showAllPlayersEdit}
          onClose={() => setShowAllPlayersEdit(false)}
          teamA={config.teamA}
          teamB={config.teamB}
          innings={innings}
          onUpdateName={updatePlayerName}
        />
      )}

      {/* More Menu Bottom Sheet */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <Card className="relative w-full max-w-lg mx-4 mb-4 p-2 shadow-2xl">
            <div className="space-y-1">
              {[
                { label: 'View Scorecard', icon: FileText, action: () => { setShowMore(false); navigate(`/scorecard/${config.id}`); } },
                { label: 'Edit Player Names', icon: Users, action: () => { setShowMore(false); setShowAllPlayersEdit(true); } },
                { label: 'Swap Batters End', icon: ArrowLeftRight, action: () => { setShowMore(false); dispatch({ type: 'SWAP_BATTERS' }); } },
                { label: 'Batter Retired Hurt', icon: UserMinus, action: () => { setShowMore(false); setShowRetiredHurt(true); } },
                { label: 'End Innings Manually', icon: AlertCircle, action: () => { setShowMore(false); dispatch({ type: 'END_INNINGS' }); }, danger: true },
              ].map(({ label, icon: Icon, action, danger }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-semibold text-sm min-h-[52px] transition-colors
                    ${danger ? 'text-red-600 hover:bg-red-50' : 'text-[#172B4D] hover:bg-[#F5F9FF]'}`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function getBallChipInfo(d: any): { label: string; className: string } {
  if (d.dismissal) return { label: 'W', className: 'bg-[#D32F2F] text-white' };
  if (d.deliveryType === 'wide') return { label: `Wd${d.extras > 1 ? '+' + (d.extras - 1) : ''}`, className: 'bg-amber-100 text-amber-800 text-[10px]' };
  if (d.deliveryType === 'no_ball') return { label: 'Nb', className: 'bg-orange-100 text-orange-800 text-[10px]' };
  if (d.batterRuns === 4) return { label: '4', className: 'bg-[#EBF7EE] text-[#16803C] border border-[#16803C] font-extrabold' };
  if (d.batterRuns === 6) return { label: '6', className: 'bg-[#16803C] text-white font-extrabold' };
  if (d.totalRuns === 0) return { label: '·', className: 'bg-[#E3F2FD] text-[#60758A]' };
  return { label: String(d.totalRuns), className: 'bg-white text-[#172B4D] border border-[#DCE7F5]' };
}

function AllPlayersEditModal({
  isOpen, onClose, teamA, teamB, innings, onUpdateName,
}: {
  isOpen: boolean;
  onClose: () => void;
  teamA: any;
  teamB: any;
  innings: InningsState;
  onUpdateName: (id: string, name: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const currentTeam = activeTab === 'A' ? teamA : teamB;

  function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    onUpdateName(id, trimmed);
    setEditingId(null);
  }

  function getStatusLabel(playerId: string) {
    if (playerId === innings.currentStrikerId) return 'Striker ★';
    if (playerId === innings.currentNonStrikerId) return 'Non-Striker';
    if (playerId === innings.currentBowlerId) return 'Bowler ⚾';
    const bStat = innings.batterStats[playerId];
    if (bStat?.isOut) return 'Dismissed';
    if (bStat?.isRetiredHurt) return 'Retired Hurt';
    if (bStat?.didBat) return 'Batted';
    return 'Bench';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Player Names" size="md">
      <div className="space-y-4">
        <p className="text-xs text-[#60758A]">
          Edit any player's name (batters, bowlers, dismissed, or bench). All statistics are safely preserved.
        </p>

        {/* Team Selector Tabs */}
        <div className="flex gap-1 bg-[#E3F2FD] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('A')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px]
              ${activeTab === 'A' ? 'bg-white text-[#1565C0] shadow-sm' : 'text-[#60758A]'}`}
          >
            {teamA.name} ({teamA.players.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('B')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors min-h-[40px]
              ${activeTab === 'B' ? 'bg-white text-[#1565C0] shadow-sm' : 'text-[#60758A]'}`}
          >
            {teamB.name} ({teamB.players.length})
          </button>
        </div>

        {/* Players List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {currentTeam.players.map((p: Player) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-xl border border-[#DCE7F5] bg-white min-h-[52px]"
            >
              {editingId === p.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                    className="flex-1 text-sm border border-[#1565C0] rounded px-2.5 py-1.5 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(p.id)}
                    className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-[#60758A] px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="truncate flex-1">
                    <p className="font-semibold text-sm text-[#172B4D] truncate">{p.name}</p>
                    <p className="text-[10px] text-[#60758A]">{getStatusLabel(p.id)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                    }}
                    className="p-2 text-[#60758A] hover:text-[#1565C0] rounded-lg hover:bg-[#F5F9FF]"
                    title="Edit name"
                  >
                    <Edit2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <Button variant="primary" fullWidth onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

function InningsBreakModal({
  innings1, config, onStart, bowlingTeam, battingTeam, onAddPlayer,
}: {
  innings1: InningsState;
  config: any;
  onStart: (s: string, ns: string, b: string) => void;
  bowlingTeam: any;
  battingTeam: any;
  onAddPlayer: (teamId: string, player: Player) => void;
}) {
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [targetTeamAdd, setTargetTeamAdd] = useState<'bat' | 'bowl'>('bat');

  const newBattingTeam = bowlingTeam;
  const newBowlingTeam = battingTeam;
  const target = innings1.totalRuns + 1;
  const canStart = Boolean(striker && nonStriker && bowler && striker !== nonStriker);

  function handleAddNew() {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    const team = targetTeamAdd === 'bat' ? newBattingTeam : newBowlingTeam;
    const newP: Player = {
      id: uuidv4(),
      name: trimmed,
      isCaptain: false,
      isWicketkeeper: false,
    };
    onAddPlayer(team.id, newP);
    setNewPlayerName('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D47A1]/50 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-extrabold text-[#172B4D] mb-1">Innings Break</h2>
        <p className="text-sm text-[#60758A] mb-4">
          {innings1.battingTeamId === config.teamA.id ? config.teamA.name : config.teamB.name} scored{' '}
          <strong>{innings1.totalRuns}/{innings1.wickets}</strong> in {legalBallsToOverString(innings1.legalBalls)} overs.
        </p>
        <div className="bg-[#E3F2FD] rounded-lg p-3 mb-5 text-center">
          <p className="text-sm font-bold text-[#1565C0]">
            {newBattingTeam.name} needs {target} runs to win
          </p>
        </div>

        {/* Quick add player if needed */}
        <div className="bg-[#F5F9FF] border border-[#DCE7F5] p-3 rounded-xl mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-bold text-[#60758A] uppercase">Add New Player</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetTeamAdd('bat')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${targetTeamAdd === 'bat' ? 'bg-[#1565C0] text-white' : 'text-[#60758A]'}`}
              >
                {newBattingTeam.name}
              </button>
              <button
                type="button"
                onClick={() => setTargetTeamAdd('bowl')}
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${targetTeamAdd === 'bowl' ? 'bg-[#1565C0] text-white' : 'text-[#60758A]'}`}
              >
                {newBowlingTeam.name}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNew()}
              placeholder="Player name..."
              className="flex-1 input-field"
            />
            <Button variant="secondary" size="sm" onClick={handleAddNew} disabled={!newPlayerName.trim()}>
              <UserPlus size={14} className="mr-1" /> Add
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-[#172B4D] block mb-2">Opening Striker ({newBattingTeam.name})</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {newBattingTeam.players.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setStriker(p.id); if (nonStriker === p.id) setNonStriker(''); }}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm font-medium min-h-[48px] transition-colors
                    ${striker === p.id ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]' : 'border-[#DCE7F5] hover:border-[#1565C0]'}`}
                >
                  {p.name} {striker === p.id && '★'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-[#172B4D] block mb-2">Opening Non-striker ({newBattingTeam.name})</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {newBattingTeam.players.filter((p: any) => p.id !== striker).map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setNonStriker(p.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm font-medium min-h-[48px] transition-colors
                    ${nonStriker === p.id ? 'border-[#42A5F5] bg-[#E3F2FD]' : 'border-[#DCE7F5] hover:border-[#42A5F5]'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-[#172B4D] block mb-2">Opening Bowler ({newBowlingTeam.name})</label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {newBowlingTeam.players.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setBowler(p.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 text-sm font-medium min-h-[48px] transition-colors
                    ${bowler === p.id ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]' : 'border-[#DCE7F5] hover:border-[#D32F2F]'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <Button variant="primary" fullWidth size="lg" disabled={!canStart} onClick={() => onStart(striker, nonStriker, bowler)}>
            Start 2nd Innings
          </Button>
        </div>
      </Card>
    </div>
  );
}
