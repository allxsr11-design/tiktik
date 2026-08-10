import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw, X, Award, Flame, UserCheck } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { LeaderboardUser } from '../types';
import { sounds } from '../utils/sound';

interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('wins', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const list: LeaderboardUser[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          const wins = data.wins || 0;
          const totalGames = data.totalGames || 0;
          const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
          list.push({
            id: doc.id,
            name: data.name,
            avatar: data.avatar || '⚡',
            wins,
            losses: data.losses || 0,
            draws: data.draws || 0,
            totalGames,
            winRate,
          });
        }
      });
      setUsers(list);
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl text-white relative flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400">
                Top Winners Leaderboard
              </h2>
              <p className="text-xs text-slate-400">Global Hall of Fame Champions</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                fetchLeaderboard();
              }}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="overflow-y-auto my-4 space-y-2.5 pr-1 flex-1">
          {loading && users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="text-sm font-medium">Loading Top Champions...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800 p-6">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No Champions Yet!</p>
              <p className="text-xs text-slate-500 mt-1">Play live online matches to reach #1 on the leaderboard.</p>
            </div>
          ) : (
            users.map((user, index) => {
              const isCurrent = user.id === currentUserId;
              const rank = index + 1;

              let rankBadge = (
                <span className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-xs">
                  #{rank}
                </span>
              );

              if (rank === 1) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20">
                    👑
                  </span>
                );
              } else if (rank === 2) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/50 flex items-center justify-center font-bold text-sm">
                    🥈
                  </span>
                );
              } else if (rank === 3) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/50 flex items-center justify-center font-bold text-sm">
                    🥉
                  </span>
                );
              }

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <div className="text-2xl">{user.avatar}</div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-sm text-white">
                        <span>{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{user.totalGames} played</span>
                        <span>•</span>
                        <span className="text-cyan-400">{user.winRate}% win rate</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-emerald-400 font-extrabold text-lg flex items-center justify-end gap-1">
                      <Flame className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                      {user.wins}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Wins</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
          Leaderboard syncs automatically from real-time match victories.
        </div>
      </div>
    </div>
  );
};
