import React, { useState } from 'react';
import { Users, KeyRound, Bot, User, Play, Trophy, Sparkles, Flame, PlusCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { PlayerProfile } from '../types';
import { sounds } from '../utils/sound';
import { createOnlineRoom, findOrJoinQuickMatch, joinPrivateRoomByCode } from '../utils/roomManager';

interface LobbyProps {
  profile: PlayerProfile;
  onStartGame: (mode: 'online_quick' | 'online_private' | 'local' | 'ai', roomId?: string) => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  profile,
  onStartGame,
  onOpenLeaderboard,
  onOpenProfile,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Match Online (Find or create room)
  const handleQuickMatch = async () => {
    sounds.playClick();
    setIsSearching(true);
    setErrorMsg('');

    try {
      const { room } = await findOrJoinQuickMatch(profile);
      if (room.status === 'playing') {
        sounds.playMatchFound();
      }
      setIsSearching(false);
      onStartGame('online_quick', room.id);
    } catch (err: any) {
      console.error('Quick match error:', err);
      setErrorMsg(err?.message || 'Failed to connect to online matchmaking. Please try again.');
      setIsSearching(false);
    }
  };

  // Create Private Room
  const handleCreatePrivate = async () => {
    sounds.playClick();
    setIsSearching(true);
    setErrorMsg('');

    try {
      const { room } = await createOnlineRoom(profile, 'private');
      setIsSearching(false);
      onStartGame('online_private', room.id);
    } catch (err: any) {
      console.error('Create private room error:', err);
      setErrorMsg(err?.message || 'Failed to create private room.');
      setIsSearching(false);
    }
  };

  // Join Private Room by Code
  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    sounds.playClick();
    setIsJoining(true);
    setErrorMsg('');

    try {
      const { room } = await joinPrivateRoomByCode(joinCode, profile);
      if (room.status === 'playing') {
        sounds.playMatchFound();
      }
      setIsJoining(false);
      onStartGame('online_private', room.id);
    } catch (err: any) {
      console.error('Join room error:', err);
      setErrorMsg(err?.message || 'Failed to join room. Please check code and try again.');
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fade-in px-2">
      {/* Welcome Banner Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Live Online Multiplayer
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Tic-Tac-Toe Arena
            </h1>
            <p className="text-xs text-slate-400 max-w-xs">
              Play live with online players across devices, create private rooms, and conquer the leaderboard!
            </p>
          </div>

          {/* Quick Player Profile Badge */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenProfile();
            }}
            className="flex flex-col items-center bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 p-3 rounded-2xl transition-all cursor-pointer shadow-lg group"
          >
            <div className="text-3xl group-hover:scale-110 transition-transform">{profile.avatar}</div>
            <span className="text-xs font-bold text-white mt-1 max-w-[100px] truncate">{profile.name}</span>
            <span className="text-[10px] text-emerald-400 font-bold">{profile.wins} Wins</span>
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-shake">
          <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Primary Game Mode Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Quick Online Matchmaking */}
        <button
          onClick={handleQuickMatch}
          disabled={isSearching}
          className="group relative bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white p-5 rounded-3xl shadow-xl shadow-cyan-500/15 border border-cyan-400/30 text-left transition-all hover:scale-[1.02] cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full text-cyan-200">
              Live Online
            </span>
          </div>
          <h3 className="text-lg font-black tracking-wide">Quick Online Match</h3>
          <p className="text-xs text-cyan-100/80 mt-1">
            Instant online matchmaking with random players online right now.
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-cyan-200 group-hover:translate-x-1 transition-transform">
            <span>{isSearching ? 'Finding Match...' : 'Play Now'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </button>

        {/* Create Private Room */}
        <button
          onClick={handleCreatePrivate}
          disabled={isSearching}
          className="group bg-gradient-to-br from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-white p-5 rounded-3xl shadow-xl shadow-pink-500/15 border border-pink-400/30 text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white">
              <KeyRound className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full text-pink-200">
              With Friend
            </span>
          </div>
          <h3 className="text-lg font-black tracking-wide">Create Private Room</h3>
          <p className="text-xs text-pink-100/80 mt-1">
            Get a 6-digit room code to invite a friend on another phone/laptop!
          </p>
          <div className="mt-4 flex items-center text-xs font-bold text-pink-200 group-hover:translate-x-1 transition-transform">
            <span>Generate Code</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </button>
      </div>

      {/* Join Private Room Code Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          Have a Private Room Code?
        </h4>
        <form onSubmit={handleJoinPrivate} className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. TIC982"
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-2xl px-4 py-3 text-white font-mono font-bold tracking-wider placeholder:font-sans placeholder:text-slate-600 uppercase outline-none"
          />
          <button
            type="submit"
            disabled={isJoining || !joinCode.trim()}
            className="px-5 py-3 rounded-2xl font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md shadow-amber-400/20 disabled:opacity-50 cursor-pointer text-sm flex items-center gap-1.5"
          >
            <span>{isJoining ? 'Joining...' : 'Join Room'}</span>
          </button>
        </form>
      </div>

      {/* Secondary Offline Modes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Play vs AI */}
        <button
          onClick={() => {
            sounds.playClick();
            onStartGame('ai');
          }}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 p-4 rounded-2xl text-left transition-all cursor-pointer group"
        >
          <div className="p-2 bg-slate-800 rounded-xl text-cyan-400 w-fit mb-2 group-hover:scale-110 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Play vs Smart AI</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Practice offline against bot</p>
        </button>

        {/* Pass & Play Local */}
        <button
          onClick={() => {
            sounds.playClick();
            onStartGame('local');
          }}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-500/40 p-4 rounded-2xl text-left transition-all cursor-pointer group"
        >
          <div className="p-2 bg-slate-800 rounded-xl text-pink-400 w-fit mb-2 group-hover:scale-110 transition-transform">
            <User className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-white">Pass & Play</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">2 players on 1 phone</p>
        </button>
      </div>

      {/* Leaderboard Teaser Banner */}
      <button
        onClick={() => {
          sounds.playClick();
          onOpenLeaderboard();
        }}
        className="w-full bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Global Champions Leaderboard</div>
            <div className="text-xs text-slate-400">See top players with highest win records</div>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-amber-400" />
      </button>
    </div>
  );
};
