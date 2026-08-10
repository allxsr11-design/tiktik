import { PlayerProfile } from '../types';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const STORAGE_KEY = 'tictactoe_player_profile';

export const AVATAR_OPTIONS = [
  '🎯', '⚡', '👑', '🐯', '🤖', '🔥', '💎', '🐉', '🎮', '🚀', '🦊', '👾'
];

export const DEFAULT_PROFILE: PlayerProfile = {
  id: '',
  name: '',
  avatar: '⚡',
  wins: 0,
  losses: 0,
  draws: 0,
  totalGames: 0,
};

export function getStoredProfile(): PlayerProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to read local profile:', e);
  }

  // Generate random default player name & ID
  const randomId = 'usr_' + Math.random().toString(36).substring(2, 9);
  const defaultNames = ['GamerX', 'TicTacPro', 'TigerHero', 'SpeedyO', 'NeonKing', 'CyberX'];
  const randomName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
  const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];

  const profile: PlayerProfile = {
    ...DEFAULT_PROFILE,
    id: randomId,
    name: randomName,
    avatar: randomAvatar,
  };

  saveStoredProfile(profile);
  return profile;
}

export function saveStoredProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save local profile:', e);
  }
}

export async function syncProfileToFirestore(profile: PlayerProfile) {
  if (!profile.id || !profile.name) return;
  try {
    const userRef = doc(db, 'users', profile.id);
    await setDoc(userRef, {
      ...profile,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (e) {
    console.warn('Sync profile to Firestore failed:', e);
  }
}

export async function fetchProfileFromFirestore(userId: string): Promise<PlayerProfile | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as PlayerProfile;
    }
  } catch (e) {
    console.warn('Fetch profile failed:', e);
  }
  return null;
}
