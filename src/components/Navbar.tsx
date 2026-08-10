import React from 'react';
import { Volume2, VolumeX, Trophy, User, Gamepad2, Sparkles } from 'lucide-react';
import { PlayerProfile } from '../types';
import { sounds } from '../utils/sound';

interface NavbarProps {
  profile: PlayerProfile;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
  onGoHome: () => void;
  isInGame?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  soundEnabled,
  onToggleSound,
  onOpenProfile,
  onOpenLeaderboard,
  onGoHome,
  isInGame = false,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Home Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onGoHome();
          }}
          className="flex items-center gap-2 font-black text-xl md:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 hover:scale-105 transition-transform cursor-pointer"
        >
          <div className="p-1.5 bg-gradient-to-tr from-cyan-500 to-pink-500 rounded-xl text-white shadow-lg shadow-pink-500/20">
            <Gamepad2 className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="hidden sm:inline">TicTac Online</span>
          <span className="sm:hidden">TicTac</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Leaderboard Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenLeaderboard();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-amber-400 text-xs md:text-sm font-semibold transition-all cursor-pointer shadow-sm hover:shadow-amber-500/10"
            title="Leaderboard"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">Top Winners</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sounds.playClick();
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Player Profile Pill */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenProfile();
            }}
            className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs md:text-sm font-medium transition-all cursor-pointer group"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{profile.avatar || '⚡'}</span>
            <div className="text-left max-w-[90px] sm:max-w-[130px] truncate">
              <div className="font-semibold truncate text-slate-100">{profile.name || 'Player'}</div>
              <div className="text-[10px] text-emerald-400 font-bold leading-tight flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                {profile.wins} Wins
              </div>
            </div>
            <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors ml-1 hidden sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
};
