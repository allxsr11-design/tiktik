import { BoardState, GridSize } from '../types';

export const WINNING_3X3 = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6],           // Diagonals
];

export const WINNING_4X4 = [
  [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], // Rows
  [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], // Cols
  [0, 5, 10, 15], [3, 6, 9, 12],                              // Diagonals
];

export function checkWinner(
  board: BoardState,
  gridSize: GridSize = 3
): { winner: 'X' | 'O' | 'draw' | null; line: number[] | null } {
  const combinations = gridSize === 4 ? WINNING_4X4 : WINNING_3X3;

  for (const combo of combinations) {
    const first = board[combo[0]];
    if (first && combo.every((idx) => board[idx] === first)) {
      return {
        winner: first as 'X' | 'O',
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

// AI bot move for 3x3 and 4x4
export function getBestAIMove(
  board: BoardState,
  aiSymbol: 'X' | 'O' = 'O',
  gridSize: GridSize = 3
): number {
  const emptyIndices = board
    .map((val, idx) => (val === null ? idx : null))
    .filter((val): val is number => val !== null);

  if (emptyIndices.length === 0) return -1;

  const humanSymbol = aiSymbol === 'O' ? 'X' : 'O';

  // 1. Can AI win in 1 move?
  for (const index of emptyIndices) {
    const boardCopy = [...board];
    boardCopy[index] = aiSymbol;
    if (checkWinner(boardCopy, gridSize).winner === aiSymbol) {
      return index;
    }
  }

  // 2. Can Human win in 1 move? Block it!
  for (const index of emptyIndices) {
    const boardCopy = [...board];
    boardCopy[index] = humanSymbol;
    if (checkWinner(boardCopy, gridSize).winner === humanSymbol) {
      return index;
    }
  }

  // 3. Take Center if available
  if (gridSize === 3 && board[4] === null) return 4;
  if (gridSize === 4) {
    const centers = [5, 6, 9, 10].filter((i) => board[i] === null);
    if (centers.length > 0) {
      return centers[Math.floor(Math.random() * centers.length)];
    }
  }

  // 4. Random available move
  return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTagId(): string {
  return '#' + Math.floor(100000 + Math.random() * 900000).toString();
}

