import { BoardState } from '../types';

export const WINNING_COMBINATIONS = [
  [0, 1, 2], // Row 1
  [3, 4, 5], // Row 2
  [6, 7, 8], // Row 3
  [0, 3, 6], // Col 1
  [1, 4, 7], // Col 2
  [2, 5, 8], // Col 3
  [0, 4, 8], // Diag 1
  [2, 4, 6], // Diag 2
];

export function checkWinner(board: BoardState): { winner: 'X' | 'O' | 'draw' | null; line: number[] | null } {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] as 'X' | 'O',
        line: combo,
      };
    }
  }

  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

// Minimax algorithm for smart AI bot
export function getBestAIMove(board: BoardState, aiSymbol: 'X' | 'O' = 'O', difficulty: 'easy' | 'hard' = 'hard'): number {
  const emptyIndices = board
    .map((val, idx) => (val === null ? idx : null))
    .filter((val): val is number => val !== null);

  if (emptyIndices.length === 0) return -1;

  // Easy mode: 50% random, 50% best move
  if (difficulty === 'easy' && Math.random() > 0.5) {
    return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  const humanSymbol = aiSymbol === 'O' ? 'X' : 'O';

  // Check if AI can win in 1 move
  for (const index of emptyIndices) {
    const boardCopy = [...board];
    boardCopy[index] = aiSymbol;
    if (checkWinner(boardCopy).winner === aiSymbol) {
      return index;
    }
  }

  // Check if AI needs to block human win
  for (const index of emptyIndices) {
    const boardCopy = [...board];
    boardCopy[index] = humanSymbol;
    if (checkWinner(boardCopy).winner === humanSymbol) {
      return index;
    }
  }

  // Take center if available
  if (board[4] === null) return 4;

  // Take corners if available
  const corners = [0, 2, 6, 8].filter((idx) => board[idx] === null);
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }

  // Otherwise random available
  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous 0, O, 1, I
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
