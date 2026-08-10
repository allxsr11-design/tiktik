import React, { useState } from 'react';
import { MessageSquare, Send, Smile } from 'lucide-react';
import { ChatMessage } from '../types';
import { sounds } from '../utils/sound';

interface QuickChatProps {
  onSendMessage: (text: string, type: 'text' | 'emote') => void;
  recentMessages?: ChatMessage[];
}

const EMOTE_OPTIONS = ['👋', '🔥', '😂', '👏', '😱', '🧠', '👑', '🎉', '⚡', '😭'];
const PRESET_MESSAGES = [
  'Good Game! 🎮',
  'Nice Move! 🔥',
  'Your Turn! ⏳',
  'So Close! 😅',
  'Rematch? 🔁',
  'Well Played! 👏'
];

export const QuickChat: React.FC<QuickChatProps> = ({
  onSendMessage,
  recentMessages = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sendEmote = (emote: string) => {
    sounds.playClick();
    onSendMessage(emote, 'emote');
  };

  const sendPreset = (text: string) => {
    sounds.playClick();
    onSendMessage(text, 'text');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Floating Emote / Chat Toggle Button */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
        {EMOTE_OPTIONS.slice(0, 5).map((emote) => (
          <button
            key={emote}
            onClick={() => sendEmote(emote)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/60 text-xl transition-all cursor-pointer hover:scale-125 shadow-sm active:scale-95 flex-shrink-0"
            title={`Send ${emote}`}
          >
            {emote}
          </button>
        ))}

        <button
          onClick={() => {
            sounds.playClick();
            setIsOpen(!isOpen);
          }}
          className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
            isOpen
              ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-400'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>Chat</span>
        </button>
      </div>

      {/* Expanded Quick Chat Popup Drawer */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 z-30 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl animate-fade-in text-white space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300">Quick Emotes & Messages</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Close
            </button>
          </div>

          {/* All Emotes Grid */}
          <div className="grid grid-cols-5 gap-2">
            {EMOTE_OPTIONS.map((emote) => (
              <button
                key={emote}
                onClick={() => sendEmote(emote)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-2xl text-center cursor-pointer transition-transform hover:scale-125 active:scale-90"
              >
                {emote}
              </button>
            ))}
          </div>

          {/* Preset Text Messages */}
          <div className="space-y-1.5 pt-1">
            {PRESET_MESSAGES.map((msg) => (
              <button
                key={msg}
                onClick={() => sendPreset(msg)}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-slate-800 text-xs font-medium text-slate-200 hover:text-cyan-300 transition-all cursor-pointer"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
