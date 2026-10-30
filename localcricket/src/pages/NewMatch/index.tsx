import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ChevronLeft, ChevronRight, Check, Zap, ListOrdered, Edit2, Trash2 } from 'lucide-react';
import type { MatchConfig, Team, Player, MatchFormat, PlayerEntryMode } from '../../domain/types';
import { useMatch } from '../../hooks/useMatch';
import { Button, Card } from '../../components/common/index';

type WizardStep = 'details' | 'players' | 'toss' | 'openers' | 'confirm';

const STEPS: WizardStep[] = ['details', 'players', 'toss', 'openers', 'confirm'];
const STEP_LABELS = ['Match', 'Players', 'Toss', 'Openers', 'Confirm'];

const PRESET_FORMATS = [5, 6, 8, 10, 12, 15, 20, 50];

export default function NewMatch() {
  const navigate = useNavigate();
  const { initMatch } = useMatch();
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');

  // Wizard state
  const [entryMode, setEntryMode] = useState<PlayerEntryMode>('dynamic');
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [overs, setOvers] = useState(20);
  const [customOvers, setCustomOvers] = useState('');
  const [useCustomOvers, setUseCustomOvers] = useState(false);
  const [maxBowlerOvers, setMaxBowlerOvers] = useState(4);
  const [playersPerSide, setPlayersPerSide] = useState(11);
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [teamAPlayers, setTeamAPlayers] = useState<Player[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<Player[]>([]);
  const [tossWinnerId, setTossWinnerId] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fixed IDs
  const [teamAId] = useState(() => uuidv4());
  const [teamBId] = useState(() => uuidv4());

  const actualOvers = useCustomOvers ? parseInt(customOvers, 10) || 0 : overs;

  function stepIndex() { return STEPS.indexOf(currentStep); }

  function canGoNext(): boolean {
    const errs: Record<string, string> = {};
    if (currentStep === 'details') {
      if (!teamAName.trim()) errs.teamA = 'Team A name required';
      if (!teamBName.trim()) errs.teamB = 'Team B name required';
      if (teamAName.trim() && teamBName.trim() && teamAName.trim().toLowerCase() === teamBName.trim().toLowerCase()) {
        errs.teamB = 'Team names must be different';
      }
      if (actualOvers < 1 || actualOvers > 100) errs.overs = 'Overs must be 1–100';
      if (playersPerSide < 2 || playersPerSide > 11) errs.players = 'Players must be 2–11';
    }

    if (currentStep === 'players') {
      if (entryMode === 'dynamic') {
        // Dynamic mode only requires at least 2 players for team A and at least 1 for team B (or vice versa)
        if (teamAPlayers.length < 2) {
          errs.teamAPlayers = `Enter at least 2 opening players for ${teamAName || 'Team A'}`;
        }
        if (teamBPlayers.length < 1) {
          errs.teamBPlayers = `Enter at least 1 opening bowler/player for ${teamBName || 'Team B'}`;
        }
      } else {
        // Pre-enter mode: requires team squads
        if (teamAPlayers.length < 2) {
          errs.teamAPlayers = `Add at least 2 players for ${teamAName || 'Team A'} (up to ${playersPerSide})`;
        }
        if (teamBPlayers.length < 2) {
          errs.teamBPlayers = `Add at least 2 players for ${teamBName || 'Team B'} (up to ${playersPerSide})`;
        }
      }
    }

    if (currentStep === 'toss') {
      if (!tossWinnerId) errs.toss = 'Select toss winner';
    }

    if (currentStep === 'openers') {
      const batTeamId = tossDecision === 'bat' ? tossWinnerId : (tossWinnerId === teamAId ? teamBId : teamAId);
      const bowlTeamId = batTeamId === teamAId ? teamBId : teamAId;
      const battingP = batTeamId === teamAId ? teamAPlayers : teamBPlayers;
      const bowlingP = bowlTeamId === teamAId ? teamAPlayers : teamBPlayers;

      if (!strikerId) errs.striker = 'Select opening striker';
      if (!nonStrikerId) errs.nonStriker = 'Select opening non-striker';
      if (strikerId && nonStrikerId && strikerId === nonStrikerId) errs.nonStriker = 'Must be different batters';
      if (!bowlerId) errs.bowler = 'Select opening bowler';
      if (strikerId && !battingP.find(p => p.id === strikerId)) errs.striker = 'Invalid selection';
      if (bowlerId && !bowlingP.find(p => p.id === bowlerId)) errs.bowler = 'Invalid selection';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (!canGoNext()) return;
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  }

  function back() {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  }

  function startMatch() {
    if (!canGoNext()) return;
    const now = new Date().toISOString();
    const format: MatchFormat = {
      oversPerInnings: actualOvers,
      maxOversPerBowler: maxBowlerOvers,
      playersPerSide,
    };
    const teamA: Team = { id: teamAId, name: teamAName.trim(), players: teamAPlayers };
    const teamB: Team = { id: teamBId, name: teamBName.trim(), players: teamBPlayers };
    const config: MatchConfig = {
      id: uuidv4(),
      title: title.trim() || `${teamAName} vs ${teamBName}`,
      venue: venue.trim(),
      date,
      format,
      entryMode,
      teamA,
      teamB,
      tossWinnerId,
      tossDecision,
      status: 'live',
      createdAt: now,
      updatedAt: now,
    };
    initMatch(config, strikerId, nonStrikerId, bowlerId);
    navigate('/scoring');
  }

  const battingTeamId = tossDecision === 'bat' ? tossWinnerId : (tossWinnerId === teamAId ? teamBId : teamAId);
  const bowlingTeamId = battingTeamId === teamAId ? teamBId : teamAId;
  const battingPlayers = battingTeamId === teamAId ? teamAPlayers : teamBPlayers;
  const bowlingPlayers = bowlingTeamId === teamAId ? teamAPlayers : teamBPlayers;

  function fillDemoSquads() {
    const demoA = ['Rohit Sharma', 'Virat Kohli', 'Surya Kumar', 'Rishabh Pant', 'Hardik Pandya', 'Ravindra Jadeja', 'R Ashwin', 'Jasprit Bumrah', 'Mohd Shami', 'Kuldeep Yadav', 'Mohd Siraj'];
    const demoB = ['David Warner', 'Travis Head', 'Steve Smith', 'Marnus Labuschagne', 'Glenn Maxwell', 'Alex Carey', 'Mitchell Starc', 'Pat Cummins', 'Adam Zampa', 'Josh Hazlewood', 'Nathan Lyon'];
    const pA = demoA.slice(0, playersPerSide).map((name, i) => ({
      id: uuidv4(),
      name,
      isCaptain: i === 0,
      isWicketkeeper: i === 3,
    }));
    const pB = demoB.slice(0, playersPerSide).map((name, i) => ({
      id: uuidv4(),
      name,
      isCaptain: i === 7,
      isWicketkeeper: i === 5,
    }));
    setTeamAPlayers(pA);
    setTeamBPlayers(pB);
    if (!teamAName.trim()) setTeamAName('Warriors');
    if (!teamBName.trim()) setTeamBName('Titans');
  }

  return (
    <div className="min-h-screen bg-[#F5F9FF]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#DCE7F5] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-[#F5F9FF] text-[#60758A] min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ChevronLeft size={22} />
            </button>
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Logo"
              className="w-9 h-9 object-contain rounded-lg drop-shadow-sm flex-shrink-0"
            />
            <div>
              <h1 className="text-lg font-bold text-[#172B4D]">New Match Wizard</h1>
              <span className="text-[11px] text-[#1565C0] font-semibold">
                {entryMode === 'dynamic' ? '⚡ Dynamic Entry Mode' : '📋 Pre-enter Squad Mode'}
              </span>
            </div>
          </div>
          {/* Progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors
                  ${idx < stepIndex() ? 'bg-[#1565C0] text-white' :
                    idx === stepIndex() ? 'bg-[#1565C0] text-white ring-2 ring-[#42A5F5]' :
                    'bg-[#E3F2FD] text-[#60758A]'}`}
                  aria-label={`Step ${idx + 1}: ${STEP_LABELS[idx]}`}
                >
                  {idx < stepIndex() ? <Check size={12} /> : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded ${idx < stepIndex() ? 'bg-[#1565C0]' : 'bg-[#E3F2FD]'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {STEP_LABELS.map((label, idx) => (
              <span key={label} className={`text-[10px] font-medium ${idx === stepIndex() ? 'text-[#1565C0]' : 'text-[#60758A]'}`}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* STEP 1: Match Details */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#172B4D]">Match Details</h2>

            {/* PLAYER ENTRY MODE SELECTION */}
            <div>
              <label className="block text-sm font-bold text-[#172B4D] mb-1.5">
                Player Entry Mode
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEntryMode('dynamic')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all min-h-[80px] ${
                    entryMode === 'dynamic'
                      ? 'border-[#1565C0] bg-[#E3F2FD] shadow-xs'
                      : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={16} className="text-[#1565C0]" />
                    <span className="font-bold text-sm text-[#172B4D]">Dynamic Entry</span>
                    <span className="text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.2 rounded ml-auto">
                      Default
                    </span>
                  </div>
                  <p className="text-[11px] text-[#60758A] leading-tight">
                    Enter only 2 opening batters now. Add new batters as wickets fall.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryMode('pre_enter')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all min-h-[80px] ${
                    entryMode === 'pre_enter'
                      ? 'border-[#1565C0] bg-[#E3F2FD] shadow-xs'
                      : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <ListOrdered size={16} className="text-[#1565C0]" />
                    <span className="font-bold text-sm text-[#172B4D]">Pre-enter Squad</span>
                  </div>
                  <p className="text-[11px] text-[#60758A] leading-tight">
                    Enter all 11 player names before starting the match.
                  </p>
                </button>
              </div>
            </div>

            <Field label="Match Title (optional)">
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Club Cup Semi-Final"
                className="input-field"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Team A Name" error={errors.teamA} required>
                <input value={teamAName} onChange={e => setTeamAName(e.target.value)}
                  placeholder="Team A" className={`input-field ${errors.teamA ? 'border-red-500' : ''}`} />
              </Field>
              <Field label="Team B Name" error={errors.teamB} required>
                <input value={teamBName} onChange={e => setTeamBName(e.target.value)}
                  placeholder="Team B" className={`input-field ${errors.teamB ? 'border-red-500' : ''}`} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="input-field" />
              </Field>
              <Field label="Venue">
                <input value={venue} onChange={e => setVenue(e.target.value)}
                  placeholder="Ground name" className="input-field" />
              </Field>
            </div>
            <Field label="Overs per Innings" error={errors.overs} required>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_FORMATS.map(o => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => { setOvers(o); setUseCustomOvers(false); }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors min-h-[44px]
                      ${!useCustomOvers && overs === o
                        ? 'bg-[#1565C0] text-white border-[#1565C0]'
                        : 'bg-white text-[#172B4D] border-[#DCE7F5] hover:border-[#1565C0]'}`}
                  >{o}ov</button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustomOvers(true)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors min-h-[44px]
                    ${useCustomOvers ? 'bg-[#1565C0] text-white border-[#1565C0]' : 'bg-white text-[#172B4D] border-[#DCE7F5] hover:border-[#1565C0]'}`}
                >Custom</button>
              </div>
              {useCustomOvers && (
                <input type="number" min={1} max={100} value={customOvers}
                  onChange={e => setCustomOvers(e.target.value)}
                  placeholder="Enter overs (1-100)" className="input-field" />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Overs/Bowler">
                <input type="number" min={0} max={actualOvers}
                  value={maxBowlerOvers}
                  onChange={e => setMaxBowlerOvers(parseInt(e.target.value, 10) || 0)}
                  className="input-field" />
                <p className="text-xs text-[#60758A] mt-1">0 = no limit</p>
              </Field>
              <Field label="Players/Side" error={errors.players} required>
                <input type="number" min={2} max={11} value={playersPerSide}
                  onChange={e => setPlayersPerSide(parseInt(e.target.value, 10) || 11)}
                  className={`input-field ${errors.players ? 'border-red-500' : ''}`} />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2: Players */}
        {currentStep === 'players' && (
          <div className="space-y-6">
            {entryMode === 'dynamic' ? (
              <div className="bg-[#E3F2FD] border border-[#1565C0]/30 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-[#1565C0]" />
                  <p className="text-xs font-bold text-[#1565C0] uppercase tracking-wider">
                    Dynamic Entry Mode Active
                  </p>
                </div>
                <p className="text-xs text-[#172B4D] leading-relaxed">
                  Only enter opening players now (minimum 2 for {teamAName || 'Team A'}, and 1 for {teamBName || 'Team B'}).
                  As wickets fall, you can enter new batter names progressively up to {playersPerSide} players!
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#172B4D]">Pre-enter All Players</h2>
                  <p className="text-xs text-[#60758A]">Enter full rosters for both teams (up to {playersPerSide} each)</p>
                </div>
                <button
                  type="button"
                  onClick={fillDemoSquads}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#E3F2FD] text-[#1565C0] hover:bg-[#BBDEFB] transition-colors min-h-[36px]"
                >
                  ⚡ Auto-fill
                </button>
              </div>
            )}

            <PlayerEntry
              teamName={teamAName || 'Team A'}
              players={teamAPlayers}
              onChange={setTeamAPlayers}
              targetCount={playersPerSide}
              isDynamic={entryMode === 'dynamic'}
              error={errors.teamAPlayers}
            />

            <PlayerEntry
              teamName={teamBName || 'Team B'}
              players={teamBPlayers}
              onChange={setTeamBPlayers}
              targetCount={playersPerSide}
              isDynamic={entryMode === 'dynamic'}
              error={errors.teamBPlayers}
            />
          </div>
        )}

        {/* STEP 3: Toss */}
        {currentStep === 'toss' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[#172B4D]">Toss</h2>
            <div>
              <label className="block text-sm font-semibold text-[#172B4D] mb-2">Toss won by</label>
              {errors.toss && <p className="text-red-600 text-sm mb-2">{errors.toss}</p>}
              <div className="grid grid-cols-2 gap-3">
                {[{ id: teamAId, name: teamAName }, { id: teamBId, name: teamBName }].map(team => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setTossWinnerId(team.id)}
                    className={`p-4 rounded-xl border-2 text-center font-semibold transition-colors min-h-[64px]
                      ${tossWinnerId === team.id
                        ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                        : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0]'}`}
                  >
                    {team.name || 'Team'}
                  </button>
                ))}
              </div>
            </div>
            {tossWinnerId && (
              <div>
                <label className="block text-sm font-semibold text-[#172B4D] mb-2">
                  {tossWinnerId === teamAId ? teamAName : teamBName} elected to…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['bat', 'bowl'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTossDecision(d)}
                      className={`p-4 rounded-xl border-2 font-semibold capitalize transition-colors min-h-[64px]
                        ${tossDecision === d
                          ? 'border-[#1565C0] bg-[#E3F2FD] text-[#1565C0]'
                          : 'border-[#DCE7F5] bg-white text-[#172B4D] hover:border-[#1565C0]'}`}
                    >
                      {d === 'bat' ? '🏏 Bat first' : '⚾ Bowl first'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tossWinnerId && (
              <Card className="p-4 bg-[#E3F2FD] border-[#1565C0]">
                <p className="text-sm text-[#1565C0] font-medium">
                  <strong>{tossWinnerId === teamAId ? teamAName : teamBName}</strong> won the toss and chose to{' '}
                  <strong>{tossDecision}</strong> first.
                </p>
                <p className="text-sm text-[#1565C0] mt-1">
                  <strong>{battingTeamId === teamAId ? teamAName : teamBName}</strong> will bat first.
                </p>
              </Card>
            )}
          </div>
        )}

        {/* STEP 4: Opening Players */}
        {currentStep === 'openers' && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-[#172B4D]">Opening Players</h2>
            <p className="text-sm text-[#60758A]">
              <strong>{battingTeamId === teamAId ? teamAName : teamBName}</strong> is batting first.
            </p>

            {/* Opening Striker */}
            <div>
              <label className="block text-sm font-bold text-[#172B4D] mb-2">
                Opening Striker <span className="text-xs font-normal text-[#60758A]">(faces first ball)</span>
              </label>
              {errors.striker && <p className="text-red-600 text-sm mb-1">{errors.striker}</p>}
              <div className="space-y-2">
                {battingPlayers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setStrikerId(p.id);
                      if (nonStrikerId === p.id) setNonStrikerId('');
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors min-h-[56px] text-left
                      ${strikerId === p.id ? 'border-[#1565C0] bg-[#E3F2FD]' : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${strikerId === p.id ? 'bg-[#1565C0] text-white' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-[#172B4D]">{p.name}</span>
                    {strikerId === p.id && <span className="ml-auto text-xs text-[#1565C0] font-bold">★ Striker</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Opening Non-Striker */}
            <div>
              <label className="block text-sm font-bold text-[#172B4D] mb-2">Opening Non-striker</label>
              {errors.nonStriker && <p className="text-red-600 text-sm mb-1">{errors.nonStriker}</p>}
              <div className="space-y-2">
                {battingPlayers.filter(p => p.id !== strikerId).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNonStrikerId(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors min-h-[56px] text-left
                      ${nonStrikerId === p.id ? 'border-[#42A5F5] bg-[#E3F2FD]' : 'border-[#DCE7F5] bg-white hover:border-[#42A5F5]'}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${nonStrikerId === p.id ? 'bg-[#42A5F5] text-white' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-[#172B4D]">{p.name}</span>
                    {nonStrikerId === p.id && <span className="ml-auto text-xs text-[#42A5F5] font-bold">Non-striker</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Opening Bowler */}
            <div>
              <label className="block text-sm font-bold text-[#172B4D] mb-2">Opening Bowler</label>
              {errors.bowler && <p className="text-red-600 text-sm mb-1">{errors.bowler}</p>}
              <div className="space-y-2">
                {bowlingPlayers.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBowlerId(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors min-h-[56px] text-left
                      ${bowlerId === p.id ? 'border-[#D32F2F] bg-red-50' : 'border-[#DCE7F5] bg-white hover:border-[#D32F2F]'}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${bowlerId === p.id ? 'bg-[#D32F2F] text-white' : 'bg-[#E3F2FD] text-[#1565C0]'}`}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-semibold text-[#172B4D]">{p.name}</span>
                    {bowlerId === p.id && <span className="ml-auto text-xs text-[#D32F2F] font-bold">⚾ Bowler</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Confirm */}
        {currentStep === 'confirm' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#172B4D]">Confirm & Start Match</h2>
            <Card className="p-4 space-y-2">
              <Row label="Match" value={title || `${teamAName} vs ${teamBName}`} />
              <Row label="Player Entry Mode" value={entryMode === 'dynamic' ? '⚡ Dynamic Entry' : '📋 Pre-enter Squad'} />
              <Row label="Date" value={new Date(date).toLocaleDateString('en-IN', { dateStyle: 'long' })} />
              {venue && <Row label="Venue" value={venue} />}
              <Row label="Format" value={`${actualOvers} overs per side`} />
              <Row label="Players" value={`${playersPerSide} per side`} />
              {maxBowlerOvers > 0 && <Row label="Max bowler overs" value={String(maxBowlerOvers)} />}
            </Card>
            <Card className="p-4 space-y-2">
              <p className="text-xs font-bold text-[#60758A] uppercase tracking-widest mb-1">Toss</p>
              <Row label="Won by" value={tossWinnerId === teamAId ? teamAName : teamBName} />
              <Row label="Decision" value={tossDecision === 'bat' ? 'Bat first' : 'Bowl first'} />
              <Row label="Batting first" value={battingTeamId === teamAId ? teamAName : teamBName} />
            </Card>
            <Card className="p-4 space-y-2">
              <p className="text-xs font-bold text-[#60758A] uppercase tracking-widest mb-1">Opening Players</p>
              <Row label="Striker" value={battingPlayers.find(p => p.id === strikerId)?.name ?? '—'} />
              <Row label="Non-striker" value={battingPlayers.find(p => p.id === nonStrikerId)?.name ?? '—'} />
              <Row label="Bowler" value={bowlingPlayers.find(p => p.id === bowlerId)?.name ?? '—'} />
            </Card>
            <Card className="p-4">
              <p className="text-xs font-bold text-[#60758A] uppercase tracking-widest mb-2">
                {teamAName} ({teamAPlayers.length} players)
              </p>
              <p className="text-sm text-[#172B4D]">{teamAPlayers.map(p => p.name).join(', ')}</p>
              <p className="text-xs font-bold text-[#60758A] uppercase tracking-widest mb-2 mt-3">
                {teamBName} ({teamBPlayers.length} players)
              </p>
              <p className="text-sm text-[#172B4D]">{teamBPlayers.map(p => p.name).join(', ')}</p>
            </Card>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {stepIndex() > 0 && (
            <Button variant="secondary" onClick={back} className="flex items-center gap-1">
              <ChevronLeft size={18} />
              Back
            </Button>
          )}
          {currentStep !== 'confirm' ? (
            <Button variant="primary" onClick={next} fullWidth className="flex items-center justify-center gap-1">
              Next
              <ChevronRight size={18} />
            </Button>
          ) : (
            <Button variant="success" onClick={startMatch} fullWidth size="lg">
              🏏 Start Match
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, error, required }: {
  label: string; children: React.ReactNode; error?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#172B4D] mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#60758A]">{label}</span>
      <span className="text-sm font-semibold text-[#172B4D] text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

interface PlayerEntryProps {
  teamName: string;
  players: Player[];
  onChange: (players: Player[]) => void;
  targetCount: number;
  isDynamic: boolean;
  error?: string;
}

function PlayerEntry({ teamName, players, onChange, targetCount, isDynamic, error }: PlayerEntryProps) {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...players, { id: uuidv4(), name, isCaptain: false, isWicketkeeper: false }]);
    setNewName('');
  }

  function removePlayer(id: string) {
    onChange(players.filter(p => p.id !== id));
  }

  function saveEdit(id: string) {
    const name = editName.trim();
    if (!name) return;
    onChange(players.map(p => p.id === id ? { ...p, name } : p));
    setEditId(null);
  }

  function toggleCaptain(id: string) {
    onChange(players.map(p => ({ ...p, isCaptain: p.id === id ? !p.isCaptain : false })));
  }

  function toggleWK(id: string) {
    onChange(players.map(p => ({ ...p, isWicketkeeper: p.id === id ? !p.isWicketkeeper : false })));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-bold text-[#172B4D]">{teamName || 'Team'}</h3>
          {isDynamic && (
            <p className="text-[11px] text-[#60758A]">
              {players.length < 2 ? 'Enter at least 2 opening players' : 'Ready! More batters can be added during match'}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
          ${players.length >= (isDynamic ? 2 : targetCount) ? 'bg-green-100 text-green-700' :
            players.length >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {players.length} {isDynamic ? 'entered' : `/${targetCount}`}
        </span>
      </div>
      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      {/* Player list */}
      <div className="space-y-2 mb-3">
        {players.map((p, idx) => (
          <div key={p.id} className="flex items-center gap-2 bg-white border border-[#DCE7F5] rounded-lg p-2.5">
            <span className="w-6 text-xs text-[#60758A] font-medium text-center flex-shrink-0">{idx + 1}</span>
            {editId === p.id ? (
              <>
                <input
                  className="flex-1 text-sm border border-[#1565C0] rounded px-2 py-1 min-h-[36px] outline-none"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                  autoFocus
                />
                <button type="button" onClick={() => saveEdit(p.id)} className="text-xs text-[#1565C0] font-semibold px-2 py-1 min-h-[36px]">Save</button>
                <button type="button" onClick={() => setEditId(null)} className="text-xs text-[#60758A] px-2 py-1 min-h-[36px]">Cancel</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-[#172B4D] truncate">{p.name}</span>
                {p.isCaptain && <span className="text-xs bg-[#E3F2FD] text-[#1565C0] px-1.5 py-0.5 rounded font-semibold">C</span>}
                {p.isWicketkeeper && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">WK</span>}
                <button type="button" onClick={() => toggleCaptain(p.id)} className="text-[10px] text-[#60758A] hover:text-[#1565C0] px-1 min-h-[36px]" title="Toggle captain">C</button>
                <button type="button" onClick={() => toggleWK(p.id)} className="text-[10px] text-[#60758A] hover:text-amber-600 px-1 min-h-[36px]" title="Toggle wicketkeeper">WK</button>
                <button type="button" onClick={() => { setEditId(p.id); setEditName(p.name); }}
                  className="text-[#60758A] hover:text-[#1565C0] p-1 min-h-[36px]" aria-label="Edit player name">
                  <Edit2 size={13} />
                </button>
                <button type="button" onClick={() => removePlayer(p.id)}
                  className="text-red-400 hover:text-red-600 p-1 min-h-[36px]" aria-label="Remove player">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add player */}
      {players.length < 11 && (
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPlayer();
              }
            }}
            placeholder={`Add player name (e.g. ${players.length === 0 ? 'Siva' : players.length === 1 ? 'Kumar' : 'Ravi'})`}
            className="flex-1 input-field"
          />
          <Button variant="secondary" onClick={addPlayer} disabled={!newName.trim()} className="px-4">
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
