import React, { useState } from 'react';
import { X, Check, Trophy, Flame, Shield, RefreshCw } from 'lucide-react';
import { PlayerProfile } from '../types';
import { AVATAR_OPTIONS, saveStoredProfile, syncProfileToFirestore } from '../utils/profile';
import { sounds } from '../utils/sound';

interface ProfileModalProps {
  profile: PlayerProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: PlayerProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmedName = name.trim() || 'Gamer_' + Math.floor(Math.random() * 900 + 100);
    const updated: PlayerProfile = {
      ...profile,
      name: trimmedName,
      avatar,
    };
    saveStoredProfile(updated);
    syncProfileToFirestore(updated);
    onSave(updated);
    sounds.playClick();
    onClose();
  };

  const winRate = profile.totalGames > 0
    ? Math.round((profile.wins / profile.totalGames) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          Your Player Profile
        </h2>

        {/* Selected Avatar & Name Form */}
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border-2 border-cyan-500/50 flex items-center justify-center text-4xl shadow-lg shadow-cyan-500/10">
              {avatar}
            </div>
            <span className="text-xs text-slate-400">Choose Avatar</span>
          </div>

          {/* Avatar Selector Grid */}
          <div className="grid grid-cols-6 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setAvatar(emoji);
                  sounds.playClick();
                }}
                className={`text-2xl p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  avatar === emoji
                    ? 'bg-cyan-500/30 border-2 border-cyan-400 scale-110 shadow-md shadow-cyan-500/30'
                    : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Player Name
            </label>
            <input
              type="text"
              maxLength={15}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-4 py-3 text-white font-medium outline-none transition-all"
            />
          </div>

          {/* Career Stats Grid */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              Career Game Stats
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-emerald-500/20">
                <div className="text-emerald-400 text-xl font-extrabold">{profile.wins}</div>
                <div className="text-[11px] text-slate-400">Wins</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-rose-500/20">
                <div className="text-rose-400 text-xl font-extrabold">{profile.losses}</div>
                <div className="text-[11px] text-slate-400">Losses</div>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-xl border border-amber-500/20">
                <div className="text-amber-400 text-xl font-extrabold">{profile.draws}</div>
                <div className="text-[11px] text-slate-400">Draws</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between px-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
              <span>Win Rate: <strong className="text-cyan-400">{winRate}%</strong></span>
              <span>Total Games: <strong className="text-slate-200">{profile.totalGames}</strong></span>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-pink-400 hover:from-cyan-300 hover:to-pink-300 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};
