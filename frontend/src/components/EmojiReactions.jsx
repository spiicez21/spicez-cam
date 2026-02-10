'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Smile } from 'lucide-react';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];

let reactionIdCounter = 0;

export default function EmojiReactions({ socket, roomId }) {
  const [showPicker, setShowPicker] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const pickerRef = useRef(null);

  // Spawn a single floating emoji instance
  const spawnOne = useCallback((emoji, delay = 0) => {
    const spawn = () => {
      const id = ++reactionIdCounter;
      const left = 55 + Math.random() * 40; // 55-95% from left
      const drift = (Math.random() - 0.5) * 50; // -25 to +25px horizontal drift
      const duration = 2.2 + Math.random() * 0.8; // 2.2-3s varied duration
      const scale = 0.85 + Math.random() * 0.4; // 0.85-1.25 varied size

      setFloatingEmojis((prev) => [...prev, { id, emoji, left, drift, duration, scale }]);

      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, duration * 1000 + 100);
    };
    if (delay > 0) setTimeout(spawn, delay);
    else spawn();
  }, []);

  // Add multiple floating emojis in a burst
  const addFloatingEmoji = useCallback((emoji) => {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 emojis per reaction
    for (let i = 0; i < count; i++) {
      spawnOne(emoji, i * 120); // stagger by 120ms each
    }
  }, [spawnOne]);

  // Listen for remote emoji reactions
  useEffect(() => {
    if (!socket) return;
    const handleReaction = ({ emoji }) => {
      addFloatingEmoji(emoji);
    };
    socket.on('emoji-reaction', handleReaction);
    return () => { socket.off('emoji-reaction', handleReaction); };
  }, [socket, addFloatingEmoji]);

  // Close picker on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSendEmoji = (emoji) => {
    if (!socket) return;
    // Show locally
    addFloatingEmoji(emoji);
    // Broadcast to room
    socket.emit('emoji-reaction', { roomId, emoji });
    setShowPicker(false);
  };

  return (
    <>
      {/* Floating emojis overlay — positioned at screen level */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {floatingEmojis.map((item) => (
          <span
            key={item.id}
            className="absolute bottom-16 animate-emoji-float select-none"
            style={{
              left: `${item.left}%`,
              marginLeft: `${item.drift}px`,
              fontSize: `${item.scale * 2}rem`,
              animationDuration: `${item.duration}s`,
            }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      {/* Emoji picker trigger + picker */}
      <div className="relative" ref={pickerRef}>
        {/* Picker popover */}
        {showPicker && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 rounded-2xl frost-glass-panel shadow-2xl z-50 overflow-hidden animate-[fade-in-up_0.15s_ease-out]">
            <div className="flex items-center gap-1 px-2 py-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl hover:bg-white/[0.1] active:scale-90 transition-all duration-150"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            showPicker ? 'bg-white/[0.16]' : 'bg-white/[0.08] hover:bg-white/[0.14]'
          }`}
          title="React"
        >
          <Smile size={18} className="text-white/80" />
        </button>
      </div>
    </>
  );
}
