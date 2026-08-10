import React, { useState } from 'react';
import { Users, KeyRound, Bot, User, Trophy, Sparkles, ArrowRight, ShieldAlert, Wallet, Grid3X3, Grid2X2, Coins, Lock } from 'lucide-react';
import { PlayerProfile, GridSize } from '../types';
import { sounds } from '../utils/sound';
import { createOnlineRoom, findOrJoinQuickMatch, joinPrivateRoomByCode } from '../utils/roomManager';

interface LobbyProps {
  profile: PlayerProfile;
  onStartGame: (mode: 'online_quick' | 'online_private' | 'local' | 'ai', roomId?: string) => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  profile,
  onStartGame,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenWallet,
  onOpenAdmin,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [gridSize, setGridSize] = useState<GridSize>(3);
  const [selectedBet, setSelectedBet] = useState<number>(0);
  const [isJoining, setIsJoining] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Match Online (Find or create room)
  const handleQuickMatch = async () => {
    sounds.playClick();
    if (selectedBet > profile.coins) {
      setErrorMsg(`Insufficient coins! You need at least ${selectedBet} coins to join this wager match.`);
      return;
    }

    setIsSearching(true);
    setErrorMsg('');

    try {
      const { room } = await findOrJoinQuickMatch(profile, gridSize, selectedBet);
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
    if (selectedBet > profile.coins) {
      setErrorMsg(`Insufficient coins! You need at least ${selectedBet} coins to set this wager.`);
      return;
    }

    setIsSearching(true);
    setErrorMsg('');

    try {
      const { room } = await createOnlineRoom(profile, 'private', gridSize, selectedBet);
      setIsSearching(false);
      onStartGame('online_private', room.id);
    } catch (err: any) {
      console.error('Create private room error:', err);
      setErrorMsg(err?.message || 'Failed to create private room.');
      setIsSearching(false);
    }
  };

  // Join Private Room by Code (Also triggers Secret Admin if code == '44551')
  const handleJoinPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) return;

    if (cleanCode === '44551') {
      sounds.playSuccess();
      onOpenAdmin();
      setJoinCode('');
      return;
    }

    sounds.playClick();
    setIsJoining(true);
    setErrorMsg('');

