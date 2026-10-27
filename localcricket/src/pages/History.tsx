import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlayCircle, FileText, Download, Trash2, Upload, PlusCircle } from 'lucide-react';
import { matchRepository, type StoredMatch } from '../db/repository';
import { Button, Card, Badge, ConfirmDialog, EmptyState } from '../components/common/index';
import { useMatch } from '../hooks/useMatch';
import { generateMatchPDF } from '../services/pdfService';
import { exportMatchJSON, importMatchJSON } from '../services/exportService';
import { legalBallsToOverString } from '../domain/rules';

type FilterStatus = 'all' | 'live' | 'completed' | 'abandoned';

export default function History() {
  const navigate = useNavigate();
  const { loadMatch } = useMatch();
  const [matches, setMatches] = useState<StoredMatch[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const all = await matchRepository.getAll();
    setMatches(all);
    setLoading(false);
  }

  async function handleResume(id: string) {
    const ok = await loadMatch(id);
    if (ok) navigate('/scoring');
  }

  async function handleDelete(id: string) {
    await matchRepository.delete(id);
    setDeleteId(null);
    loadData();
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const ok = await importMatchJSON(text);
      if (ok) {
        alert('Match imported successfully!');
        loadData();
      } else {
        alert('Invalid match file. Please check the JSON format.');
      }
    };
    input.click();
  }

  const filtered = matches.filter(m => {
    const matchesSearch = !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.teamAName.toLowerCase().includes(search.toLowerCase()) ||
      m.teamBName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'live' && (m.status === 'live' || m.status === 'innings_break')) ||
      m.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  function getScoreText(m: StoredMatch): string {
    const { innings } = m.state;
    if (innings.length === 0) return 'Not started';
    return innings.map((inn: any) => {
      const team = inn.battingTeamId === m.state.config.teamA.id
        ? m.state.config.teamA.name : m.state.config.teamB.name;
      return `${team} ${inn.totalRuns}/${inn.wickets} (${legalBallsToOverString(inn.legalBalls)})`;
    }).join(' | ');
  }

  function getStatusBadge(status: string) {
    if (status === 'live' || status === 'innings_break') return <Badge color="green">● Live</Badge>;
    if (status === 'completed') return <Badge color="blue">Completed</Badge>;
    if (status === 'abandoned') return <Badge color="amber">Abandoned</Badge>;
    return <Badge color="gray">{status}</Badge>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:ml-56 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Match History</h1>
          <p className="text-xs text-[#60758A]">Manage and review all saved matches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleImport}>
            <Upload size={14} className="mr-1" />
            Import
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/setup')}>
            <PlusCircle size={14} className="mr-1" />
            New
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#60758A]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search teams or match title…"
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {(['all', 'live', 'completed', 'abandoned'] as FilterStatus[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors min-h-[36px]
                ${filterStatus === f ? 'bg-[#1565C0] text-white' : 'bg-white text-[#60758A] border border-[#DCE7F5] hover:border-[#1565C0]'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => <div key={n} className="h-24 rounded-xl bg-[#E3F2FD] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches found"
          message={search ? 'Try a different search term.' : 'No matches saved yet. Start a new match!'}
          action={!search ? <Button variant="primary" onClick={() => navigate('/setup')}>New Match</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
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
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getStatusBadge(m.status)}
                    <span className="text-xs text-[#60758A]">
                      {m.state.config.format.oversPerInnings}ov · {new Date(m.state.config.date).toLocaleDateString()}
                    </span>
                    {m.state.config.venue && (
                      <span className="text-xs text-[#60758A]">· {m.state.config.venue}</span>
                    )}
                  </div>
                  <p className="font-bold text-[#172B4D]">{m.title}</p>
                  <p className="text-sm text-[#60758A] mt-0.5 truncate">{getScoreText(m)}</p>
                  {m.state.result && (
                    <p className="text-xs font-semibold text-[#1565C0] mt-1">{m.state.result.resultText}</p>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                  {(m.status === 'live' || m.status === 'innings_break') && (
                    <button
                      type="button"
                      onClick={() => handleResume(m.id)}
                      className="p-2 rounded-lg text-green-700 hover:bg-green-100 min-w-[40px] min-h-[40px] flex items-center justify-center"
                      aria-label="Resume" title="Resume"
                    >
                      <PlayCircle size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/scorecard/${m.id}`)}
                    className="p-2 rounded-lg text-[#1565C0] hover:bg-[#E3F2FD] min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Scorecard" title="Scorecard"
                  >
                    <FileText size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => generateMatchPDF(m.state)}
                    className="p-2 rounded-lg text-[#60758A] hover:bg-[#F5F9FF] min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Download PDF" title="Download PDF"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => exportMatchJSON(m.state)}
                    className="p-2 rounded-lg text-[#60758A] hover:bg-[#F5F9FF] min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Export JSON" title="Export JSON"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(m.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    aria-label="Delete" title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Delete Match"
        message="Permanently delete this match and all its scorecard data? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
