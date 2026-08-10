import React, { useEffect, useState } from 'react';
import { GameMode, PlayerProfile } from './types';
import { getStoredProfile, saveStoredProfile, syncProfileToFirestore } from './utils/profile';
import { initAuth } from './firebase/config';
import { sounds } from './utils/sound';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ProfileModal } from './components/ProfileModal';
import { Leaderboard } from './components/Leaderboard';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(getStoredProfile());
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby');
  const [gameMode, setGameMode] = useState<GameMode>('online_quick');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Authenticate & sync user profile on startup
  useEffect(() => {
    initAuth().then((authUser) => {
      if (authUser) {
        // Use auth UID as primary player ID if available
        setProfile((prev) => {
          const updated = { ...prev, id: authUser.uid };
          saveStoredProfile(updated);
          syncProfileToFirestore(updated);
          return updated;
        });
      } else {
        syncProfileToFirestore(profile);
      }
    });
  }, []);

  const handleToggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    sounds.enabled = newState;
  };

  const handleStartGame = (mode: GameMode, roomId?: string) => {
    setGameMode(mode);
    setActiveRoomId(roomId || null);
    setScreen('game');
  };

  const handleLeaveGame = () => {
    setScreen('lobby');
    setActiveRoomId(null);
  };

  const handleUpdateStats = (result: 'X' | 'O' | 'draw') => {
    // In local or AI mode, player is always 'X'
    // In online mode, win is passed appropriately
    let isWin = false;
    let isLoss = false;
    let isDraw = false;

    if (result === 'draw') {
      isDraw = true;
    } else if (result === 'X') {
      isWin = true;
    } else {
      isLoss = true;
    }

    const updated: PlayerProfile = {
      ...profile,
      wins: profile.wins + (isWin ? 1 : 0),
      losses: profile.losses + (isLoss ? 1 : 0),
      draws: profile.draws + (isDraw ? 1 : 0),
      totalGames: profile.totalGames + 1,
    };

    setProfile(updated);
    saveStoredProfile(updated);
    syncProfileToFirestore(updated);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top App Navbar */}
      <Navbar
        profile={profile}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onGoHome={handleLeaveGame}
        isInGame={screen === 'game'}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col justify-center my-2">
        {screen === 'lobby' ? (
          <Lobby
            profile={profile}
            onStartGame={handleStartGame}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
          />
        ) : (
          <GameBoard
            mode={gameMode}
            profile={profile}
            roomId={activeRoomId}
            onLeaveGame={handleLeaveGame}
            onUpdateStats={handleUpdateStats}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>Tic-Tac-Toe Online • Realtime Multiplayer & Leaderboard Arena</p>
      </footer>

      {/* Profile Modal */}
      <ProfileModal
        profile={profile}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSave={(updated) => setProfile(updated)}
      />

      {/* Leaderboard Modal */}
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={profile.id}
      />
    </div>
  );
}
