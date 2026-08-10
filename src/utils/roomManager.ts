import { db, initAuth } from '../firebase/config';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { GameRoom, ChatMessage, PlayerProfile } from '../types';
import { generateRoomCode } from './gameLogic';

const LOCAL_ROOMS_KEY = 'tictactoe_local_rooms';
const roomChannel = typeof window !== 'undefined' ? new BroadcastChannel('tictactoe_realtime_rooms') : null;

// Helper to get local fallback rooms
function getLocalRooms(): Record<string, GameRoom> {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Helper to save local fallback room
function saveLocalRoom(room: GameRoom) {
  try {
    const rooms = getLocalRooms();
    rooms[room.id] = room;
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
    roomChannel?.postMessage({ type: 'ROOM_UPDATE', roomId: room.id, room });
  } catch (e) {
    console.error('Failed to save local room:', e);
  }
}

// 1. Create Quick or Private Room
export async function createOnlineRoom(
  profile: PlayerProfile,
  mode: 'quick' | 'private'
): Promise<{ room: GameRoom; isLocalFallback: boolean }> {
  await initAuth();

  const roomId = 'rm_' + Math.random().toString(36).substring(2, 9);
  const code = generateRoomCode();

  const newRoom: GameRoom = {
    id: roomId,
    roomCode: code,
    mode,
    status: 'waiting',
    board: Array(9).fill(null),
    turn: 'X',
    player1: {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
      symbol: 'X',
    },
    player2: null,
    winner: null,
    winningLine: null,
    lastMoveTime: Date.now(),
    createdAt: Date.now(),
    rematch: { player1Ready: false, player2Ready: false },
    scores: { player1: 0, player2: 0, draws: 0 },
    messages: [],
  };

  try {
    // Attempt Firestore creation
    await setDoc(doc(db, 'rooms', roomId), newRoom);
    return { room: newRoom, isLocalFallback: false };
  } catch (err: any) {
    console.warn('Firestore room creation failed (using resilient local live sync fallback):', err?.message || err);
    saveLocalRoom(newRoom);
    return { room: newRoom, isLocalFallback: true };
  }
}

// 2. Find and Join Quick Match
export async function findOrJoinQuickMatch(
  profile: PlayerProfile
): Promise<{ room: GameRoom; isLocalFallback: boolean }> {
  await initAuth();

  try {
    // 1. Try Firestore first
    const q = query(
      collection(db, 'rooms'),
      where('mode', '==', 'quick'),
      where('status', '==', 'waiting')
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      for (const roomDoc of snap.docs) {
        const data = roomDoc.data() as GameRoom;
        if (data.player1.id !== profile.id) {
          const updatedRoom: GameRoom = {
            ...data,
            status: 'playing',
            player2: {
              id: profile.id,
              name: profile.name,
              avatar: profile.avatar,
              symbol: 'O',
            },
            lastMoveTime: Date.now(),
          };

          await updateDoc(doc(db, 'rooms', roomDoc.id), {
            status: 'playing',
            player2: updatedRoom.player2,
            lastMoveTime: updatedRoom.lastMoveTime,
          });

          return { room: updatedRoom, isLocalFallback: false };
        }
      }
    }

    // No open room found in Firestore -> Create new
    return await createOnlineRoom(profile, 'quick');
  } catch (err: any) {
    console.warn('Firestore quick match error, trying local sync:', err?.message || err);

    // Fallback: Check local storage rooms
    const rooms = getLocalRooms();
    const openRoom = Object.values(rooms).find(
      (r) => r.mode === 'quick' && r.status === 'waiting' && r.player1.id !== profile.id
    );

    if (openRoom) {
      const updatedRoom: GameRoom = {
        ...openRoom,
        status: 'playing',
        player2: {
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          symbol: 'O',
        },
        lastMoveTime: Date.now(),
      };
      saveLocalRoom(updatedRoom);
      return { room: updatedRoom, isLocalFallback: true };
    }

    return await createOnlineRoom(profile, 'quick');
  }
}

// 3. Join Private Room by Code
export async function joinPrivateRoomByCode(
  code: string,
  profile: PlayerProfile
): Promise<{ room: GameRoom; isLocalFallback: boolean }> {
  await initAuth();
  const cleanCode = code.trim().toUpperCase();

  try {
    // Try Firestore query
    const q = query(
      collection(db, 'rooms'),
      where('roomCode', '==', cleanCode)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const roomDoc = snap.docs[0];
      const data = roomDoc.data() as GameRoom;

      if (data.player1.id === profile.id) {
        return { room: data, isLocalFallback: false };
      }

      const updatedRoom: GameRoom = {
        ...data,
        status: 'playing',
        player2: {
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          symbol: 'O',
        },
        lastMoveTime: Date.now(),
      };

      await updateDoc(doc(db, 'rooms', roomDoc.id), {
        status: 'playing',
        player2: updatedRoom.player2,
        lastMoveTime: updatedRoom.lastMoveTime,
      });

      return { room: updatedRoom, isLocalFallback: false };
    }
  } catch (err: any) {
    console.warn('Firestore join private room error, checking local fallback:', err?.message || err);
  }

  // Fallback: Check local storage rooms
  const rooms = getLocalRooms();
  const localRoom = Object.values(rooms).find((r) => r.roomCode === cleanCode);

  if (localRoom) {
    if (localRoom.player1.id === profile.id) {
      return { room: localRoom, isLocalFallback: true };
    }

    const updatedRoom: GameRoom = {
      ...localRoom,
      status: 'playing',
      player2: {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        symbol: 'O',
      },
      lastMoveTime: Date.now(),
    };
    saveLocalRoom(updatedRoom);
    return { room: updatedRoom, isLocalFallback: true };
  }

  throw new Error('Room not found. Please check code and try again.');
}

// 4. Update Room State (Moves, Rematch, Messages)
export async function updateOnlineRoomState(
  roomId: string,
  partialData: Partial<GameRoom>
): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, partialData);
  } catch (err: any) {
    console.warn('Firestore update error, updating local sync room:', err?.message || err);
    const rooms = getLocalRooms();
    if (rooms[roomId]) {
      const current = rooms[roomId];
      const updated: GameRoom = {
        ...current,
        ...partialData,
        lastMoveTime: Date.now(),
      };
      saveLocalRoom(updated);
    }
  }
}

