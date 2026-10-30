import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserPlus, Edit2, Check } from 'lucide-react';
import type { InningsState, Team } from '../../domain/types';
import { Modal, Button } from '../common/index';
import { legalBallsToOverString, validateBowlerChange } from '../../domain/rules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bowlerId: string) => void;
  innings: InningsState;
  bowlingTeam: Team;
  maxOversPerBowler: number;
  onAddBowler?: (bowlerId: string, bowlerName: string) => void;
  onUpdatePlayerName?: (playerId: string, newName: string) => void;
}

export default function ChangeBowlerDialog({
  isOpen,
  onClose,
  onConfirm,
  innings,
  bowlingTeam,
  maxOversPerBowler,
  onAddBowler,
  onUpdatePlayerName,
}: Props) {
  const [selected, setSelected] = useState('');
  const [newBowlerName, setNewBowlerName] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Last over bowler (should not bowl consecutive overs)
  const currentOverIndex = Math.floor(innings.legalBalls / 6);
  const lastOverDeliveries = innings.deliveries.filter(d => d.overNumber === currentOverIndex - 1);
  const lastOverBowlerId = lastOverDeliveries.length > 0 ? lastOverDeliveries[lastOverDeliveries.length - 1].bowlerId : null;

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    setSelected('');
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
      // If already in squad, just select them
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

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setSelected(''); }} title="Change Bowler">
      <div className="space-y-4">
        {/* Dynamic add new bowler */}
        <div className="bg-[#F5F9FF] border border-[#DCE7F5] p-3 rounded-xl">
          <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block mb-1.5">
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
              className={`flex-1 input-field ${error ? 'border-red-500' : ''}`}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddNewBowler}
              disabled={!newBowlerName.trim()}
              className="flex-shrink-0"
            >
              <UserPlus size={16} className="mr-1" />
              Add
            </Button>
          </div>
          {error && <p className="text-xs text-red-600 font-semibold mt-1">{error}</p>}
        </div>

        {/* Existing bowlers list */}
        <div>
          <label className="text-xs font-bold text-[#60758A] uppercase tracking-wider block mb-2">
            Select Bowler
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {bowlingTeam.players.map(p => {
              const stats = innings.bowlerStats[p.id];
              const validation = validateBowlerChange(p.id, lastOverBowlerId, stats?.legalBalls, maxOversPerBowler);
              const isInvalid = !validation.valid;

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors min-h-[56px]
                    ${p.id === innings.currentBowlerId ? 'border-[#42A5F5] bg-[#E3F2FD]' :
                      selected === p.id ? 'border-[#1565C0] bg-[#E3F2FD]' :
                      isInvalid ? 'border-[#DCE7F5] bg-gray-50 opacity-50 cursor-not-allowed' :
                      'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
                >
                  {editingId === p.id ? (
                    <div className="flex-1 flex items-center gap-2">
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
                      <button
                        type="button"
                        disabled={isInvalid}
                        onClick={() => !isInvalid && setSelected(p.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-semibold text-[#172B4D] truncate">{p.name}</p>
                        {stats && (
                          <p className="text-xs text-[#60758A]">
                            {legalBallsToOverString(stats.legalBalls)} ov · {stats.runs}R · {stats.wickets}W
                          </p>
                        )}
                        {isInvalid && <p className="text-xs text-red-500 mt-0.5">{validation.reason}</p>}
                      </button>
                      <div className="flex items-center gap-1.5 ml-2">
                        {p.id === innings.currentBowlerId && (
                          <span className="text-xs bg-[#E3F2FD] text-[#1565C0] px-2 py-0.5 rounded-full font-semibold">
                            Current
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditingName(p.name);
                          }}
                          className="p-1 text-[#60758A] hover:text-[#1565C0] rounded"
                          title="Edit bowler name"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={() => { onClose(); setSelected(''); }} fullWidth>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!selected || selected === innings.currentBowlerId}
            fullWidth
          >
            Confirm Bowler
          </Button>
        </div>
      </div>
    </Modal>
  );
}
