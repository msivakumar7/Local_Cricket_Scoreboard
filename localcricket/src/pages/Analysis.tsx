import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { matchRepository } from '../db/repository';
import type { MatchState, InningsState } from '../domain/types';
import { TabStrip, Card } from '../components/common/index';
import { useMatch } from '../hooks/useMatch';

export default function Analysis() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { state: liveState } = useMatch();
  const [state, setState] = useState<MatchState | null>(null);
  const [tab, setTab] = useState('worm');
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

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-[#60758A]">Loading analysis…</p></div>;
  if (!state) return <div className="flex items-center justify-center min-h-screen"><p className="text-[#60758A]">Match not found</p></div>;

  const config = state.config;
  const teamName = (teamId: string) => teamId === config.teamA.id ? config.teamA.name : config.teamB.name;

  const TABS = [
    { id: 'worm', label: 'Worm Chart' },
    { id: 'runrate', label: 'Run Rate' },
    { id: 'batting', label: 'Batting' },
    { id: 'bowling', label: 'Bowling' },
  ];

  return (
    <div className="min-h-screen bg-[#F5F9FF] pb-10">
      <div className="sticky top-0 z-30 bg-white border-b border-[#DCE7F5] px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[#F5F9FF] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft size={22} className="text-[#60758A]" />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#172B4D]">Match Analysis</h1>
            <p className="text-xs text-[#60758A]">{config.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="mb-5">
          <TabStrip tabs={TABS} activeTab={tab} onTabChange={setTab} />
        </div>

        {tab === 'worm' && <WormChart innings={state.innings} teamName={teamName} config={config} />}
        {tab === 'runrate' && <RunRateChart innings={state.innings} teamName={teamName} />}
        {tab === 'batting' && <BattingAnalysis innings={state.innings} config={config} teamName={teamName} />}
        {tab === 'bowling' && <BowlingAnalysis innings={state.innings} config={config} teamName={teamName} />}
      </div>
    </div>
  );
}

// -- Worm Chart --
function WormChart({ innings, teamName, config }: { innings: InningsState[]; teamName: (id: string) => string; config: any }) {
  const maxOvers = config.format.oversPerInnings;

  function buildWorm(inn: InningsState) {
    const data: { over: number; cumRuns: number }[] = [{ over: 0, cumRuns: 0 }];
    let cumRuns = 0;
    for (let ov = 0; ov < maxOvers; ov++) {
      const ovDeliveries = inn.deliveries.filter(d => d.overNumber === ov);
      if (ovDeliveries.length === 0) break;
      cumRuns += ovDeliveries.reduce((s, d) => s + d.totalRuns, 0);
      data.push({ over: ov + 1, cumRuns });
    }
    return data;
  }

  const combined: any[] = [];
  for (let ov = 0; ov <= maxOvers; ov++) combined.push({ over: ov });

  innings.forEach((inn, i) => {
    const worm = buildWorm(inn);
    worm.forEach(({ over, cumRuns }) => {
      const row = combined.find(r => r.over === over);
      if (row) row[`inn${i + 1}`] = cumRuns;
    });
  });

  const colors = ['#1565C0', '#16803C'];

  return (
    <Card className="p-4">
      <p className="text-sm font-bold text-[#172B4D] mb-4">Cumulative Runs Progression</p>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combined} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DCE7F5" />
            <XAxis dataKey="over" label={{ value: 'Overs', position: 'insideBottom', offset: -3 }} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {innings.map((inn, i) => (
              <Line
                key={i}
                type="monotone"
                dataKey={`inn${i + 1}`}
                name={teamName(inn.battingTeamId)}
                stroke={colors[i]}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// -- Run Rate Chart --
function RunRateChart({ innings, teamName }: { innings: InningsState[]; teamName: (id: string) => string }) {
  function buildRunRate(inn: InningsState) {
    const maxOver = Math.floor(inn.legalBalls / 6);
    return Array.from({ length: maxOver + (inn.legalBalls % 6 > 0 ? 1 : 0) }, (_, ov) => {
      const ovDeliveries = inn.deliveries.filter(d => d.overNumber === ov);
      const runs = ovDeliveries.reduce((s, d) => s + d.totalRuns, 0);
      return { over: ov + 1, runs };
    });
  }

  const data = innings.map(inn => buildRunRate(inn));
  const maxLen = Math.max(...data.map(d => d.length), 0);
  const combined = Array.from({ length: maxLen }, (_, i) => {
    const row: any = { over: i + 1 };
    data.forEach((d, idx) => { if (d[i]) row[`inn${idx + 1}`] = d[i].runs; });
    return row;
  });

  const colors = ['#1565C0', '#16803C'];

  return (
    <Card className="p-4">
      <p className="text-sm font-bold text-[#172B4D] mb-4">Runs Scored per Over</p>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={combined} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#DCE7F5" />
            <XAxis dataKey="over" label={{ value: 'Over', position: 'insideBottom', offset: -3 }} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {innings.map((inn, i) => (
              <Bar key={i} dataKey={`inn${i + 1}`} name={teamName(inn.battingTeamId)} fill={colors[i]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// -- Batting Analysis --
function BattingAnalysis({ innings, config, teamName }: { innings: InningsState[]; config: any; teamName: (id: string) => string }) {
  const getPlayerName = (teamId: string, playerId: string) => {
    const team = teamId === config.teamA.id ? config.teamA : config.teamB;
    return team.players.find((p: any) => p.id === playerId)?.name ?? playerId;
  };

  return (
    <div className="space-y-4">
      {innings.map((inn, i) => {
        const batters = Object.values(inn.batterStats).filter(b => b.didBat).sort((a, b) => b.runs - a.runs);
        const data = batters.map(b => ({
          name: getPlayerName(inn.battingTeamId, b.playerId).split(' ').pop(),
          runs: b.runs,
          sr: Math.round(b.strikeRate),
          '4s': b.fours,
          '6s': b.sixes,
        }));

        return (
          <Card key={i} className="p-4">
            <p className="text-sm font-bold text-[#172B4D] mb-3">{teamName(inn.battingTeamId)} — Top Scorers</p>
            {data.length === 0 ? (
              <p className="text-xs text-[#60758A] py-4 text-center">No batting records yet</p>
            ) : (
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE7F5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                    <Tooltip />
                    <Bar dataKey="runs" fill="#1565C0" radius={[0, 3, 3, 0]} name="Runs" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// -- Bowling Analysis --
function BowlingAnalysis({ innings, config, teamName }: { innings: InningsState[]; config: any; teamName: (id: string) => string }) {
  const getPlayerName = (teamId: string, playerId: string) => {
    const team = teamId === config.teamA.id ? config.teamA : config.teamB;
    return team.players.find((p: any) => p.id === playerId)?.name ?? playerId;
  };

  return (
    <div className="space-y-4">
      {innings.map((inn, i) => {
        const bowlerOrder = [...new Set(inn.deliveries.map(d => d.bowlerId))];
        const bowlers = bowlerOrder.map(bId => inn.bowlerStats[bId]).filter(Boolean);
        const data = bowlers.map(b => ({
          name: getPlayerName(inn.bowlingTeamId, b.playerId).split(' ').pop(),
          runs: b.runs,
          wickets: b.wickets,
          economy: Math.round(b.economy * 10) / 10,
        }));

        return (
          <Card key={i} className="p-4">
            <p className="text-sm font-bold text-[#172B4D] mb-3">{teamName(inn.bowlingTeamId)} — Bowling Figures</p>
            {data.length === 0 ? (
              <p className="text-xs text-[#60758A] py-4 text-center">No bowling records yet</p>
            ) : (
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE7F5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="runs" fill="#1565C0" name="Runs Conceded" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="wickets" fill="#D32F2F" name="Wickets" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
