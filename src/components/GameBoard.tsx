import React, { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Share2, Copy, Check, RotateCcw, ArrowLeft, Users, Bot, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { GameRoom, PlayerProfile, BoardState, ChatMessage } from '../types';
import { checkWinner, getBestAIMove } from '../utils/gameLogic';
import { sounds } from '../utils/sound';
import { subscribeToOnlineRoom, updateOnlineRoomState, sendRoomChatMessage } from '../utils/roomManager';
import { QuickChat } from './QuickChat';

interface GameBoardProps {
  mode: 'online_quick' | 'online_private' | 'local' | 'ai';
  profile: PlayerProfile;
  roomId?: string | null;
  onLeaveGame: () => void;
  onUpdateStats: (winnerSymbol: 'X' | 'O' | 'draw') => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  mode,
  profile,
  roomId = null,
  onLeaveGame,
  onUpdateStats,
}) => {
  // Local state fallback for local/AI modes
  const [localBoard, setLocalBoard] = useState<BoardState>(Array(9).fill(null));
  const [localTurn, setLocalTurn] = useState<'X' | 'O'>('X');
  const [localWinner, setLocalWinner] = useState<'X' | 'O' | 'draw' | null>(null);
  const [localWinningLine, setLocalWinningLine] = useState<number[] | null>(null);
  const [localScores, setLocalScores] = useState({ player1: 0, player2: 0, draws: 0 });

  // Room state for online modes
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [floatingEmote, setFloatingEmote] = useState<{ text: string; sender: string; id: number } | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Identify my symbol in online room ('X' or 'O')
  const mySymbol: 'X' | 'O' | null =
    mode === 'online_quick' || mode === 'online_private'
      ? room
        ? room.player1.id === profile.id
          ? 'X'
          : room.player2?.id === profile.id
          ? 'O'
          : null
        : null
      : 'X';

  // Listen to Room state (Firestore + Broadcast sync)
  useEffect(() => {
    if (!roomId || (mode !== 'online_quick' && mode !== 'online_private')) return;

    const unsubscribe = subscribeToOnlineRoom(roomId, (data) => {
      setRoom(data);

      // Sound when match found
      if (prevStatusRef.current === 'waiting' && data.status === 'playing') {
        sounds.playMatchFound();
      }
      prevStatusRef.current = data.status;

      // Check latest messages for floating emote overlay
      if (data.messages && data.messages.length > 0) {
        const lastMsg = data.messages[data.messages.length - 1];
        if (Date.now() - lastMsg.timestamp < 3000) {
          setFloatingEmote({
            text: lastMsg.text,
            sender: lastMsg.senderName,
            id: lastMsg.timestamp,
          });
          setTimeout(() => setFloatingEmote(null), 2500);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, mode]);

  // Audio & confetti triggers on game outcome
  useEffect(() => {
    const winner = mode.startsWith('online') ? room?.winner : localWinner;
    if (winner) {
      if (winner === 'draw') {
        sounds.playDraw();
      } else if (mode.startsWith('online')) {
        if (winner === mySymbol) {
          sounds.playWin();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
          sounds.playLose();
        }
      } else {
        // Local or AI mode
        if (winner === 'X') {
          sounds.playWin();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
          sounds.playLose();
        }
      }
    }
  }, [room?.winner, localWinner]);

  // Handle cell click
  const handleCellClick = async (index: number) => {
    if (mode.startsWith('online')) {
      if (!room || !mySymbol) return;
      if (room.status !== 'playing') return;
      if (room.board[index] !== null) return;
      if (room.turn !== mySymbol) return;

      sounds.playMove(mySymbol);

      const newBoard = [...room.board];
      newBoard[index] = mySymbol;

      const { winner, line } = checkWinner(newBoard);
      const nextTurn = mySymbol === 'X' ? 'O' : 'X';

      const updateData: Partial<GameRoom> = {
        board: newBoard,
        turn: nextTurn,
        lastMoveTime: Date.now(),
      };

      if (winner) {
        updateData.status = 'finished';
        updateData.winner = winner;
        updateData.winningLine = line;

        // Update room scores
        const newScores = { ...room.scores };
        if (winner === 'X') newScores.player1 += 1;
        else if (winner === 'O') newScores.player2 += 1;
        else newScores.draws += 1;

        updateData.scores = newScores;

        // Update player stats in career profile
        onUpdateStats(winner === mySymbol ? 'X' : winner === 'draw' ? 'draw' : 'O');
      }

      await updateOnlineRoomState(roomId!, updateData);
    } else {
      // Offline Local or AI mode
      if (localWinner || localBoard[index] !== null) return;

      sounds.playMove(localTurn);

      const newBoard = [...localBoard];
      newBoard[index] = localTurn;
      const { winner, line } = checkWinner(newBoard);

      setLocalBoard(newBoard);

      if (winner) {
        setLocalWinner(winner);
        setLocalWinningLine(line);
        setLocalScores((prev) => ({
          ...prev,
          player1: winner === 'X' ? prev.player1 + 1 : prev.player1,
          player2: winner === 'O' ? prev.player2 + 1 : prev.player2,
          draws: winner === 'draw' ? prev.draws + 1 : prev.draws,
        }));
        onUpdateStats(winner);
        return;
      }

      const nextTurn = localTurn === 'X' ? 'O' : 'X';
      setLocalTurn(nextTurn);

      // AI Bot Turn if mode is 'ai'
      if (mode === 'ai' && nextTurn === 'O') {
        setTimeout(() => {
          const aiIndex = getBestAIMove(newBoard, 'O', 'hard');
          if (aiIndex !== -1) {
            sounds.playMove('O');
            const aiBoard = [...newBoard];
            aiBoard[aiIndex] = 'O';
            const aiCheck = checkWinner(aiBoard);

            setLocalBoard(aiBoard);
            if (aiCheck.winner) {
              setLocalWinner(aiCheck.winner);
              setLocalWinningLine(aiCheck.line);
              setLocalScores((prev) => ({
                ...prev,
                player2: aiCheck.winner === 'O' ? prev.player2 + 1 : prev.player2,
                draws: aiCheck.winner === 'draw' ? prev.draws + 1 : prev.draws,
              }));
              onUpdateStats(aiCheck.winner === 'O' ? 'O' : aiCheck.winner === 'draw' ? 'draw' : 'X');
            } else {
              setLocalTurn('X');
            }
          }
        }, 500);
      }
    }
  };

  // Rematch handler
  const handleRematch = async () => {
    sounds.playClick();
    if (mode.startsWith('online')) {
      if (!room || !roomId || !mySymbol) return;

      const isPlayer1 = mySymbol === 'X';
      const newRematch = {
        player1Ready: isPlayer1 ? true : room.rematch.player1Ready,
        player2Ready: !isPlayer1 ? true : room.rematch.player2Ready,
      };

      if (newRematch.player1Ready && newRematch.player2Ready) {
        // Both ready -> Reset board!
        await updateOnlineRoomState(roomId, {
          board: Array(9).fill(null),
          turn: 'X',
          status: 'playing',
          winner: null,
          winningLine: null,
          rematch: { player1Ready: false, player2Ready: false },
          lastMoveTime: Date.now(),
        });
      } else {
        await updateOnlineRoomState(roomId, {
          rematch: newRematch,
        });
      }
    } else {
      // Local or AI mode reset
      setLocalBoard(Array(9).fill(null));
      setLocalTurn('X');
      setLocalWinner(null);
      setLocalWinningLine(null);
    }
  };

  // Send quick chat or emote in online room
  const handleSendChatMessage = async (text: string, type: 'text' | 'emote') => {
    if (!roomId || !mode.startsWith('online')) return;

    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: profile.id,
      senderName: profile.name,
      text,
      type,
      timestamp: Date.now(),
    };

    await sendRoomChatMessage(roomId, newMsg);
  };

  // Copy Room Code / Share Link
  const copyRoomCode = () => {
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine current effective board state
  const board = mode.startsWith('online') ? room?.board || Array(9).fill(null) : localBoard;
  const currentTurn = mode.startsWith('online') ? room?.turn || 'X' : localTurn;
  const winner = mode.startsWith('online') ? room?.winner : localWinner;
  const winningLine = mode.startsWith('online') ? room?.winningLine : localWinningLine;
  const scores = mode.startsWith('online')
    ? room?.scores || { player1: 0, player2: 0, draws: 0 }
    : localScores;

  // Players info
  const player1Info = mode.startsWith('online')
    ? room?.player1 || { name: profile.name, avatar: profile.avatar }
    : { name: profile.name, avatar: profile.avatar };

  const player2Info = mode.startsWith('online')
    ? room?.player2 || { name: 'Waiting...', avatar: '⏳' }
    : mode === 'ai'
    ? { name: 'Smart AI', avatar: '🤖' }
    : { name: 'Player 2', avatar: '🎮' };

  const isMyTurn = mode.startsWith('online') ? currentTurn === mySymbol : true;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 animate-fade-in relative px-2">
      {/* Floating Emote Notification */}
      {floatingEmote && (
        <div className="absolute -top-10 z-40 bg-pink-500/90 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl shadow-pink-500/30 animate-bounce flex items-center gap-2 border border-pink-300">
          <span>{floatingEmote.sender}:</span>
          <span className="text-xl">{floatingEmote.text}</span>
        </div>
      )}

      {/* Header Bar: Back Button & Room Code */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => {
            sounds.playClick();
            onLeaveGame();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave Match</span>
        </button>

        {mode.startsWith('online') && room && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Room Code:</span>
            <span className="font-mono font-black text-cyan-400 text-sm tracking-wider">
              {room.roomCode}
            </span>
            <button
              onClick={copyRoomCode}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Player Scoreboard Header Card */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex items-center justify-between gap-2 relative overflow-hidden">
        {/* Player 1 (X) */}
        <div
          className={`flex items-center gap-2 transition-all p-2 rounded-2xl ${
            currentTurn === 'X' && !winner
              ? 'bg-cyan-500/10 border border-cyan-500/40 ring-2 ring-cyan-500/20'
              : 'opacity-80'
          }`}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-2xl">
              {player1Info.avatar}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
              X
            </span>
          </div>
          <div className="text-left">
            <div className="font-bold text-xs sm:text-sm text-slate-100 max-w-[90px] sm:max-w-[120px] truncate">
              {player1Info.name}
            </div>
            <div className="text-cyan-400 font-extrabold text-lg leading-tight">
              {scores.player1} <span className="text-[10px] text-slate-500 font-normal">Wins</span>
            </div>
          </div>
        </div>

        {/* VS / Score Divider */}
        <div className="text-center px-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-0.5">VS</div>
          <div className="text-xs font-bold text-slate-400 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800">
            Draws: {scores.draws}
          </div>
        </div>

        {/* Player 2 (O) */}
        <div
          className={`flex items-center gap-2 transition-all p-2 rounded-2xl ${
            currentTurn === 'O' && !winner
              ? 'bg-pink-500/10 border border-pink-500/40 ring-2 ring-pink-500/20'
              : 'opacity-80'
          }`}
        >
          <div className="text-right">
            <div className="font-bold text-xs sm:text-sm text-slate-100 max-w-[90px] sm:max-w-[120px] truncate">
              {player2Info.name}
            </div>
            <div className="text-pink-400 font-extrabold text-lg leading-tight">
              {scores.player2} <span className="text-[10px] text-slate-500 font-normal">Wins</span>
            </div>
          </div>
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border-2 border-pink-400 flex items-center justify-center text-2xl">
              {player2Info.avatar}
            </div>
            <span className="absolute -bottom-1 -left-1 bg-pink-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
              O
            </span>
          </div>
        </div>
      </div>

      {/* Turn Status Banner */}
      <div className="w-full text-center">
        {mode.startsWith('online') && room?.status === 'waiting' ? (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 animate-pulse">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Waiting for Player 2 to join... Share room code <strong className="font-mono text-white underline">{room.roomCode}</strong></span>
          </div>
        ) : winner ? (
          <div className="bg-gradient-to-r from-cyan-500/20 via-pink-500/20 to-amber-500/20 border border-slate-700 py-3 px-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg">
            <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
            {winner === 'draw' ? (
              <span className="text-amber-300">Game Draw! Excellent Match!</span>
            ) : mode.startsWith('online') ? (
              winner === mySymbol ? (
                <span className="text-emerald-400">🎉 YOU WON THE MATCH! 🎉</span>
              ) : (
                <span className="text-rose-400">Opponent Won this round!</span>
              )
            ) : (
              <span className="text-emerald-400">{winner === 'X' ? player1Info.name : player2Info.name} Wins!</span>
            )}
          </div>
        ) : (
          <div className={`py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isMyTurn
              ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-md shadow-cyan-500/10'
              : 'bg-slate-900 border border-slate-800 text-slate-400'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'}`} />
            {mode.startsWith('online') ? (
              isMyTurn ? "YOUR TURN! Tap any box." : `Waiting for ${currentTurn === 'X' ? player1Info.name : player2Info.name}'s move...`
            ) : (
              `${currentTurn === 'X' ? player1Info.name : player2Info.name}'s Turn (${currentTurn})`
            )}
          </div>
        )}
      </div>

      {/* Interactive 3x3 Grid Board */}
      <div className="w-full aspect-square max-w-[360px] sm:max-w-[400px] bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-3 sm:p-4 grid grid-cols-3 gap-3 shadow-2xl relative">
        {board.map((cell, idx) => {
          const isWinningCell = winningLine?.includes(idx);

          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={!!winner || cell !== null || (mode.startsWith('online') && (!isMyTurn || room?.status !== 'playing'))}
              className={`rounded-2xl transition-all duration-200 flex items-center justify-center text-4xl sm:text-5xl font-black select-none relative cursor-pointer ${
                isWinningCell
                  ? 'bg-amber-400 text-slate-950 scale-105 shadow-xl shadow-amber-400/40 ring-4 ring-amber-300 animate-bounce z-10'
                  : cell === 'X'
                  ? 'bg-slate-950 border-2 border-cyan-500/50 text-cyan-400 shadow-lg shadow-cyan-500/10'
                  : cell === 'O'
                  ? 'bg-slate-950 border-2 border-pink-500/50 text-pink-400 shadow-lg shadow-pink-500/10'
                  : 'bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 active:scale-95'
              }`}
            >
              {cell === 'X' && (
                <span className="animate-scale-in drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
                  X
                </span>
              )}
              {cell === 'O' && (
                <span className="animate-scale-in drop-shadow-[0_0_12px_rgba(244,114,182,0.6)]">
                  O
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rematch Controls & Action Bar */}
      <div className="w-full flex flex-col gap-3">
        {winner && (
          <button
            onClick={handleRematch}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <RotateCcw className="w-5 h-5" />
            {mode.startsWith('online')
              ? room?.rematch.player1Ready || room?.rematch.player2Ready
                ? 'Opponent Wants Rematch! Tap to Accept'
                : 'Request Rematch'
              : 'Play Next Round'}
          </button>
        )}

        {/* Live Quick Chat / Reaction Bar for Online Mode */}
        {mode.startsWith('online') && (
          <div className="pt-2 border-t border-slate-800/80">
            <QuickChat
              onSendMessage={handleSendChatMessage}
              recentMessages={room?.messages}
            />
          </div>
        )}
      </div>
    </div>
  );
};
