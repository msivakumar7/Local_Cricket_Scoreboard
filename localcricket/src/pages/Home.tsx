// ============================================================
// LocalCricket — Home Dashboard
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, PlayCircle, BarChart2, Wifi, WifiOff, Trash2, FileText, Download } from 'lucide-react';
import { matchRepository, type StoredMatch } from '../db/repository';
import { Button, Card, Badge, ConfirmDialog, EmptyState } from '../components/common/index';
import { useMatch } from '../hooks/useMatch';
import { legalBallsToOverString } from '../domain/rules';
import { generateMatchPDF } from '../services/pdfService';

export default function Home() {
  const navigate = useNavigate();
  const { loadMatch } = useMatch();
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, totalRuns: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    const [all, s] = await Promise.all([
      matchRepository.getAll(),
      matchRepository.getStats(),
    ]);
    setMatches(all);
    setStats(s);
    setLoading(false);
  }

  const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'innings_break');
  const recentMatches = matches.slice(0, 6);

  async function handleResume(id: string) {
    const ok = await loadMatch(id);
    if (ok) navigate('/scoring');
  }

  async function handleDelete(id: string) {
    await matchRepository.delete(id);
    setDeleteId(null);
    loadData();
  }

  async function handleDownloadPDF(m: StoredMatch) {
    generateMatchPDF(m.state);
  }

  function getStatusBadge(status: string) {
    if (status === 'live' || status === 'innings_break')
      return <Badge color="green">● Live</Badge>;
    if (status === 'completed')
      return <Badge color="blue">Completed</Badge>;
    if (status === 'abandoned')
      return <Badge color="amber">Abandoned</Badge>;
    return <Badge color="gray">{status}</Badge>;
  }

  function getScoreText(m: StoredMatch): string {
    const { innings } = m.state;
    if (innings.length === 0) return 'Not started';
    const parts = innings.map((inn: any) => {
      const team = inn.battingTeamId === m.state.config.teamA.id
        ? m.state.config.teamA.name : m.state.config.teamB.name;
      const balls = legalBallsToOverString(inn.legalBalls);
      return `${team} ${inn.totalRuns}/${inn.wickets} (${balls})`;
    });
    return parts.join(' | ');
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 sm:ml-56">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="LocalCricket Logo"
            className="w-12 h-12 object-contain rounded-xl drop-shadow-md"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-[#172B4D]">LocalCricket</h1>
            <p className="text-xs text-[#60758A]">Offline scoring app</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-white border border-[#DCE7F5]">
          {isOnline ? <Wifi size={12} className="text-green-600" /> : <WifiOff size={12} className="text-amber-600" />}
          <span className={isOnline ? 'text-green-700' : 'text-amber-700'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* New match CTA */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => navigate('/setup')}
        className="mb-6 shadow-lg"
      >
        <PlusCircle size={20} className="mr-2" />
        New Match
      </Button>

      {/* Resume match */}
      {liveMatches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold text-[#60758A] uppercase tracking-widest mb-3">
            Resume Match
          </h2>
          {liveMatches.map(m => (
            <Card key={m.id} className="p-4 mb-3 border-l-4 border-l-green-500">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color="green">● Live</Badge>
                    <span className="text-xs text-[#60758A]">{m.state.config.format.oversPerInnings}ov</span>
                  </div>
                  <p className="font-bold text-[#172B4D] text-base truncate">
                    {m.state.config.teamA.name} vs {m.state.config.teamB.name}
                  </p>
                  <p className="text-sm text-[#60758A] mt-0.5 truncate">{getScoreText(m)}</p>
                </div>
                <Button variant="success" size="sm" onClick={() => handleResume(m.id)} className="ml-3 flex-shrink-0">
                  <PlayCircle size={16} className="mr-1" />
                  Resume
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Matches', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'Total Runs', value: stats.totalRuns.toLocaleString() },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <p className="text-2xl font-extrabold text-[#1565C0] tabular-nums">{s.value}</p>
            <p className="text-xs text-[#60758A] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent matches */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-[#60758A] uppercase tracking-widest">Recent Matches</h2>
          {matches.length > 0 && (
            <button onClick={() => navigate('/history')} className="text-xs text-[#1565C0] font-semibold hover:underline">
              View all
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-20 rounded-xl bg-[#E3F2FD] animate-pulse" />
            ))}
          </div>
        ) : recentMatches.length === 0 ? (
          <EmptyState
            icon={<BarChart2 size={48} />}
            title="No matches yet"
            message="Tap New Match to start scoring your first cricket match."
            action={
              <Button variant="primary" onClick={() => navigate('/setup')}>
                Start your first match
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {recentMatches.map(m => (
              <Card
                key={m.id}
                className="p-4 cursor-pointer hover:border-[#1565C0] transition-colors"
                onClick={() => {
                  if (m.status === 'live' || m.status === 'innings_break') {
                    handleResume(m.id);
                  } else {
                    navigate(`/scorecard/${m.id}`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getStatusBadge(m.status)}
                      <span className="text-xs text-[#60758A]">
                        {m.state.config.format.oversPerInnings}ov · {new Date(m.state.config.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-bold text-[#172B4D] truncate">
                      {m.state.config.teamA.name} vs {m.state.config.teamB.name}
                    </p>
                    <p className="text-sm text-[#60758A] mt-0.5 truncate">{getScoreText(m)}</p>
                    {m.state.result && (
                      <p className="text-xs font-semibold text-[#1565C0] mt-1">{m.state.result.resultText}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {(m.status === 'live' || m.status === 'innings_break') && (
                      <button
                        onClick={() => handleResume(m.id)}
                        className="p-2 rounded-lg text-green-700 hover:bg-green-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                        aria-label="Resume match"
                        title="Resume"
                      >
                        <PlayCircle size={18} />
                      </button>
                    )}
                    {m.status === 'completed' && (
                      <>
                        <button
                          onClick={() => navigate(`/scorecard/${m.id}`)}
                          className="p-2 rounded-lg text-[#1565C0] hover:bg-[#E3F2FD] min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label="View scorecard"
                          title="Scorecard"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(m)}
                          className="p-2 rounded-lg text-[#60758A] hover:bg-[#F5F9FF] min-w-[40px] min-h-[40px] flex items-center justify-center"
                          aria-label="Download PDF"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label="Delete match"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Offline notice */}
      <div className="mt-8 p-3 rounded-xl bg-[#E3F2FD] text-xs text-[#60758A] text-center">
        Match data is stored locally on this device. No account required.
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Match"
        message="Are you sure? This will permanently remove the match and all its data."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