    try {
      const { room } = await joinPrivateRoomByCode(cleanCode, profile);
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
    <div className="w-full max-w-xl mx-auto space-y-5 animate-fade-in px-2 pb-6">
      
      {/* Top Header Bar with Coin Balance & Profile */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2.5 px-4 rounded-2xl shadow-lg">
        {/* Coin Balance Wallet Trigger */}
        <button
          onClick={() => {
            sounds.playClick();
            onOpenWallet();
          }}
          className="flex items-center gap-2 bg-slate-950/90 hover:bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl transition cursor-pointer group"
        >
          <Coins className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <div className="text-left">
            <div className="text-xs font-black text-amber-400">🪙 {profile.coins.toLocaleString()}</div>
            <div className="text-[9px] text-slate-400">Tap for Wallet</div>
          </div>
        </button>

        {/* Player Tag & Avatar */}
        <button
          onClick={() => {
            sounds.playClick();
            onOpenProfile();
          }}
          className="flex items-center gap-2.5 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          <div className="text-right">
            <div className="text-xs font-bold text-white max-w-[100px] truncate">{profile.name}</div>
            <div className="text-[10px] text-cyan-400 font-mono font-semibold">{profile.tagId || '#100000'}</div>
          </div>
          <span className="text-2xl">{profile.avatar}</span>
        </button>
      </div>

      {/* Main Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Realtime Arena
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              Tic-Tac-Toe Arena
            </h1>
            <p className="text-xs text-slate-400 max-w-xs">
              Play live, wager coins, alternating turns, and climb the global ranks!
            </p>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenLeaderboard();
            }}
            className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex flex-col items-center gap-1 transition"
          >
            <Trophy className="w-6 h-6" />
            <span className="text-[10px] font-bold">Ranks</span>
          </button>
        </div>
      </div>

      {/* Game Customization: Grid Size & Coin Stakes */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">Choose Grid Mode</span>
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setGridSize(3)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                gridSize === 3
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> Classic 3x3
            </button>
            <button
              onClick={() => setGridSize(4)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                gridSize === 4
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" /> Ultimate 4x4
            </button>
          </div>
        </div>

        {/* Coin Wagers / Betting Options */}
        <div>
          <span className="text-xs font-bold text-slate-300 block mb-1.5">Coin Stake Wager</span>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 50, 100, 250, 500].map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedBet(stake)}
                className={`py-2 rounded-xl text-xs font-extrabold border transition flex flex-col items-center justify-center ${
                  selectedBet === stake
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span>{stake === 0 ? 'Casual' : `🪙 ${stake}`}</span>
                <span className="text-[9px] opacity-75">{stake === 0 ? 'Free' : `Win ${stake * 2}`}</span>
              </button>
            ))}
          </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Quick Online Matchmaking */}
        <button
          onClick={handleQuickMatch}
          disabled={isSearching}
          className="group relative bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-cyan-500/15 border border-cyan-400/30 text-left transition-all hover:scale-[1.02] cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full text-cyan-200">
              {gridSize === 4 ? '4x4 Grid' : '3x3 Grid'} • {selectedBet > 0 ? `🪙 ${selectedBet}` : 'Free'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-wide">Quick Online Match</h3>
          <p className="text-xs text-cyan-100/80 mt-0.5">
            Play live online with real players online right now.
          </p>
          <div className="mt-3 flex items-center text-xs font-bold text-cyan-200 group-hover:translate-x-1 transition-transform">
            <span>{isSearching ? 'Finding Active Player...' : 'Start Match'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </button>

        {/* Create Private Room */}
        <button
          onClick={handleCreatePrivate}
          disabled={isSearching}
          className="group bg-gradient-to-br from-pink-600 to-purple-700 hover:from-pink-500 hover:to-purple-600 text-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-pink-500/15 border border-pink-400/30 text-left transition-all hover:scale-[1.02] cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full text-pink-200">
              Private Code
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-wide">Create Private Room</h3>
          <p className="text-xs text-pink-100/80 mt-0.5">
            Share 6-digit code with friend on any device!
          </p>
          <div className="mt-3 flex items-center text-xs font-bold text-pink-200 group-hover:translate-x-1 transition-transform">
            <span>Get Code</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </button>
      </div>

      {/* Join Private Room Code Input Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          Enter Private Code (or Secret Admin Code)
        </h4>
        <form onSubmit={handleJoinPrivate} className="flex gap-2">
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Room Code (e.g. TIC982 or 44551)"
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-2xl px-4 py-2.5 text-white font-mono font-bold tracking-wider placeholder:font-sans placeholder:text-slate-600 uppercase outline-none text-xs"
          />
          <button
            type="submit"
            disabled={isJoining || !joinCode.trim()}
            className="px-4 py-2.5 rounded-2xl font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md shadow-amber-400/20 disabled:opacity-50 cursor-pointer text-xs flex items-center gap-1.5"
          >
            <span>{isJoining ? 'Joining...' : 'Join Room'}</span>
          </button>
        </form>
      </div>

      {/* Secondary Offline Modes */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            sounds.playClick();
            onStartGame('ai');
          }}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 p-3.5 rounded-2xl text-left transition-all cursor-pointer group"
        >
          <div className="p-2 bg-slate-800 rounded-xl text-cyan-400 w-fit mb-1.5 group-hover:scale-110 transition-transform">
            <Bot className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white">Play vs Smart AI</h4>
          <p className="text-[10px] text-slate-400">Offline practice</p>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            onStartGame('local');
          }}
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-500/40 p-3.5 rounded-2xl text-left transition-all cursor-pointer group"
        >
          <div className="p-2 bg-slate-800 rounded-xl text-pink-400 w-fit mb-1.5 group-hover:scale-110 transition-transform">
            <User className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white">Pass & Play</h4>
          <p className="text-[10px] text-slate-400">2 Players 1 Phone</p>
        </button>
      </div>

      {/* Secret Admin Footer Link */}
      <div className="text-center pt-2">
        <button
          onClick={() => {
            sounds.playClick();
            onOpenAdmin();
          }}
          className="text-[11px] text-slate-500 hover:text-red-400 transition flex items-center justify-center gap-1 mx-auto"
        >
          <Lock className="w-3 h-3" /> Secret Admin Portal (Code: 44551)
        </button>
      </div>
    </div>
  );
};