// 5. Send Chat / Emote
export async function sendRoomChatMessage(
  roomId: string,
  msg: ChatMessage
): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      messages: arrayUnion(msg),
    });
  } catch (err: any) {
    console.warn('Firestore chat error, using local channel:', err?.message || err);
    const rooms = getLocalRooms();
    if (rooms[roomId]) {
      const current = rooms[roomId];
      const updated: GameRoom = {
        ...current,
        messages: [...(current.messages || []), msg],
      };
      saveLocalRoom(updated);
    }
  }
}

// 6. Realtime Listener Wrapper
export function subscribeToOnlineRoom(
  roomId: string,
  onUpdate: (room: GameRoom) => void
): () => void {
  let unsubFirestore: (() => void) | null = null;

  try {
    const roomRef = doc(db, 'rooms', roomId);
    unsubFirestore = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as GameRoom);
      }
    }, (err) => {
      console.warn('Firestore subscription error:', err.message);
    });
  } catch (e) {
    console.warn('Subscription setup error:', e);
  }

  // Also listen via BroadcastChannel & LocalStorage for instant cross-tab live updates
  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'ROOM_UPDATE' && e.data?.roomId === roomId) {
      onUpdate(e.data.room);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_ROOMS_KEY) {
      const rooms = getLocalRooms();
      if (rooms[roomId]) {
        onUpdate(rooms[roomId]);
      }
    }
  };

  roomChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  // Initial local check if available
  const initialLocal = getLocalRooms()[roomId];
  if (initialLocal) {
    onUpdate(initialLocal);
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    roomChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', handleStorage);
  };
}
