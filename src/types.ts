export type BoardState = Array<string | null>; // 9 slots, 'X', 'O', or null

export type GameMode = 'online_quick' | 'online_private' | 'local' | 'ai';

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  updatedAt?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: 'text' | 'emote';
  timestamp: number;
}

export interface GameRoom {
  id: string;
  roomCode: string; // 6-digit code for private room
  mode: 'quick' | 'private';
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  board: BoardState;
  turn: 'X' | 'O';
  player1: {
    id: string;
    name: string;
    avatar: string;
    symbol: 'X';
  };
  player2: {
    id: string;
    name: string;
    avatar: string;
    symbol: 'O';
  } | null;
  winner: 'X' | 'O' | 'draw' | null;
  winningLine: number[] | null;
  lastMoveTime: number;
  createdAt: number;
  rematch: {
    player1Ready: boolean;
    player2Ready: boolean;
  };
  scores: {
    player1: number;
    player2: number;
    draws: number;
  };
  messages?: ChatMessage[];
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
}
