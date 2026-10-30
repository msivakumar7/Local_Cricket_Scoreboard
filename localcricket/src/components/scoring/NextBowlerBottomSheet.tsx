import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserPlus, Edit2, Check, RotateCcw, AlertTriangle, X } from 'lucide-react';
import type { InningsState, Team, DeliveryEvent } from '../../domain/types';
import { Button } from '../common/index';
import { legalBallsToOverString, validateBowlerChange } from '../../domain/rules';

interface Props {
  isOpen: boolean;
  onConfirm: (bowlerId: string) => void;
  innings: InningsState;
  bowlingTeam: Team;
  maxOversPerBowler: number;
  onAddBowler?: (bowlerId: string, bowlerName: string) => void;
  onUpdatePlayerName?: (playerId: string, newName: string) => void;
  onUndo?: () => void;
  onClose?: () => void;
  isManualChange?: boolean;
}

function getBallChip(d: DeliveryEvent): { label: string; className: string } {
  if (d.dismissal && d.dismissal.type !== 'retired_hurt') {
    return { label: 'W', className: 'bg-[#D32F2F] text-white font-extrabold shadow-sm' };
  }
  if (d.deliveryType === 'wide') {
    const extraRuns = d.extras > 1 ? `+${d.extras - 1}` : '';
    return { label: `Wd${extraRuns}`, className: 'bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300' };
  }
  if (d.deliveryType === 'no_ball') {
    const batRuns = d.batterRuns > 0 ? `+${d.batterRuns}` : '';
    return { label: `Nb${batRuns}`, className: 'bg-orange-100 text-orange-800 font-bold text-[10px] border border-orange-300' };
  }
  if (d.batterRuns === 4) {
    return { label: '4', className: 'bg-[#EBF7EE] text-[#16803C] border border-[#16803C] font-extrabold' };
  }
  if (d.batterRuns === 6) {
    return { label: '6', className: 'bg-[#16803C] text-white font-extrabold shadow-sm' };
  }
  if (d.deliveryType === 'bye') {
    return { label: `${d.extras}B`, className: 'bg-blue-100 text-[#1565C0] font-bold text-[10px] border border-blue-200' };
  }
  if (d.deliveryType === 'leg_bye') {
    return { label: `${d.extras}Lb`, className: 'bg-blue-100 text-[#1565C0] font-bold text-[10px] border border-blue-200' };
  }
  if (d.totalRuns === 0) {
    return { label: '•', className: 'bg-[#E3F2FD] text-[#60758A] font-extrabold text-sm' };
  }
  return { label: String(d.totalRuns), className: 'bg-white text-[#172B4D] border border-[#DCE7F5] font-bold' };
}

