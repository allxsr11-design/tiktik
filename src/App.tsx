import React, { useEffect, useState } from 'react';
import { GameMode, PlayerProfile } from './types';
import { getStoredProfile, saveStoredProfile, syncProfileToFirestore, getUserProfileFromFirestore } from './utils/profile';
import { initAuth } from './firebase/config';
import { sounds } from './utils/sound';
import { Navbar } from './components/Navbar';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { ProfileModal } from './components/ProfileModal';
import { Leaderboard } from './components/Leaderboard';
import { WalletModal } from './components/WalletModal';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(getStoredProfile());
  const [screen, setScreen] = useState<'lobby' | 'game'>('lobby');
  const [gameMode, setGameMode] = useState<GameMode>('online_quick');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Refresh profile from Firestore (to sync coin updates)
  const refreshProfileData = async (userId: string) => {
    try {
      const fresh = await getUserProfileFromFirestore(userId);
      if (fresh) {
        setProfile(fresh);
        saveStoredProfile(fresh);
      }
    } catch (e) {
      console.warn('Profile sync error:', e);
    }
  };

  // Authenticate & sync user profile on startup
  useEffect(() => {
    initAuth().then((authUser) => {
      if (authUser) {
        // Use auth UID as primary player ID if available
        const currentId = authUser.uid;
        setProfile((prev) => {
          const updated = { ...prev, id: currentId };
          saveStoredProfile(updated);
          syncProfileToFirestore(updated);
          return updated;
        });
        refreshProfileData(currentId);
      } else {
        syncProfileToFirestore(profile);
      }
    });
  }, []);

  // Periodically refresh profile coins when in lobby
  useEffect(() => {
    if (screen === 'lobby' && profile.id) {
      refreshProfileData(profile.id);
    }
  }, [screen, isWalletOpen, isAdminOpen]);

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
    if (profile.id) {
      refreshProfileData(profile.id);
    }
  };

  const handleUpdateStats = (result: 'X' | 'O' | 'draw') => {
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-4 flex flex-col justify-center my-1">
        {screen === 'lobby' ? (
          <Lobby
            profile={profile}
            onStartGame={handleStartGame}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
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
      <footer className="py-3 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>Tic-Tac-Toe Arena • Realtime Multiplayer, Wagers & Leaderboard</p>
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

      {/* Wallet Modal (Deposits, Withdrawals, History & PIN) */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => {
          setIsWalletOpen(false);
          refreshProfileData(profile.id);
        }}
        profile={profile}
        onUpdateProfile={(updated) => setProfile(updated)}
      />

      {/* Secret Admin Control Portal (Code: 44551) */}
      <AdminPortal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          refreshProfileData(profile.id);
        }}
      />
    </div>
  );
}

