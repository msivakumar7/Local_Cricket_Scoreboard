import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, TrendingUp, Edit2 } from 'lucide-react';
import { matchRepository } from '../db/repository';
import type { MatchState, InningsState, BatterStats, BowlerStats, DeliveryEvent } from '../domain/types';
import { legalBallsToOverString, calculateCRR } from '../domain/rules';
import { recalculateInnings, updatePlayerName } from '../domain/engine';
import { Button, Card, TabStrip, Badge, Modal } from '../components/common/index';
import { generateMatchPDF } from '../services/pdfService';
import { useMatch } from '../hooks/useMatch';
import EditDeliveryDialog from '../components/scorecard/EditDeliveryDialog';

export default function Scorecard() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { state: liveState, dispatch } = useMatch();
  const [state, setState] = useState<MatchState | null>(null);
  const [activeInnings, setActiveInnings] = useState(0);
  const [loading, setLoading] = useState(true);

  // Player name editing state
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');

  useEffect(() => {
    if (id) {
      matchRepository.getById(id).then(m => {
        if (m) setState(m.state);
        setLoading(false);
      });
    } else if (liveState) {
      setState(liveState);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id, liveState]);

  async function handleEditDelivery(deliveryId: string, updated: Partial<DeliveryEvent>) {
    if (!state) return;
    if (liveState && liveState.config.id === state.config.id) {
      dispatch({ type: 'EDIT_DELIVERY', deliveryId, updatedDelivery: updated });
    } else {
      const inningsToUpdate = state.innings[activeInnings];
      const deliveryIndex = inningsToUpdate.deliveries.findIndex(d => d.id === deliveryId);
      if (deliveryIndex === -1) return;

      const updatedDeliveries = [...inningsToUpdate.deliveries];
      updatedDeliveries[deliveryIndex] = {
        ...updatedDeliveries[deliveryIndex],
        ...updated,
      };

      const updatedInnings = recalculateInnings(
        { ...inningsToUpdate, deliveries: updatedDeliveries },
        state.config
      );

      const newInningsList = state.innings.map((inn, idx) =>
        idx === activeInnings ? updatedInnings : inn
      );

      const updatedState: MatchState = {
        ...state,
        innings: newInningsList,
      };

      await matchRepository.save(updatedState);
      setState(updatedState);
    }
  }

  async function handleUpdatePlayerName(playerId: string, newName: string) {
    if (!state) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    if (liveState && liveState.config.id === state.config.id) {
      dispatch({ type: 'UPDATE_PLAYER_NAME', playerId, newName: trimmed });
    } else {
      const updatedState = updatePlayerName(state, playerId, trimmed);
      await matchRepository.save(updatedState);
      setState(updatedState);
    }
    setEditPlayerId(null);
  }

  if (loading) return <div className="min-h-screen bg-[#F5F9FF] flex items-center justify-center"><p className="text-[#60758A]">Loading scorecard…</p></div>;
  if (!state) return (
    <div className="min-h-screen bg-[#F5F9FF] flex items-center justify-center flex-col gap-4">
      <p className="text-[#60758A]">Match not found.</p>
      <Button variant="primary" onClick={() => navigate('/')}>Home</Button>
    </div>
  );

  const config = state.config;
  const innings = state.innings;

  function getTeamName(teamId: string) {
    return teamId === config.teamA.id ? config.teamA.name : config.teamB.name;
  }

  function getPlayerName(teamId: string, playerId: string) {
    const team = teamId === config.teamA.id ? config.teamA : config.teamB;
    return team.players.find(p => p.id === playerId)?.name ?? playerId;
  }

  const tabsConfig = innings.map((inn, i) => ({
    id: String(i),
    label: `${getTeamName(inn.battingTeamId)} (Inn ${i + 1})`,
  }));

  return (
    <div className="min-h-screen bg-[#F5F9FF] pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#DCE7F5] px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-[#F5F9FF] min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Back"
            >
              <ChevronLeft size={22} className="text-[#60758A]" />
            </button>
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Logo"
              className="w-8 h-8 object-contain rounded-lg drop-shadow-sm flex-shrink-0 mr-1"
            />
            <div>
              <h1 className="text-base font-bold text-[#172B4D]">Scorecard</h1>
              <p className="text-xs text-[#60758A]">{config.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/analysis/${id ?? config.id}`)}
              className="p-2 rounded-lg hover:bg-[#E3F2FD] text-[#1565C0] min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Analysis"
              title="Analysis"
            >
              <TrendingUp size={20} />
            </button>
            <button
              onClick={() => generateMatchPDF(state)}
              className="p-2 rounded-lg hover:bg-[#E3F2FD] text-[#1565C0] min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Download PDF"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Match summary card */}
        <Card className="p-4 mb-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-extrabold text-[#172B4D] text-lg">{config.teamA.name} vs {config.teamB.name}</p>
              <p className="text-xs text-[#60758A]">{config.format.oversPerInnings}ov · {config.venue ? `${config.venue} · ` : ''}{new Date(config.date).toLocaleDateString()}</p>
            </div>
            {state.result && (
              <Badge color="blue">{state.result.resultText}</Badge>
            )}
          </div>
          <p className="text-xs text-[#60758A] mt-2">
            Toss: <strong>{getTeamName(config.tossWinnerId)}</strong> won and chose to <strong>{config.tossDecision}</strong>
          </p>
        </Card>

        {/* Innings tabs */}
        {innings.length > 1 && (
          <div className="mb-4">
            <TabStrip
              tabs={tabsConfig}
              activeTab={String(activeInnings)}
              onTabChange={(idStr) => setActiveInnings(Number(idStr))}
            />
          </div>
        )}

        {innings.length > 0 && innings[activeInnings] && (
          <InningsScorecard
            innings={innings[activeInnings]}
            config={config}
            getTeamName={getTeamName}
            getPlayerName={getPlayerName}
            onEditDelivery={handleEditDelivery}
            onEditPlayer={(pId, currentName) => {
              setEditPlayerId(pId);
              setEditPlayerName(currentName);
            }}
          />
        )}

        {innings.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-[#60758A]">No innings data recorded yet.</p>
          </Card>
        )}
      </div>

      {/* Edit Player Name Modal */}
      {editPlayerId && (
        <Modal
          isOpen={true}
          onClose={() => setEditPlayerId(null)}
          title="Edit Player Name"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#60758A]">
              Update player name across the scorecard, batting records, bowling records, and falls of wickets.
            </p>
            <div>
              <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
                Player Name
              </label>
              <input
                type="text"
                value={editPlayerName}
                onChange={e => setEditPlayerName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleUpdatePlayerName(editPlayerId, editPlayerName);
                  }
                }}
                className="input-field"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditPlayerId(null)} fullWidth>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleUpdatePlayerName(editPlayerId, editPlayerName)}
                disabled={!editPlayerName.trim()}
                fullWidth
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InningsScorecard({
  innings, config, getTeamName, getPlayerName, onEditDelivery, onEditPlayer,
}: {
  innings: InningsState;
  config: any;
  getTeamName: (id: string) => string;
  getPlayerName: (teamId: string, playerId: string) => string;
  onEditDelivery: (deliveryId: string, updated: Partial<DeliveryEvent>) => void;
  onEditPlayer: (playerId: string, currentName: string) => void;
}) {
  const crr = calculateCRR(innings.totalRuns, innings.legalBalls);

  // Batters ordered
  const batters: BatterStats[] = [];
  const addedIds = new Set<string>();

  innings.battingOrder.forEach(id => {
    if (innings.batterStats[id]) {
      batters.push(innings.batterStats[id]);
      addedIds.add(id);
    }
  });

  Object.values(innings.batterStats).forEach(b => {
    if (!addedIds.has(b.playerId)) {
      batters.push(b);
      addedIds.add(b.playerId);
    }
  });

  // Bowlers ordered by appearance
  const bowlerOrder = [...new Set(innings.deliveries.map(d => d.bowlerId))];
  const bowlers = bowlerOrder.map(id => innings.bowlerStats[id]).filter(Boolean) as BowlerStats[];

  function getBatterName(id: string) {
    return getPlayerName(innings.battingTeamId, id);
  }
  function getBowlerName(id: string) {
    return getPlayerName(innings.bowlingTeamId, id);
  }

  return (
    <div className="space-y-5">
      {/* Innings header */}
      <Card className="p-4 bg-gradient-to-r from-[#1565C0] to-[#0D47A1] text-white border-0 shadow-md">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">
          {getTeamName(innings.battingTeamId)} — Innings {innings.inningsNumber}
        </p>
        <div className="flex items-end gap-4">
          <p className="text-4xl font-extrabold tabular-nums">
            {innings.totalRuns}/{innings.wickets}
          </p>
          <div>
            <p className="text-blue-200 text-sm">{legalBallsToOverString(innings.legalBalls)} / {config.format.oversPerInnings} overs</p>
            <p className="text-blue-200 text-sm">CRR {crr.toFixed(2)}</p>
          </div>
        </div>
        {innings.target && (
          <p className="text-blue-200 text-sm mt-1">Target: {innings.target}</p>
        )}
      </Card>

      {/* Batting scorecard */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5] flex justify-between items-center">
          <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Batting</p>
          <span className="text-[10px] text-[#1565C0] font-semibold">Tap ✎ to edit names</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#DCE7F5]">
                <th className="text-left px-4 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-36">Batter</th>
                <th className="text-left px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider">Dismissal</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-8">R</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-8">B</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-8">4s</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-8">6s</th>
                <th className="text-right px-4 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-12">SR</th>
              </tr>
            </thead>
            <tbody>
              {batters.map((b, idx) => (
                <tr key={b.playerId} className={`border-b border-[#DCE7F5] last:border-0 ${b.playerId === innings.currentStrikerId ? 'bg-[#E3F2FD]/50' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FF]/50'}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {b.playerId === innings.currentStrikerId && <span className="text-[#1565C0] text-xs" aria-label="Current striker">★</span>}
                      <span className="text-sm font-semibold text-[#172B4D] truncate max-w-[120px]">{getBatterName(b.playerId)}</span>
                      <button
                        type="button"
                        onClick={() => onEditPlayer(b.playerId, getBatterName(b.playerId))}
                        className="p-1 text-[#60758A] hover:text-[#1565C0] rounded"
                        title="Edit name"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-[#60758A] max-w-[150px]">
                    {b.isRetiredHurt ? 'retired hurt' : b.isOut ? (b.dismissalText || 'out') : !b.didBat ? 'did not bat' : 'not out'}
                  </td>
                  <td className="px-2 py-2.5 text-right text-sm font-bold tabular-nums text-[#172B4D]">{b.didBat ? b.runs : '—'}</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.didBat ? b.balls : '—'}</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.didBat ? b.fours : '—'}</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.didBat ? b.sixes : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.didBat ? b.strikeRate.toFixed(0) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Extras breakdown */}
        <div className="border-t border-[#DCE7F5] px-4 py-2.5 bg-[#F5F9FF]">
          <div className="flex items-center justify-between text-xs text-[#60758A]">
            <span>
              Extras: <strong className="text-[#172B4D]">{innings.extras.total}</strong>
              {' '}(W {innings.extras.wides}, NB {innings.extras.noBalls}, B {innings.extras.byes}, LB {innings.extras.legByes}{innings.extras.penalties ? `, P ${innings.extras.penalties}` : ''})
            </span>
          </div>
        </div>
        {/* Total row */}
        <div className="px-4 py-3 border-t border-[#DCE7F5] bg-white">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-[#172B4D]">Total</span>
            <span className="font-extrabold text-[#172B4D] text-lg tabular-nums">
              {innings.totalRuns}/{innings.wickets} ({legalBallsToOverString(innings.legalBalls)} ov)
            </span>
          </div>
        </div>
      </Card>

      {/* Fall of wickets */}
      {innings.fallOfWickets.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5]">
            <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Fall of Wickets</p>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {innings.fallOfWickets.map(fow => (
              <div key={fow.wicketNumber} className="bg-[#F5F9FF] border border-[#DCE7F5] rounded-lg px-3 py-2 text-center min-w-[90px]">
                <p className="text-xs font-bold text-[#1565C0]">{fow.wicketNumber}-{fow.score}</p>
                <p className="text-xs font-semibold text-[#172B4D] truncate max-w-[110px]">{getBatterName(fow.batterId)}</p>
                <p className="text-[10px] text-[#60758A]">{fow.overText} ov</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Partnerships */}
      {innings.partnerships.filter(p => p.runs > 0 || p.isActive).length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5]">
            <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Partnerships</p>
          </div>
          <div className="divide-y divide-[#DCE7F5]">
            {innings.partnerships.filter(p => p.runs > 0 || p.isActive).map((p, idx) => (
              <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#172B4D] truncate">
                    {getBatterName(p.batterAId)} & {getBatterName(p.batterBId)}
                  </p>
                  {p.isActive && <Badge color="green">Active</Badge>}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold tabular-nums text-[#172B4D]">{p.runs} runs</p>
                  <p className="text-xs text-[#60758A] tabular-nums">{p.balls} balls</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bowling scorecard */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5] flex justify-between items-center">
          <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Bowling</p>
          <span className="text-[10px] text-[#1565C0] font-semibold">Tap ✎ to edit names</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[#DCE7F5]">
                <th className="text-left px-4 py-2 text-[10px] font-bold text-[#60758A] uppercase tracking-wider w-36">Bowler</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase w-10">O</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase w-8">M</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase w-8">R</th>
                <th className="text-right px-2 py-2 text-[10px] font-bold text-[#60758A] uppercase w-8">W</th>
                <th className="text-right px-4 py-2 text-[10px] font-bold text-[#60758A] uppercase w-14">ECON</th>
              </tr>
            </thead>
            <tbody>
              {bowlers.map((b, idx) => (
                <tr key={b.playerId} className={`border-b border-[#DCE7F5] last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F5F9FF]/50'}`}>
                  <td className="px-4 py-2.5 text-sm font-semibold text-[#172B4D] truncate max-w-[130px]">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{getBowlerName(b.playerId)}</span>
                      <button
                        type="button"
                        onClick={() => onEditPlayer(b.playerId, getBowlerName(b.playerId))}
                        className="p-1 text-[#60758A] hover:text-[#1565C0] rounded"
                        title="Edit name"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums">{legalBallsToOverString(b.legalBalls)}</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.maidens}</td>
                  <td className="px-2 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.runs}</td>
                  <td className="px-2 py-2.5 text-right text-sm font-bold tabular-nums text-[#172B4D]">{b.wickets}</td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-[#60758A]">{b.economy.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Over by over summary */}
      <OverByOverView
        innings={innings}
        config={config}
        getBowlerName={getBowlerName}
        onEditDelivery={onEditDelivery}
      />
    </div>
  );
}

function OverByOverView({
  innings,
  config,
  getBowlerName,
  onEditDelivery,
}: {
  innings: InningsState;
  config: any;
  getBowlerName: (id: string) => string;
  onEditDelivery: (deliveryId: string, updated: Partial<DeliveryEvent>) => void;
}) {
  const [editingDelivery, setEditingDelivery] = useState<DeliveryEvent | null>(null);

  const maxOver = Math.floor(innings.legalBalls / 6);
  const hasCurrentOver = innings.legalBalls % 6 > 0;
  const totalOvers = maxOver + (hasCurrentOver ? 1 : 0);

  if (totalOvers === 0) return null;

  const overData = Array.from({ length: totalOvers }, (_, i) => {
    const deliveries = innings.deliveries.filter(d => d.overNumber === i);
    const runs = deliveries.reduce((s, d) => s + d.totalRuns, 0);
    const wickets = deliveries.filter(d => d.dismissal && d.dismissal.type !== 'retired_hurt').length;
    const bowlerId = deliveries[0]?.bowlerId ?? '';
    return { over: i, deliveries, runs, wickets, bowlerId };
  });

  return (
    <>
      <Card className="overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5] flex items-center justify-between">
          <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Over by Over</p>
          <span className="text-[10px] text-[#1565C0] font-semibold">Tap any ball to edit</span>
        </div>
        <div className="divide-y divide-[#DCE7F5]">
          {overData.map(({ over, deliveries, runs, wickets, bowlerId }) => (
            <div key={over} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#172B4D]">Over {over + 1}</span>
                <span className="text-xs text-[#60758A]">{getBowlerName(bowlerId)}</span>
                <span className="text-sm font-semibold text-[#60758A]">
                  {runs} run{runs !== 1 ? 's' : ''}{wickets > 0 ? ` · ${wickets}W` : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deliveries.map((d, i) => {
                  let label = String(d.totalRuns);
                  let cls = 'bg-white text-[#172B4D] border border-[#DCE7F5]';
                  if (d.dismissal) { label = 'W'; cls = 'bg-[#D32F2F] text-white'; }
                  else if (d.deliveryType === 'wide') { label = `Wd`; cls = 'bg-amber-100 text-amber-800 text-[10px]'; }
                  else if (d.deliveryType === 'no_ball') { label = 'NB'; cls = 'bg-orange-100 text-orange-800 text-[10px]'; }
                  else if (d.batterRuns === 4) { label = '4'; cls = 'bg-[#EBF7EE] text-[#16803C] border border-[#16803C] font-extrabold'; }
                  else if (d.batterRuns === 6) { label = '6'; cls = 'bg-[#16803C] text-white font-extrabold'; }
                  else if (d.totalRuns === 0) { label = '·'; cls = 'bg-[#E3F2FD] text-[#60758A]'; }
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditingDelivery(d)}
                      title="Tap to edit this delivery"
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-transform hover:scale-110 cursor-pointer shadow-xs ${cls}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <EditDeliveryDialog
        isOpen={editingDelivery !== null}
        onClose={() => setEditingDelivery(null)}
        delivery={editingDelivery}
        config={config}
        innings={innings}
        onSave={(deliveryId, updated) => onEditDelivery(deliveryId, updated)}
      />
    </>
  );
}
