export type BoardState = Array<string | null>; // 9 slots for 3x3, 16 slots for 4x4

export type GameMode = 'online_quick' | 'online_private' | 'local' | 'ai';
export type GridSize = 3 | 4;

export interface PlayerProfile {
  id: string;
  tagId: string; // e.g. "#482091"
  name: string;
  avatar: string;
  phone?: string;
  coins: number;
  txPin?: string;
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
  gridSize: GridSize; // 3x3 or 4x4
  betCoins: number; // Coin wager
  status: 'waiting' | 'playing' | 'finished' | 'abandoned';
  board: BoardState;
  turn: 'X' | 'O';
  startingTurn: 'X' | 'O'; // Alternates each round so first move rotates!
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

export interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  userTagId: string;
  type: 'deposit' | 'withdrawal' | 'match_win' | 'match_loss' | 'welcome_bonus';
  method?: 'bkash' | 'nagad' | 'usdt_binance' | 'coins';
  amount: number;
  accountNo?: string;
  trxId?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  note?: string;
}

export interface LeaderboardUser {
  id: string;
  tagId: string;
  name: string;
  avatar: string;
  coins: number;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
}