export default function NextBowlerBottomSheet({
  isOpen,
  onConfirm,
  innings,
  bowlingTeam,
  maxOversPerBowler,
  onAddBowler,
  onUpdatePlayerName,
  onUndo,
  onClose,
  isManualChange = false,
}: Props) {
  const [selected, setSelected] = useState('');
  const [newBowlerName, setNewBowlerName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Lock scroll on background body when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Determine completed over information
  const completedOverNumber = Math.floor(innings.legalBalls / 6);
  const nextOverNumber = completedOverNumber + 1;
  const prevOverIndex = completedOverNumber - 1;
  const completedOverDeliveries = isManualChange
    ? []
    : innings.deliveries.filter(d => d.overNumber === prevOverIndex);

  const lastOverBowlerId = completedOverDeliveries.length > 0
    ? completedOverDeliveries[completedOverDeliveries.length - 1].bowlerId
    : isManualChange
      ? innings.currentBowlerId
      : null;

  // Previous over delivery stats
  const overTotalRuns = completedOverDeliveries.reduce((sum, d) => sum + d.totalRuns, 0);
  const overWickets = completedOverDeliveries.filter(d => !!d.dismissal && d.dismissal.type !== 'retired_hurt').length;
  const overExtras = completedOverDeliveries.reduce((sum, d) => sum + d.extras, 0);

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    setSelected('');
    setError('');
  }

  function handleAddNewBowler() {
    const trimmed = newBowlerName.trim();
    if (!trimmed) {
      setError('Please enter bowler name');
      return;
    }
    const exists = bowlingTeam.players.find(
      p => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      // If already in squad, select them if eligible
      setSelected(exists.id);
      setNewBowlerName('');
      setError('');
      return;
    }

    const newId = uuidv4();
    if (onAddBowler) {
      onAddBowler(newId, trimmed);
    }
    setSelected(newId);
    setNewBowlerName('');
    setError('');
  }

  function handleSaveEdit(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    if (onUpdatePlayerName) {
      onUpdatePlayerName(id, trimmed);
    }
    setEditingId(null);
  }

  if (!isOpen) return null;

  // Count eligible squad bowlers
  const eligibleBowlersCount = bowlingTeam.players.filter(p => {
    const stats = innings.bowlerStats[p.id];
    const validation = validateBowlerChange(p.id, lastOverBowlerId, stats?.legalBalls, maxOversPerBowler);
    return validation.valid;
  }).length;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Choose Next Bowler"
    >
      {/* Subtle translucent dark overlay: live scoreboard remains visible & readable above */}
      <div
        className="fixed inset-0 bg-[#0D47A1]/20 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={() => {
          if (isManualChange && onClose) {
            onClose();
          }
        }}
      />

      {/* Modern Half-Screen Bottom Sheet (covers ~48-54% screen height) */}
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl h-[52vh] max-h-[55vh] min-h-[46vh] flex flex-col z-50 animate-slide-up border-t-2 border-[#DCE7F5] safe-area-pb">
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-12 h-1.5 bg-[#DCE7F5] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-2.5 border-b border-[#DCE7F5] flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-[#172B4D] truncate">
                {isManualChange ? 'Change Bowler' : 'Choose Next Bowler'}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E3F2FD] text-[#1565C0] flex-shrink-0">
                Over {nextOverNumber}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#60758A] mt-0.5 truncate">
              Innings {innings.inningsNumber} · {completedOverDeliveries.length > 0 ? `${overTotalRuns} runs conceded in Over ${completedOverNumber}` : 'Select bowler for upcoming over'}
            </p>
          </div>
          {isManualChange && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-[#60758A] hover:text-[#172B4D] hover:bg-[#F5F9FF] rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center ml-2"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Previous Over Summary (when deliveries exist) */}
        {completedOverDeliveries.length > 0 && (
          <div className="px-5 py-2.5 bg-[#F5F9FF] border-b border-[#DCE7F5] flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                Over {completedOverNumber} Summary
              </span>
              <span className="text-xs font-bold text-[#1565C0]">
                {overTotalRuns} runs · {overWickets} {overWickets === 1 ? 'wicket' : 'wickets'}{overExtras > 0 ? ` · ${overExtras} ex` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {completedOverDeliveries.map((d, idx) => {
                const chip = getBallChip(d);
                return (
                  <span
                    key={d.id || idx}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${chip.className}`}
                  >
                    {chip.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Bowler List & Dynamic Input */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
          {/* Dynamic add new bowler */}
          <div className="bg-[#F5F9FF] border border-[#DCE7F5] p-2.5 rounded-xl">
            <label className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider block mb-1">
              Add New Bowler to Bowling Attack
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBowlerName}
                onChange={e => {
                  setNewBowlerName(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewBowler();
                  }
                }}
                placeholder="e.g. Jasprit Bumrah"
                className={`flex-1 input-field !min-h-[40px] !py-2 text-sm ${error ? 'border-red-500' : ''}`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddNewBowler}
                disabled={!newBowlerName.trim()}
                className="flex-shrink-0 !min-h-[40px]"
              >
                <UserPlus size={15} className="mr-1" />
                Add
              </Button>
            </div>
            {error && <p className="text-xs text-red-600 font-semibold mt-1">{error}</p>}
          </div>

          {/* Bowler roster list */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block">
                Select Bowler
              </label>
              <span className="text-[11px] font-semibold text-[#60758A]">
                Max {maxOversPerBowler} ov/bowler
              </span>
            </div>

            {eligibleBowlersCount === 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  No eligible bowlers available in current squad. Enter a new bowler name above to add them to the attack.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {bowlingTeam.players.map(p => {
                const stats = innings.bowlerStats[p.id];
                const validation = validateBowlerChange(p.id, lastOverBowlerId, stats?.legalBalls, maxOversPerBowler);
                const isInvalid = !validation.valid;
                const isSelected = selected === p.id;
                const isLastBowler = p.id === lastOverBowlerId;

                const oversBowled = stats ? legalBallsToOverString(stats.legalBalls) : '0.0';
                const runsConceded = stats?.runs ?? 0;
                const wicketsTaken = stats?.wickets ?? 0;
                const maidens = stats?.maidens ?? 0;
                const economy = stats ? stats.economy.toFixed(2) : '0.00';

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (!isInvalid) setSelected(p.id);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all min-h-[52px] cursor-pointer
                      ${isSelected
                        ? 'border-[#1565C0] bg-[#E3F2FD] shadow-sm'
                        : isInvalid
                          ? 'border-[#DCE7F5] bg-gray-50/70 opacity-60 cursor-not-allowed'
                          : 'border-[#DCE7F5] bg-white hover:border-[#42A5F5]'}`}
                  >
                    {editingId === p.id ? (
                      <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit(p.id)}
                          className="flex-1 text-sm border border-[#1565C0] rounded px-2 py-1 outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p.id)}
                          className="text-xs text-green-700 font-bold px-2 py-1 bg-green-50 rounded"
                        >
                          <Check size={14} />
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
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#172B4D] truncate">
                              {p.name}
                            </span>
                            {isLastBowler && (
                              <span className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded">
                                Last Over
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#60758A] mt-0.5">
                            {oversBowled} ov · {maidens} M · {runsConceded} R · {wicketsTaken} W · Econ {economy}
                          </p>
                          {isInvalid && (
                            <p className="text-[11px] text-red-600 font-medium mt-0.5">
                              {validation.reason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(p.id);
                              setEditingName(p.name);
                            }}
                            className="p-1.5 text-[#60758A] hover:text-[#1565C0] rounded min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Edit player name"
                          >
                            <Edit2 size={14} />
                          </button>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                              ${isSelected ? 'border-[#1565C0] bg-[#1565C0]' : 'border-[#60758A]'}`}
                          >
                            {isSelected && <Check size={12} className="text-white stroke-[3]" />}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#DCE7F5] bg-white flex gap-3 flex-shrink-0">
          {onUndo && (
            <Button
              variant="secondary"
              onClick={onUndo}
              className="!min-h-[48px] px-4 font-bold flex-shrink-0"
              title="Undo last delivery"
            >
              <RotateCcw size={16} className="mr-1.5" />
              Undo
            </Button>
          )}
          {isManualChange && onClose && (
            <Button
              variant="secondary"
              onClick={onClose}
              className="!min-h-[48px] px-4 font-bold flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selected || selected === lastOverBowlerId}
            fullWidth
            className="!min-h-[48px] font-extrabold text-base shadow-md tracking-wide"
          >
            CONFIRM BOWLER
          </Button>
        </div>
      </div>
    </div>
  );
}
