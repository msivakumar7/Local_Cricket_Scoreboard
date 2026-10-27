import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, TrendingUp } from 'lucide-react';
import { matchRepository } from '../db/repository';
import type { MatchState, InningsState, BatterStats, BowlerStats } from '../domain/types';
import { legalBallsToOverString, calculateCRR } from '../domain/rules';
import { Button, Card, TabStrip, Badge } from '../components/common/index';
import { generateMatchPDF } from '../services/pdfService';
import { useMatch } from '../hooks/useMatch';

export default function Scorecard() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { state: liveState } = useMatch();
  const [state, setState] = useState<MatchState | null>(null);
  const [activeInnings, setActiveInnings] = useState(0);
  const [loading, setLoading] = useState(true);

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
          />
        )}

        {innings.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-[#60758A]">No innings data recorded yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function InningsScorecard({
  innings, config, getTeamName, getPlayerName,
}: {
  innings: InningsState;
  config: any;
  getTeamName: (id: string) => string;
  getPlayerName: (teamId: string, playerId: string) => string;
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
        <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5]">
          <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Batting</p>
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
                    <div className="flex items-center gap-1">
                      {b.playerId === innings.currentStrikerId && <span className="text-[#1565C0] text-xs" aria-label="Current striker">★</span>}
                      <span className="text-sm font-semibold text-[#172B4D] truncate max-w-[130px]">{getBatterName(b.playerId)}</span>
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
              {' '}(W {innings.extras.wides}, NB {innings.extras.noBalls}, B {innings.extras.byes}, LB {innings.extras.legByes})
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
        <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5]">
          <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Bowling</p>
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
                  <td className="px-4 py-2.5 text-sm font-semibold text-[#172B4D] truncate max-w-[130px]">{getBowlerName(b.playerId)}</td>
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
      <OverByOverView innings={innings} getBowlerName={getBowlerName} />
    </div>
  );
}

function OverByOverView({ innings, getBowlerName }: { innings: InningsState; getBowlerName: (id: string) => string }) {
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
    <Card className="overflow-hidden">
      <div className="px-4 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5]">
        <p className="text-xs font-extrabold text-[#60758A] uppercase tracking-widest">Over by Over</p>
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
                  <span key={i} className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${cls}`}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
