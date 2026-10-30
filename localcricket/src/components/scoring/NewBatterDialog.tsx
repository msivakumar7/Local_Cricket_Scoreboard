import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserPlus, Edit2, Check } from 'lucide-react';
import type { InningsState, Team } from '../../domain/types';
import { Modal, Button } from '../common/index';

interface Props {
  isOpen: boolean;
  onConfirm: (batterId: string, newPlayerName?: string) => void;
  innings: InningsState;
  battingTeam: Team;
  onUpdatePlayerName?: (playerId: string, newName: string) => void;
}

export default function NewBatterDialog({
  isOpen,
  onConfirm,
  innings,
  battingTeam,
  onUpdatePlayerName,
}: Props) {
  const [selected, setSelected] = useState('');
  const [newBatterName, setNewBatterName] = useState('');
  const [nameError, setNameError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Pre-entered players who haven't batted yet or were retired hurt
  const availablePlayers = battingTeam.players.filter(p =>
    !innings.battingOrder.includes(p.id) ||
    (innings.battingOrder.includes(p.id) && innings.retiredHurtIds.includes(p.id))
  ).filter(p =>
    p.id !== innings.currentStrikerId && p.id !== innings.currentNonStrikerId
  );

  // Identify surviving batter
  const isStrikerEmpty = !innings.currentStrikerId || innings.currentStrikerId === '';
  const survivingId = isStrikerEmpty ? innings.currentNonStrikerId : innings.currentStrikerId;
  const survivingPlayer = battingTeam.players.find(p => p.id === survivingId);
  const slotText = isStrikerEmpty ? 'Striker End (facing next ball)' : 'Non-Striker End';

  function handleSelectExisting() {
    if (!selected) return;
    onConfirm(selected);
    setSelected('');
    setNewBatterName('');
    setNameError('');
  }

  function handleAddNewBatter() {
    const trimmed = newBatterName.trim();
    if (!trimmed) {
      setNameError('Please enter a batter name');
      return;
    }
    // Prevent duplicate name in batting team
    const isDuplicate = battingTeam.players.some(
      p => p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setNameError(`A player named "${trimmed}" already exists in the team.`);
      return;
    }

    const newId = uuidv4();
    onConfirm(newId, trimmed);
    setNewBatterName('');
    setNameError('');
    setSelected('');
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

  return (
    <Modal isOpen={true} onClose={() => {}} title="New Batter Required">
      <div className="space-y-4">
        {/* Context badge: which end and surviving partner */}
        <div className="bg-[#E3F2FD] border border-[#DCE7F5] rounded-xl p-3 text-xs text-[#172B4D]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#60758A]">At the Crease:</span>
            <span className="font-bold">{survivingPlayer?.name ?? 'Partner'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#60758A]">Incoming Position:</span>
            <span className="font-semibold text-[#1565C0]">{slotText}</span>
          </div>
        </div>

        {/* Dynamic Entry Form: Enter New Batter Name */}
        <div className="border border-[#DCE7F5] bg-[#F5F9FF] p-3.5 rounded-xl">
          <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wider block mb-1.5">
            Enter Next Batter Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBatterName}
              onChange={e => {
                setNewBatterName(e.target.value);
                if (nameError) setNameError('');
                if (selected) setSelected('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewBatter();
                }
              }}
              placeholder="e.g. Ravi Kumar"
              className={`flex-1 input-field ${nameError ? 'border-red-500' : ''}`}
              autoFocus={availablePlayers.length === 0}
            />
            <Button
              variant="primary"
              onClick={handleAddNewBatter}
              disabled={!newBatterName.trim()}
              className="flex-shrink-0 px-4"
            >
              <UserPlus size={16} className="mr-1.5" />
              Add & Send
            </Button>
          </div>
          {nameError && (
            <p className="text-xs text-red-600 font-semibold mt-1.5">{nameError}</p>
          )}
        </div>

        {/* Option 2: Pre-entered Players List (if any exist) */}
        {availablePlayers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-[#DCE7F5]" />
              <span className="text-[11px] font-bold text-[#60758A] uppercase tracking-wider">
                Or Select from Pre-entered Squad ({availablePlayers.length})
              </span>
              <div className="flex-1 h-px bg-[#DCE7F5]" />
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {availablePlayers.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border-2 transition-colors
                    ${selected === p.id
                      ? 'border-[#1565C0] bg-[#E3F2FD]'
                      : 'border-[#DCE7F5] bg-white hover:border-[#1565C0]'}`}
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
                        onClick={() => {
                          setSelected(p.id);
                          setNewBatterName('');
                          setNameError('');
                        }}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
                            ${selected === p.id ? 'bg-[#1565C0] text-white' : 'bg-[#E3F2FD] text-[#1565C0]'}`}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-sm text-[#172B4D] truncate">{p.name}</p>
                          {innings.retiredHurtIds.includes(p.id) && (
                            <p className="text-[10px] text-amber-600 font-bold">Retired hurt — returning</p>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingId(p.id);
                          setEditingName(p.name);
                        }}
                        className="p-1.5 text-[#60758A] hover:text-[#1565C0] rounded ml-2"
                        title="Edit player name spelling"
                      >
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {selected && (
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={handleSelectExisting}
                className="mt-3"
              >
                Send Selected to Crease
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
